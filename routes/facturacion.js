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
            const docData = (result.data && result.data.data) ? result.data.data : {};
            const qrObj = result.data?.qr || {};
            const qrDian = qrObj.qrDian || '';
            let cufe = docData.cufe || docData.XmlDocumentKey || docData.cude || null;
            if (!cufe && qrDian && qrDian.includes('documentkey=')) {
                cufe = qrDian.split('documentkey=')[1].split('&')[0];
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

