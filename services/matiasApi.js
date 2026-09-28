const axios = require('axios');
const User = require('../models/User');

const getBaseUrl = (environment) => {
    return environment === 'production'
        ? 'https://api.matias-api.com/api/ubl2.1'
        : 'https://sandbox-api.matias-api.com/api/ubl2.1';
};

/**
 * Format the invoice JSON structure for MATIAS API
 */
const formatInvoicePayload = (order, userConfig) => {
    // 1. Build Customer Data
    const customer = {
        identification_number: order.clienteCcNit || "222222222222",
        name: order.clienteNombre || "Consumidor Final",
        type_document_identification_id: order.clienteCcNit ? 3 : 3, // 3 = CC (Simplified)
        type_organization_id: 2, // Persona natural
        type_regime_id: 2, // Régimen simplificado / no responsable
        municipality_id: userConfig.municipioId || 1006 // Default Bogotá
    };

    // 2. Build Invoice Lines and Taxes
    let line_extension_amount = 0;
    let tax_exclusive_amount = 0;
    let tax_inclusive_amount = 0;

    const invoice_lines = order.items.map(item => {
        const qty = item.cantidad;
        const price = item.precio;
        const line_total = qty * price;
        
        let line = {
            unit_measure_id: 70, // 70 = Unidad
            invoiced_quantity: qty.toString(),
            line_extension_amount: line_total.toFixed(2),
            free_of_charge_indicator: false,
            description: item.nombreProducto,
            code: item.producto ? item.producto.toString().slice(-6) : "GEN01",
            type_item_identification_id: 4, // Estándar de la empresa
            price_amount: price.toFixed(2),
            base_quantity: "1"
        };

        let taxTotalAmount = 0;
        let taxableAmount = line_total;

        // Verify if product has tax information
        // In a real application, product tax details should ideally be populated in the order, 
        // but since we are modifying an existing app, we'll try to use the order item's logic if available,
        // or default to INC 8% if configured, else 0.
        // For this implementation, we will use the populated product data if available.
        if (item.producto && item.producto.impuesto && item.producto.impuesto.tipo !== 'NINGUNO') {
            const porcentaje = item.producto.impuesto.porcentaje || 0;
            const taxAmount = (line_total * porcentaje) / 100;
            taxTotalAmount = taxAmount;
            
            // tax_id mapping: MATIAS API requires specific IDs.
            // 1: IVA, 2: IC (Consumo), 3: ICA, etc. based on MATIAS docs. 
            // We use 1 for IVA and 2 for INC (common for restaurants).
            const tax_id = item.producto.impuesto.tipo === 'IVA' ? 1 : 2; 

            line.tax_totals = [{
                tax_id: tax_id,
                tax_amount: taxAmount.toFixed(2),
                taxable_amount: taxableAmount.toFixed(2),
                percent: porcentaje.toFixed(2)
            }];
        }

        line_extension_amount += taxableAmount;
        tax_exclusive_amount += taxableAmount;
        tax_inclusive_amount += (taxableAmount + taxTotalAmount);

        return line;
    });

    // 3. Build legal monetary totals
    const legal_monetary_totals = {
        line_extension_amount: line_extension_amount.toFixed(2),
        tax_exclusive_amount: tax_exclusive_amount.toFixed(2),
        tax_inclusive_amount: tax_inclusive_amount.toFixed(2),
        payable_amount: tax_inclusive_amount.toFixed(2) // Total a pagar
    };

    // 4. Build Payment Form
    let payment_method_id = 10; // Efectivo default
    if (order.metodoPago === 'transferencia') payment_method_id = 47; // Transferencia
    else if (order.metodoPago === 'mixto') payment_method_id = 42; // Consignación/Otro

    const payment_form = {
        payment_form_id: 1, // 1 = Contado
        payment_method_id: payment_method_id,
        payment_due_date: new Date().toISOString().split('T')[0]
    };

    const payload = {
        number: userConfig.currentNumber + 1,
        type_document_id: 1, // Factura de venta
        resolution_number: userConfig.resolutionNumber,
        prefix: userConfig.prefix,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toISOString().split('T')[1].substring(0, 8),
        customer: customer,
        legal_monetary_totals: legal_monetary_totals,
        invoice_lines: invoice_lines,
        payment_form: payment_form
    };

    return payload;
};

/**
 * Emit an electronic invoice
 */
const emitirFactura = async (order, userId) => {
    // We use atomic update to increment the current number to avoid duplicates
    const user = await User.findOneAndUpdate(
        { _id: userId, 'matiasConfig.activo': true },
        { $inc: { 'matiasConfig.currentNumber': 1 } },
        { new: true }
    );

    if (!user || !user.matiasConfig || !user.matiasConfig.activo) {
        throw new Error('Configuración de MATIAS API no encontrada o inactiva para este restaurante');
    }

    const config = user.matiasConfig;
    const token = user.getMatiasToken();

    if (!token) {
        throw new Error('Token de MATIAS API no configurado');
    }

    if (config.currentNumber > config.to) {
        throw new Error(`El consecutivo actual (${config.currentNumber}) supera el límite autorizado (${config.to})`);
    }

    const payload = formatInvoicePayload(order, config);
    const baseUrl = getBaseUrl(config.environment);

    try {
        const response = await axios.post(`${baseUrl}/invoice`, payload, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        return {
            success: true,
            data: response.data,
            numero: `${config.prefix}${payload.number}`
        };
    } catch (error) {
        // Rollback the increment if emission failed
        await User.updateOne(
            { _id: userId },
            { $inc: { 'matiasConfig.currentNumber': -1 } }
        );

        let errorMessage = 'Error al comunicar con MATIAS API';
        if (error.response && error.response.data) {
            errorMessage = error.response.data.message || JSON.stringify(error.response.data);
        }
        
        throw new Error(errorMessage);
    }
};

/**
 * Emit a POS document (Documento Equivalente)
 */
const emitirPos = async (order, userId) => {
     const user = await User.findOneAndUpdate(
        { _id: userId, 'matiasConfig.activo': true },
        { $inc: { 'matiasConfig.currentNumber': 1 } },
        { new: true }
    );

    if (!user || !user.matiasConfig || !user.matiasConfig.activo) {
        throw new Error('Configuración de MATIAS API no encontrada o inactiva para este restaurante');
    }

    const config = user.matiasConfig;
    const token = user.getMatiasToken();

    if (!token) {
        throw new Error('Token de MATIAS API no configurado');
    }

    // POS also uses the same number sequence for simplicity in this implementation, 
    // or typically has a separate resolution. Assuming same config structure for POS here.
    if (config.currentNumber > config.to) {
        throw new Error(`El consecutivo actual (${config.currentNumber}) supera el límite autorizado (${config.to})`);
    }

    const payload = formatInvoicePayload(order, config);
    // Adjust type_document_id for POS if needed, based on MATIAS docs. Let's assume standard payload works but to /pos
    const baseUrl = getBaseUrl(config.environment);

    try {
        const response = await axios.post(`${baseUrl}/pos`, payload, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        return {
            success: true,
            data: response.data,
            numero: `${config.prefix}${payload.number}`
        };
    } catch (error) {
        // Rollback the increment if emission failed
        await User.updateOne(
            { _id: userId },
            { $inc: { 'matiasConfig.currentNumber': -1 } }
        );

        let errorMessage = 'Error al comunicar con MATIAS API';
        if (error.response && error.response.data) {
            errorMessage = error.response.data.message || JSON.stringify(error.response.data);
        }
        
        throw new Error(errorMessage);
    }
};

module.exports = {
    emitirFactura,
    emitirPos
};
