const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Order = require('../models/order');
const User = require('../models/User');
const { emitirFactura, emitirPos } = require('../services/matiasApi');
const axios = require('axios'); // For downloading files

// 1. Emitir factura (Electrónica o POS)
router.post('/emitir', protect, async (req, res) => {
    try {
        const { orderId, tipo } = req.body; // tipo: 'electronica' o 'pos'
        
        const order = await Order.findOne({ _id: orderId, userId: req.user._id }).populate('items.producto');
        if (!order) {
            return res.status(404).json({ success: false, message: 'Pedido no encontrado' });
        }

        let result;
        if (tipo === 'electronica') {
            result = await emitirFactura(order, req.user._id);
        } else if (tipo === 'pos') {
            result = await emitirPos(order, req.user._id);
        } else {
            return res.status(400).json({ success: false, message: 'Tipo de documento no válido' });
        }

        if (result.success) {
            // Guardar info de factura en el pedido
            order.facturaElectronica = {
                uuid: result.data.data.uuid || result.data.data.id, 
                cufe: result.data.data.cufe || result.data.data.cude,
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
