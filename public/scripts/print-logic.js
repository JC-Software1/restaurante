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
                <div class="print-info-row">
                    <span class="print-info-label">Cliente:</span>
                    <span>${(pedidoParaImprimir.clienteNombre || cliNom).toUpperCase()} 222222222222</span>
                </div>
                <div class="print-info-row">
                    <span class="print-info-label">CC/NIT:</span>
                    <span>${pedidoParaImprimir.clienteCcNit || cliCcNit || '---'}</span>
                </div>
            ` : '';

            const productosHTML = pedidoParaImprimir.items.map(item => {
                const nombre = item.productoInfo ? item.productoInfo.nombre : (item.nombreProducto || 'Producto');
                const cantidad = item.cantidad;
                const precio = item.precio;
                const subtotal = cantidad * precio;

                return `
            <tr>
                <td>${nombre}</td>
                <td style="text-align: center;">${cantidad}</td>
                <td style="text-align: right;">$${precio.toLocaleString('es-CO')}</td>
                <td style="text-align: right; font-weight: bold;">$${subtotal.toLocaleString('es-CO')}</td>
            </tr>
        `;
            }).join('');

            const printContainer = document.createElement('div');
            printContainer.id = 'print-container';
            printContainer.innerHTML = `
        <div class="print-header">
            <h1>${nombreRestaurante}</h1>
            ${nitRestaurante ? `<div style="font-size: 12px; font-weight: bold; margin-bottom: 5px;">${nitRestaurante}</div>` : ''}
            <div class="print-subtitle">FACTURA DE VENTA</div>
        </div>
        
        <div class="print-info-section">
            <div class="print-info-row">
                <span class="print-info-label">Fecha:</span>
                <span>${fechaStr}</span>
            </div>
            <div class="print-info-row">
                <span class="print-info-label">Hora:</span>
                <span>${horaStr}</span>
            </div>
            ${clienteHTML}
            <div class="print-info-row">
                <span class="print-info-label">Mesa:</span>
                <span>${pedidoParaImprimir.mesa}</span>
            </div>
            <div class="print-info-row">
                <span class="print-info-label">Pedido:</span>
                <span>#${pedidoParaImprimir._id.slice(-6).toUpperCase()}</span>
            </div>
        </div>
        
        <div class="print-metodo-pago">
            💳 ${metodoPagoTexto}
        </div>
        
        <table class="print-table">
            <thead>
                <tr>
                    <th>Producto</th>
                    <th style="text-align: center;">Cant.</th>
                    <th style="text-align: right;">Precio</th>
                    <th style="text-align: right;">Total</th>
                </tr>
            </thead>
            <tbody>
                ${productosHTML}
            </tbody>
        </table>
        
        <div class="print-total-section">
            <div class="print-total-row">
                <span>TOTAL:</span>
                <span>$${pedidoParaImprimir.total.toLocaleString('es-CO')}</span>
            </div>
        </div>
        
        <div class="print-footer">
            <p><strong>¡Gracias por su compra!</strong></p>
            <p>Vuelva pronto</p>
        </div>
    `;

            document.body.appendChild(printContainer);
        }

        function removerElementoImpresion() {
            const printContainer = document.getElementById('print-container');
            if (printContainer) {
                printContainer.remove();
            }
        }
        
        window.addEventListener('afterprint', () => {
            removerElementoImpresion();
        });
