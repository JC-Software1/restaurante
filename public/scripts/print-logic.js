        async function imprimirFacturaPOS() {
            if (!pedidoParaImprimir) {
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

            try {
                const hasBridge = localStorage.getItem('autoPrintComanda') === 'true';
                const isAndroid = /android/i.test(navigator.userAgent);

                if (hasBridge && !isAndroid) {
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
                                setTimeout(() => { imprimirVentanaNueva(); }, 500);
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
                            setTimeout(() => { imprimirVentanaNueva(); }, 500);
                        }
                    } else if (result.isDenied) {
                        imprimirVentanaNueva();
                    }
                } else if (hasBridge && isAndroid) {
                    // En Android, el bridge corre en bridge-android.html (PWA separada)
                    const result = await Swal.fire({
                        title: 'Imprimir Factura',
                        text: '¿Cómo deseas imprimir? (En Android, usa el Bridge Android para impresión automática)',
                        icon: 'question',
                        showCancelButton: true,
                        showDenyButton: true,
                        confirmButtonText: '🤖 Abrir Bridge Android',
                        denyButtonText: '🖨️ Imprimir ahora',
                        cancelButtonText: 'Cancelar'
                    });

                    if (result.isConfirmed) {
                        const bridgeWindow = window.open('bridge-android.html', '_blank');
                        if (bridgeWindow) {
                            bridgeWindow.addEventListener('load', () => {
                                setTimeout(() => {
                                    bridgeWindow.postMessage({
                                        type: 'print-comanda',
                                        order: pedidoParaImprimir
                                    }, '*');
                                }, 500);
                            });
                        }
                        Swal.fire({
                            title: 'Bridge Android abierto',
                            text: 'Enviando comanda a la impresora...',
                            icon: 'info',
                            timer: 4000,
                            showConfirmButton: false
                        });
                    } else if (result.isDenied) {
                        imprimirVentanaNueva();
                    }
                } else {
                    imprimirVentanaNueva();
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

        function generarTextoFactura() {
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
            const clienteNom = pedidoParaImprimir.clienteNombre || cliNom || '';
            const clienteNit = pedidoParaImprimir.clienteCcNit || cliCcNit || '';

            const ancho = 32;
            function center(texto) {
                const t = texto.trim();
                const espacios = Math.max(0, ancho - t.length);
                const izq = Math.floor(espacios / 2);
                return ' '.repeat(izq) + t;
            }
            function linea(texto) {
                return texto;
            }
            function separador(caracter) {
                return caracter.repeat(ancho);
            }
            function col2(izq, der) {
                const tIzq = String(izq).trim();
                const tDer = String(der).trim();
                const espacios = Math.max(1, ancho - tIzq.length - tDer.length);
                return tIzq + ' '.repeat(espacios) + tDer;
            }

            let texto = '';

            texto += center(nombreRestaurante) + '\n';
            if (nitRestaurante) texto += center(nitRestaurante) + '\n';
            texto += center('FACTURA DE VENTA') + '\n';
            texto += separador('=') + '\n\n';

            texto += col2('Fecha:', fechaStr) + '\n';
            texto += col2('Hora:', horaStr) + '\n';
            if (clienteNom) {
                texto += col2('Cliente:', clienteNom.toUpperCase()) + '\n';
                if (clienteNit) texto += col2('CC/NIT:', clienteNit) + '\n';
            }
            texto += col2('Mesa:', pedidoParaImprimir.mesa) + '\n';
            texto += col2('Pedido:', '#' + pedidoParaImprimir._id.slice(-6).toUpperCase()) + '\n';
            texto += separador('-') + '\n';

            texto += '\n' + center(metodoPagoTexto) + '\n';
            texto += separador('-') + '\n';

            pedidoParaImprimir.items.forEach(item => {
                const nombre = item.productoInfo ? item.productoInfo.nombre : (item.nombreProducto || 'Producto');
                const cantidad = item.cantidad;
                const precio = item.precio;
                const subtotal = cantidad * precio;

                texto += '\n' + nombre + '\n';
                texto += col2(`Cant: ${cantidad} x $${precio.toLocaleString('es-CO')}`, `$${subtotal.toLocaleString('es-CO')}`) + '\n';
            });

            texto += '\n' + separador('=') + '\n';
            texto += col2('TOTAL:', `$${pedidoParaImprimir.total.toLocaleString('es-CO')}`) + '\n';
            texto += separador('-') + '\n\n';

            texto += center('¡Gracias por su compra!') + '\n';
            texto += center('Vuelva pronto') + '\n\n';
            texto += separador('=') + '\n';

            return texto;
        }

        function imprimirVentanaNueva() {
            const textoFactura = generarTextoFactura();

            const win = window.open('', '_blank', 'width=380,height=600,menubar=no,toolbar=no,location=no,status=no');
            if (!win) {
                Swal.fire('Error', 'Permite ventanas emergentes para imprimir', 'error');
                return;
            }

            win.document.write(`<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Factura</title>
    <style>
        @page {
            size: 58mm auto;
            margin: 0;
        }
        body {
            font-family: 'Courier New', Courier, monospace;
            font-size: 11px;
            line-height: 1.3;
            white-space: pre-wrap;
            width: 58mm;
            margin: 0 auto;
            padding: 3mm 2mm;
            color: #000;
            word-wrap: break-word;
        }
        @media print {
            body { padding: 0; }
        }
    </style>
</head>
<body>${textoFactura}</body>
</html>`);
            win.document.close();
            win.focus();

            setTimeout(() => {
                win.print();
            }, 500);
        }

        function crearElementoImpresion() {
            removerElementoImpresion();

            const printContainer = document.createElement('div');
            printContainer.id = 'print-container';
            printContainer.innerHTML = `<pre style="font-family:'Courier New',monospace;font-size:11px;white-space:pre-wrap;width:58mm;margin:0 auto;padding:3mm 2mm;">${generarTextoFactura()}</pre>`;
            document.body.appendChild(printContainer);
        }

        function removerElementoImpresion() {
            const printContainers = document.querySelectorAll('#print-container');
            printContainers.forEach(container => container.remove());
        }

        window.addEventListener('afterprint', () => {
            removerElementoImpresion();
        });
