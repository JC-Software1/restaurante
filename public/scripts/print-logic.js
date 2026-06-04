        async function imprimirFacturaPOS() {
            if (!pedidoParaImprimir) {
                // Si no hay datos cargados, intentar cargarlos ahora
                if (typeof currentOrderIdForPayment !== 'undefined' && currentOrderIdForPayment) {
                    if (typeof obtenerDatosPedidoParaImprimir === 'function') {
                        await obtenerDatosPedidoParaImprimir(currentOrderIdForPayment);
                    }
                }
                
                if (!pedidoParaImprimir) {
                    Swal.fire('Error', 'No hay datos del pedido para imprimir', 'error');
                    return;
                }
            }

            const btn = document.querySelector('.btn-primary[onclick*="imprimirFacturaPOS"]');
            if(btn) btn.disabled = true;

            // Preparar los datos visuales para el fallback
            crearElementoImpresion();

            try {
                const hasBridge = localStorage.getItem('autoPrintComanda') === 'true';

                if (hasBridge) {
                    const result = await Swal.fire({
                        title: 'Imprimir Factura',
                        text: 'Tienes el Print Bridge activado. ¿Cómo deseas imprimir?',
                        icon: 'question',
                        showCancelButton: true,
                        showDenyButton: true,
                        confirmButtonText: '🔌 Vía Print Bridge',
                        denyButtonText: '🪟 Vía Windows',
                        cancelButtonText: 'Cancelar'
                    });

                    if (result.isConfirmed) {
                        if (typeof mostrarEstadoImpresion === 'function') {
                            mostrarEstadoImpresion('imprimiendo');
                        }
                        
                        const currUser = typeof currentUser !== 'undefined' ? currentUser : {};
                        const datosFactura = {
                            _id: pedidoParaImprimir._id,
                            mesa: pedidoParaImprimir.mesa,
                            items: pedidoParaImprimir.items,
                            total: pedidoParaImprimir.total,
                            restauranteNombre: currUser.nombreRestaurante || "RESTAURANTE"
                        };

                        try {
                            const response = await fetch('http://127.0.0.1:3001/print-factura', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(datosFactura)
                            });

                            const data = await response.json();

                            if (data.success) {
                                if (typeof mostrarEstadoImpresion === 'function') {
                                    mostrarEstadoImpresion('exito');
                                }
                                console.log('✅ Impresión enviada al Bridge exitosamente');
                            } else {
                                console.warn('❌ Error del Bridge, usando fallback a Windows:', data.message);
                                Swal.fire({
                                    title: 'Bridge sin responder',
                                    text: 'Hubo un error con el Bridge. Imprimiendo vía normal...',
                                    icon: 'warning',
                                    timer: 2500,
                                    showConfirmButton: false
                                });
                                setTimeout(() => { window.print(); }, 500);
                            }
                        } catch (err) {
                            console.warn('❌ Error de conexión al Bridge, usando fallback a Windows:', err);
                            Swal.fire({
                                title: 'Bridge no detectado',
                                text: 'No se pudo conectar al Bridge. Imprimiendo vía normal...',
                                icon: 'warning',
                                timer: 2500,
                                showConfirmButton: false
                            });
                            setTimeout(() => { window.print(); }, 500);
                        }
                    } else if (result.isDenied) {
                        window.print();
                    }
                } else {
                    window.print();
                }
            } catch (error) {
                console.error('Error:', error);
                if (typeof mostrarEstadoImpresion === 'function') {
                    mostrarEstadoImpresion('error');
                }
            } finally {
                if(btn) btn.disabled = false;
            }
        }

        function crearElementoImpresion() {
            removerElementoImpresion();

            const fecha = new Date(pedidoParaImprimir.createdAt);
            const fechaStr = fecha.toLocaleDateString('es-CO', {
                day: '2-digit', month: '2-digit', year: 'numeric'
            });
            const horaStr = fecha.toLocaleTimeString('es-CO', {
                hour: '2-digit', minute: '2-digit'
            });

            const metodoPago = typeof metodoPagoSeleccionado !== 'undefined' ? metodoPagoSeleccionado : 'efectivo';
            const metodoPagoTexto = metodoPago === 'transferencia' ? 'TRANSFERENCIA' : 'EFECTIVO';
            
            const currUser = typeof currentUser !== 'undefined' ? currentUser : {};
            const nombreRestaurante = currUser.nombreRestaurante || 'RESTAURANTE';
            const nitRestaurante = currUser.nitRestaurante ? `NIT: ${currUser.nitRestaurante}` : '';

            const cliNom = typeof clienteNombreSeleccionado !== 'undefined' ? clienteNombreSeleccionado : '';
            const cliCcNit = typeof clienteCcNitSeleccionado !== 'undefined' ? clienteCcNitSeleccionado : '';

            const clienteHTML = pedidoParaImprimir.clienteNombre || cliNom ? `
                <tr><td style="font-weight:bold;padding:2px 0;">Cliente:</td><td style="text-align:right;padding:2px 0;">${(pedidoParaImprimir.clienteNombre || cliNom).toUpperCase()}</td></tr>
                <tr><td style="font-weight:bold;padding:2px 0;">CC/NIT:</td><td style="text-align:right;padding:2px 0;">${pedidoParaImprimir.clienteCcNit || cliCcNit || '---'}</td></tr>
            ` : '';

            const productosHTML = pedidoParaImprimir.items.map(item => {
                const nombre = item.productoInfo ? item.productoInfo.nombre : (item.nombreProducto || 'Producto');
                const cantidad = item.cantidad;
                const precio = item.precio;
                const subtotal = cantidad * precio;

                return `
            <tr style="border-bottom:1px dashed #ccc;">
                <td colspan="2" style="font-weight:bold;padding:6px 0 2px 0;font-size:12px;">${nombre}</td>
            </tr>
            <tr style="border-bottom:1px dashed #ddd;">
                <td style="padding:0 0 6px 0;font-size:11px;">Cant: ${cantidad} x $${precio.toLocaleString('es-CO')}</td>
                <td style="text-align:right;padding:0 0 6px 0;font-weight:bold;font-size:11px;">$${subtotal.toLocaleString('es-CO')}</td>
            </tr>
        `;
            }).join('');

            const printContainer = document.createElement('div');
            printContainer.id = 'print-container';
            printContainer.innerHTML = `
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-family:'Courier New',monospace;font-size:12px;">
            <tr>
                <td colspan="2" style="text-align:center;padding-bottom:10px;border-bottom:2px solid #000;">
                    <div style="font-size:18px;font-weight:bold;margin-bottom:3px;">${nombreRestaurante}</div>
                    ${nitRestaurante ? `<div style="font-size:12px;font-weight:bold;margin-bottom:3px;">${nitRestaurante}</div>` : ''}
                    <div style="font-size:10px;color:#000;font-weight:bold;">FACTURA DE VENTA</div>
                </td>
            </tr>
        </table>
        
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-family:'Courier New',monospace;font-size:11px;margin-top:10px;padding-bottom:10px;border-bottom:1px dashed #000;">
            <tr><td style="font-weight:bold;padding:2px 0;">Fecha:</td><td style="text-align:right;padding:2px 0;">${fechaStr}</td></tr>
            <tr><td style="font-weight:bold;padding:2px 0;">Hora:</td><td style="text-align:right;padding:2px 0;">${horaStr}</td></tr>
            ${clienteHTML}
            <tr><td style="font-weight:bold;padding:2px 0;">Mesa:</td><td style="text-align:right;padding:2px 0;">${pedidoParaImprimir.mesa}</td></tr>
            <tr><td style="font-weight:bold;padding:2px 0;">Pedido:</td><td style="text-align:right;padding:2px 0;">#${pedidoParaImprimir._id.slice(-6).toUpperCase()}</td></tr>
        </table>
        
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-family:'Courier New',monospace;margin:8px 0;">
            <tr>
                    <td style="text-align:center;font-size:12px;font-weight:bold;padding:6px 0;background:#000;color:#fff;">${metodoPagoTexto}</td>
            </tr>
        </table>
        
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-family:'Courier New',monospace;font-size:11px;border-top:1px solid #000;margin-bottom:10px;">
            ${productosHTML}
        </table>
        
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-family:'Courier New',monospace;border-top:2px solid #000;margin-top:5px;">
            <tr>
                <td style="font-size:16px;font-weight:bold;padding:10px 0;">TOTAL:</td>
                <td style="text-align:right;font-size:16px;font-weight:bold;padding:10px 0;">$${pedidoParaImprimir.total.toLocaleString('es-CO')}</td>
            </tr>
        </table>
        
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-family:'Courier New',monospace;border-top:1px dashed #000;margin-top:10px;">
            <tr><td style="text-align:center;padding:10px 0;font-size:11px;"><strong>¡Gracias por su compra!</strong></td></tr>
            <tr><td style="text-align:center;padding:0 0 10px 0;font-size:11px;">Vuelva pronto</td></tr>
        </table>
    `;

            document.body.appendChild(printContainer);
        }

        function removerElementoImpresion() {
            const printContainers = document.querySelectorAll('#print-container');
            printContainers.forEach(container => container.remove());
        }
        
        window.addEventListener('afterprint', () => {
            removerElementoImpresion();
        });
