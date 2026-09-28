const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Order = require('../models/order');
const Product = require('../models/Product');
const User = require('../models/User');
const { emitirFactura, emitirPos } = require('../services/matiasApi');
const axios = require('axios'); // For downloading files

// 1. Emitir factura (Electrónica o POS)
router.post('/emitir', protect, async (req, res) => {
    try {
        const { orderId, tipo, clienteNombre, clienteCcNit, clienteEmail } = req.body; // tipo: 'electronica' o 'pos'
        
        const query = { _id: orderId };
        if (req.userIdsRestaurante && req.userIdsRestaurante.length > 0) {
            query.userId = { $in: req.userIdsRestaurante };
        } else {
            query.userId = req.user._id;
        }

        const order = await Order.findOne(query).populate('items.producto');
        if (!order) {
            return res.status(404).json({ success: false, message: 'Pedido no encontrado' });
        }

        // ── GUARDIA DE IDEMPOTENCIA ──────────────────────────────────────
        // Si la factura ya fue procesada, devolver la data guardada sin
        // volver a llamar a la API (evita error "ya se encuentra validado")
        if (order.facturaElectronica && order.facturaElectronica.estado === 'PROCESADA') {
            const fe = order.facturaElectronica;
            console.log(`ℹ️  Factura ${fe.numero} ya estaba procesada para orden ${orderId}, retornando datos guardados.`);
            return res.json({
                success: true,
                alreadyEmitted: true,
                message: `La factura ${fe.numero} ya fue emitida y validada anteriormente.`,
                numero: fe.numero,
                cufe: fe.cufe,
                dianUrl: fe.dianUrl,
                qrUrl: fe.qrUrl,
                clienteEmail: order.clienteEmail || null
            });
        }
        // ────────────────────────────────────────────────────────────────

        // Actualizar datos del cliente si se enviaron
        if (clienteNombre) order.clienteNombre = clienteNombre.trim();
        if (clienteCcNit) order.clienteCcNit = clienteCcNit.trim();
        if (clienteEmail) order.clienteEmail = clienteEmail.trim();
        await order.save();

        const adminId = req.mainAdminId || req.user._id;
        let result;
        if (tipo === 'electronica') {
            result = await emitirFactura(order, adminId);
        } else if (tipo === 'pos') {
            result = await emitirPos(order, adminId);
        } else {
            return res.status(400).json({ success: false, message: 'Tipo de documento no válido' });
        }


        if (result.success) {
            // Guardar info de factura en el pedido
            const resData = result.data || {};
            const docData = resData.document || resData.data || resData || {};
            const qrObj = resData.qr || docData.qr || {};
            let qrDian = qrObj.qrDian || docData.qrDian || '';
            let cufe = docData.cufe || docData.XmlDocumentKey || docData.document_key || docData.cude || null;
            if (!cufe && qrDian && qrDian.includes('documentkey=')) {
                cufe = qrDian.split('documentkey=')[1].split('&')[0];
            }
            if (!qrDian && cufe) {
                qrDian = `https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=${cufe}`;
            }

            order.facturaElectronica = {
                uuid: docData.uuid || docData.id || null, 
                cufe: cufe,
                numero: result.numero,
                estado: 'PROCESADA',
                fechaEmision: new Date(),
                qrUrl: qrObj.url || null,
                dianUrl: qrDian || null
            };
            await order.save();

            res.json({
                success: true,
                message: 'Documento emitido con éxito',
                numero: result.numero,
                cufe: cufe,
                dianUrl: qrDian || null,
                qrUrl: qrObj.url || null,
                clienteEmail: order.clienteEmail || null,
                data: result.data
            });
        }
    } catch (error) {
        console.error('Error al emitir factura:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error al emitir la factura'
        });
    }
});

// 2. Historial de facturas emitidas
router.get('/historial', protect, async (req, res) => {
    try {
        const query = { 'facturaElectronica.estado': { $ne: null } };
        if (req.userIdsRestaurante && req.userIdsRestaurante.length > 0) {
            query.userId = { $in: req.userIdsRestaurante };
        } else {
            query.userId = req.user._id;
        }

        const facturas = await Order.find(query)
            .select('mesa total clienteNombre clienteCcNit clienteEmail facturaElectronica createdAt metodoPago')
            .sort({ 'facturaElectronica.fechaEmision': -1 })
            .limit(200);

        res.json({ success: true, facturas });
    } catch (error) {
        console.error('Error al obtener historial de facturas:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;

