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
        const { orderId, tipo } = req.body; // tipo: 'electronica' o 'pos'
        
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
            order.facturaElectronica = {
                uuid: docData.uuid || docData.id || null, 
                cufe: docData.cufe || docData.XmlDocumentKey || docData.cude || null,
                numero: result.numero,
                estado: 'PROCESADA',
                fechaEmision: new Date()
            };
            await order.save();

            res.json({
                success: true,
                message: 'Documento emitido con éxito',
                data: result.data,
                numero: result.numero
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

module.exports = router;
