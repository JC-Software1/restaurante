/**
 * JC-RT Bluetooth Printer Module
 * Módulo compartido para impresión Bluetooth directa a impresoras térmicas ESC/POS.
 * Extraído y refactorizado desde bridge-android.html.
 * 
 * Uso:
 *   await BluetoothPrinter.connect();
 *   await BluetoothPrinter.printComanda(orderData);
 *   BluetoothPrinter.isConnected();
 *   BluetoothPrinter.disconnect();
 */

(function() {
    'use strict';

    // ============================================================
    //  STATE
    // ============================================================
    let bluetoothDevice = null;
    let bluetoothCharacteristic = null;
    const STORAGE_KEY = 'jcrt-bt-printer';

    // ============================================================
    //  ESC/POS CONSTANTS
    // ============================================================
    const ESC_INIT       = new Uint8Array([0x1B, 0x40]);
    const ESC_CENTER     = new Uint8Array([0x1B, 0x61, 0x01]);
    const ESC_LEFT       = new Uint8Array([0x1B, 0x61, 0x00]);
    const ESC_BOLD_ON    = new Uint8Array([0x1B, 0x45, 0x01]);
    const ESC_BOLD_OFF   = new Uint8Array([0x1B, 0x45, 0x00]);
    const ESC_DOUBLE_ON  = new Uint8Array([0x1D, 0x21, 0x11]);
    const ESC_DOUBLE_OFF = new Uint8Array([0x1D, 0x21, 0x00]);
    const ESC_FEED_4     = new Uint8Array([0x0A, 0x0A, 0x0A, 0x0A]);
    const ESC_CUT        = new Uint8Array([0x1D, 0x56, 0x00]);
    const NL             = new Uint8Array([0x0A]);
    const NL2            = new Uint8Array([0x0A, 0x0A]);

    // ============================================================
    //  HELPERS
    // ============================================================
    function buildEscPosBytes(parts) {
        const encoder = new TextEncoder();
        const arrays = parts.map(p => typeof p === 'string' ? encoder.encode(p) : p);
        const total = arrays.reduce((s, a) => s + a.length, 0);
        const result = new Uint8Array(total);
        let offset = 0;
        arrays.forEach(a => { result.set(a, offset); offset += a.length; });
        return result;
    }

    // ============================================================
    //  BLUETOOTH SERVICE UUIDs
    // ============================================================
    const SERVICE_UUIDS = [
        '000018f0-0000-1000-8000-00805f9b34fb',
        '0000fee7-0000-1000-8000-00805f9b34fb',
        '00001101-0000-1000-8000-00805f9b34fb',
    ];

    // ============================================================
    //  CONNECT
    // ============================================================
    async function connect() {
        try {
            bluetoothDevice = await navigator.bluetooth.requestDevice({
                filters: [
                    { services: ['000018f0-0000-1000-8000-00805f9b34fb'] },
                    { services: ['0000fee7-0000-1000-8000-00805f9b34fb'] },
                    { namePrefix: 'POS' },
                    { namePrefix: 'TP' },
                    { namePrefix: 'BT' },
                    { namePrefix: ' printer' },
                    { namePrefix: 'MTP' },
                    { namePrefix: 'Xprinter' },
                    { namePrefix: 'EPSON' },
                ],
                optionalServices: SERVICE_UUIDS
            });

            bluetoothDevice.addEventListener('gattserverdisconnected', () => {
                console.log('[BT-Printer] Impresora desconectada');
                bluetoothCharacteristic = null;
                _dispatchEvent('disconnected');
            });

            const server = await bluetoothDevice.gatt.connect();

            let service = null;
            for (const uuid of SERVICE_UUIDS) {
                try {
                    service = await server.getPrimaryService(uuid);
                    if (service) break;
                } catch (e) {}
            }

            if (!service) {
                throw new Error('Servicio de impresión no encontrado en el dispositivo');
            }

            const chars = await service.getCharacteristics();
            bluetoothCharacteristic = null;

            for (const char of chars) {
                const props = char.properties;
                if (props.write || props.writeWithoutResponse) {
                    bluetoothCharacteristic = char;
                    break;
                }
            }

            if (!bluetoothCharacteristic) {
                throw new Error('Característica de escritura no encontrada');
            }

            // Persistir nombre para reconexión y UI
            const name = bluetoothDevice.name || 'Impresora BT';
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ name: name, connected: true }));

            console.log(`[BT-Printer] ✅ Conectada: ${name}`);
            _dispatchEvent('connected', { name: name });
            _setSharedStatus(true, name); // ← Estado compartido

            return { success: true, name: name };

        } catch (error) {
            if (error.name === 'NotFoundError') {
                console.log('[BT-Printer] Búsqueda cancelada por el usuario');
                return { success: false, cancelled: true };
            }
            console.error('[BT-Printer] Error:', error.message);
            bluetoothDevice = null;
            bluetoothCharacteristic = null;
            return { success: false, error: error.message };
        }
    }

    // ============================================================
    //  AUTO-RECONNECT
    // ============================================================
    async function tryAutoReconnect() {
        if (!navigator.bluetooth || !navigator.bluetooth.getDevices) return false;

        const saved = _getSavedPrinter();
        if (!saved || !saved.name) return false;

        try {
            const devices = await navigator.bluetooth.getDevices();
            const lastDevice = devices.find(d => d.name === saved.name);

            if (!lastDevice || !lastDevice.gatt) return false;

            console.log(`[BT-Printer] Reconectando a ${lastDevice.name}...`);
            bluetoothDevice = lastDevice;

            bluetoothDevice.addEventListener('gattserverdisconnected', () => {
                console.log('[BT-Printer] Impresora desconectada');
                bluetoothCharacteristic = null;
                _dispatchEvent('disconnected');
            });

            const server = await lastDevice.gatt.connect();

            let service = null;
            for (const uuid of SERVICE_UUIDS) {
                try { service = await server.getPrimaryService(uuid); if (service) break; } catch (e) {}
            }

            if (service) {
                const chars = await service.getCharacteristics();
                for (const char of chars) {
                    if (char.properties.write || char.properties.writeWithoutResponse) {
                        bluetoothCharacteristic = char;
                        break;
                    }
                }
            }

            if (bluetoothCharacteristic) {
                console.log(`[BT-Printer] ✅ Reconectada: ${lastDevice.name}`);
                _dispatchEvent('connected', { name: lastDevice.name });
                _setSharedStatus(true, lastDevice.name); // ← Estado compartido
                return true;
            }
        } catch (e) {
            console.log('[BT-Printer] Auto-reconexión fallida:', e.message);
        }

        return false;
    }

    // ============================================================
    //  DISCONNECT
    // ============================================================
    function disconnect() {
        try {
            if (bluetoothDevice && bluetoothDevice.gatt.connected) {
                bluetoothDevice.gatt.disconnect();
            }
        } catch (e) {}

        bluetoothDevice = null;
        bluetoothCharacteristic = null;
        localStorage.removeItem(STORAGE_KEY);
        _dispatchEvent('disconnected');
        _setSharedStatus(false); // ← Estado compartido
    }

    // ============================================================
    //  SEND DATA
    // ============================================================
    async function _sendData(data) {
        if (!bluetoothCharacteristic) throw new Error('No hay impresora Bluetooth conectada');

        // Chunk pequeño (128 bytes) + pausa larga (100ms) para evitar
        // desbordamiento del buffer Bluetooth de la impresora térmica.
        // Con 512/10ms solo se imprimía el primer plato porque el buffer
        // se saturaba y se perdían los bytes intermedios.
        const CHUNK_SIZE = 128;
        const DELAY_MS = 100;
        const totalChunks = Math.ceil(data.length / CHUNK_SIZE);
        console.log(`[BT-Printer] Enviando ${data.length} bytes en ${totalChunks} chunks de ${CHUNK_SIZE}...`);

        for (let i = 0; i < data.length; i += CHUNK_SIZE) {
            const chunk = data.slice(i, i + CHUNK_SIZE);
            const chunkNum = Math.floor(i / CHUNK_SIZE) + 1;
            try {
                await bluetoothCharacteristic.writeValueWithoutResponse(chunk);
            } catch (e) {
                try {
                    await bluetoothCharacteristic.writeValueWithResponse(chunk);
                } catch (e2) {
                    console.error(`[BT-Printer] Error en chunk ${chunkNum}/${totalChunks}: ${e2.message}`);
                    throw new Error(`Error enviando datos (chunk ${chunkNum}): ${e2.message}`);
                }
            }
            // Pausa obligatoria entre cada chunk para que la impresora procese
            if (i + CHUNK_SIZE < data.length) {
                await new Promise(r => setTimeout(r, DELAY_MS));
            }
        }
        console.log(`[BT-Printer] ✅ ${data.length} bytes enviados completos (${totalChunks} chunks)`);
    }

    // ============================================================
    //  GENERATE COMANDA BYTES
    // ============================================================
    function _generateComandaBytes(order) {
        const W = 32; // 32 chars = 58mm

        function sep(c) { return c.repeat(W); }
        function wrapText(text, maxW) {
            const words = String(text).split(' ');
            const lines = [];
            let current = '';
            let iterations = 0;
            words.forEach(word => {
                if (iterations++ > 1000) return; // Safety limit
                if ((current + (current ? ' ' : '') + word).length <= maxW) {
                    current += (current ? ' ' : '') + word;
                } else {
                    if (current) lines.push(current);
                    while (word.length > maxW) {
                        lines.push(word.slice(0, maxW));
                        word = word.slice(maxW);
                    }
                    current = word;
                }
            });
            if (current) lines.push(current);
            return lines;
        }

        const enc = new TextEncoder();
        const parts = [];
        const add = (str) => { parts.push(enc.encode(str)); };
        const addRaw = (bytes) => { parts.push(bytes); };
        const nl = () => addRaw(NL);
        const nl2 = () => addRaw(NL2);

        console.log('[BT-Printer] Items count:', order.items ? order.items.length : 0);

        // Init
        addRaw(ESC_INIT);

        // Encabezado
        addRaw(ESC_CENTER);
        addRaw(ESC_BOLD_ON);
        addRaw(ESC_DOUBLE_ON);
        add('JC-RT RESTAURANTE');
        nl();
        addRaw(ESC_DOUBLE_OFF);
        addRaw(ESC_BOLD_OFF);
        add(sep('-'));
        nl();

        // Mesa y fecha
        addRaw(ESC_LEFT);
        addRaw(ESC_BOLD_ON);
        add(`COMANDA - MESA: ${order.mesa}`);
        nl();
        addRaw(ESC_BOLD_OFF);

        if (order.meseroNombre) {
            add(`Mesero: ${order.meseroNombre}`);
            nl();
        }

        add(`Fecha: ${new Date().toLocaleString('es-CO')}`);
        nl();
        add(sep('-'));
        nl();

        // Ítems
        addRaw(ESC_LEFT);

        if (!order.items || order.items.length === 0) {
            add('(Sin productos)');
            nl();
        } else {
            for (let idx = 0; idx < order.items.length; idx++) {
                const item = order.items[idx];
                try {
                    const nombre = item.productoInfo
                        ? item.productoInfo.nombre
                        : (item.nombreProducto || item.nombre || 'Producto');
                    const cantidad = item.cantidad || 1;

                    addRaw(ESC_BOLD_ON);
                    const linNombre = `${cantidad}x ${nombre}`;
                    wrapText(linNombre, W).forEach(l => { add(l); nl(); });
                    addRaw(ESC_BOLD_OFF);

                    // Notas del ítem
                    const nota = item.notas || item.nota || '';
                    if (nota && nota.trim()) {
                        wrapText(`  >> ${nota.trim()}`, W).forEach(l => { add(l); nl(); });
                    }
                } catch (itemError) {
                    console.error(`[BT-Printer] Error item ${idx}:`, itemError);
                }
            }
        }
        nl();

        // Nota general del pedido
        if (order.notas && order.notas.trim()) {
            add(sep('-'));
            nl();
            addRaw(ESC_BOLD_ON);
            add('NOTA DEL PEDIDO:');
            nl();
            addRaw(ESC_BOLD_OFF);
            const pedidoNotaLines = wrapText(order.notas.trim(), W);
            pedidoNotaLines.forEach(l => { add(l); nl(); });
        }

        // Footer
        add(sep('='));
        nl();
        addRaw(ESC_CENTER);

        let footerText = '-- COMANDA --';
        if (order.meseroNombre && order.meseroNombre.trim() !== '') {
            footerText = `-- ${order.meseroNombre.toUpperCase()} --`;
        }
        add(footerText);
        nl();

        // Avance mínimo y corte
        addRaw(ESC_FEED_4);
        addRaw(ESC_CUT);

        const finalBytes = buildEscPosBytes(parts);
        console.log(`[BT-Printer] Total bytes generados: ${finalBytes.length}`);
        return finalBytes;
    }

    // ============================================================
    //  PRINT COMANDA
    // ============================================================
    async function printComanda(orderData) {
        if (!bluetoothCharacteristic) {
            throw new Error('Impresora Bluetooth no conectada');
        }

        try {
            const bytes = _generateComandaBytes(orderData);
            await _sendData(bytes);
            console.log(`[BT-Printer] ✅ Comanda impresa: Mesa ${orderData.mesa}`);
            return true;
        } catch (e) {
            console.error('[BT-Printer] Error in printComanda:', e);
            throw e;
        }
    }

    // ============================================================
    //  GENERATE FACTURA BYTES
    // ============================================================
    function _generateFacturaBytes(order) {
        const W = 32;

        function center(text) {
            const t = String(text).trim();
            const pad = Math.max(0, Math.floor((W - t.length) / 2));
            return ' '.repeat(pad) + t;
        }
        function sep(c) { return c.repeat(W); }
        function col2(l, r) {
            const tL = String(l);
            const tR = String(r);
            const spaces = Math.max(1, W - tL.length - tR.length);
            return tL + ' '.repeat(spaces) + tR;
        }

        const enc = new TextEncoder();
        const parts = [];
        const add = (str) => { parts.push(enc.encode(str)); };
        const addRaw = (bytes) => { parts.push(bytes); };
        const nl = () => addRaw(NL);
        const nl2 = () => addRaw(NL2);

        // ── Init ──
        addRaw(ESC_INIT);
        addRaw(ESC_CENTER);
        addRaw(ESC_BOLD_ON);
        addRaw(ESC_DOUBLE_ON);
        add(order.restauranteNombre || 'FACTURA DE VENTA');
        nl();
        addRaw(ESC_DOUBLE_OFF);
        addRaw(ESC_BOLD_OFF);
        add(sep('-'));
        nl();

        // ── Datos ──
        addRaw(ESC_LEFT);
        add(`Fecha: ${new Date().toLocaleDateString('es-CO')}`);
        nl();
        add(`Hora:  ${new Date().toLocaleTimeString('es-CO')}`);
        nl();
        add(`Mesa:  ${order.mesa}`);
        nl();
        add(`Pedido: #${String(order._id).slice(-6).toUpperCase()}`);
        nl();
        // ── Cliente ──
        if (order.clienteNombre) {
            add(`Cliente: ${order.clienteNombre}`);
            nl();
            if (order.clienteCcNit) {
                add(`CC/NIT: ${order.clienteCcNit}`);
                nl();
            }
        }
        add(sep('-'));
        nl();

        // ── Cabecera tabla ──
        addRaw(ESC_BOLD_ON);
        add(col2('Producto', 'Cant  Total'));
        nl();
        addRaw(ESC_BOLD_OFF);
        add(sep('-'));
        nl();

        // ── Ítems ──
        if (order.items && order.items.length > 0) {
            order.items.forEach(item => {
                const nombre = item.productoInfo
                    ? item.productoInfo.nombre
                    : (item.nombreProducto || item.nombre || 'Producto');
                const cant = String(item.cantidad || 1);
                const precio = item.precio || 0;
                const totalItem = `$${((item.cantidad || 1) * precio).toLocaleString('es-CO')}`;
                
                const maxNombre = W - cant.length - totalItem.length - 2;
                const shortName = nombre.length > maxNombre ? nombre.substring(0, maxNombre) : nombre;
                add(col2(shortName, `${cant} ${totalItem}`));
                nl();
                if (item.nota && item.nota.trim()) {
                    add(`  >> ${item.nota.trim()}`);
                    nl();
                }
            });
        }
        nl();

        // ── Total ──
        add(sep('-'));
        nl();
        addRaw(ESC_BOLD_ON);
        addRaw(ESC_DOUBLE_ON);
        add(col2('TOTAL:', `$${(order.total || 0).toLocaleString('es-CO')}`));
        nl();
        addRaw(ESC_DOUBLE_OFF);
        addRaw(ESC_BOLD_OFF);
        add(sep('-'));
        nl();

        // ── Footer ──
        addRaw(ESC_CENTER);
        add(center('¡Gracias por su compra!'));
        nl();
        add(center('Vuelva pronto'));
        nl2();
        add(sep('='));
        nl2();

        // Avance de papel y corte
        addRaw(ESC_FEED_4);
        addRaw(ESC_CUT);

        return buildEscPosBytes(parts);
    }

    // ============================================================
    //  PRINT FACTURA
    // ============================================================
    async function printFactura(orderData) {
        if (!bluetoothCharacteristic) {
            throw new Error('Impresora Bluetooth no conectada');
        }

        try {
            const bytes = _generateFacturaBytes(orderData);
            await _sendData(bytes);
            console.log(`[BT-Printer] ✅ Factura impresa: Mesa ${orderData.mesa}`);
            return true;
        } catch (e) {
            console.error('[BT-Printer] Error in printFactura:', e);
            throw e;
        }
    }

    // ============================================================
    //  STATUS
    // ============================================================
    function isConnected() {
        return !!bluetoothCharacteristic;
    }

    function getPrinterName() {
        if (bluetoothDevice && bluetoothDevice.name) return bluetoothDevice.name;
        const saved = _getSavedPrinter();
        return saved ? saved.name : null;
    }

    function isSupported() {
        return !!navigator.bluetooth;
    }

    // ============================================================
    //  INTERNAL HELPERS
    // ============================================================
    function _getSavedPrinter() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : null;
        } catch (e) { return null; }
    }

    function _dispatchEvent(type, detail) {
        window.dispatchEvent(new CustomEvent('bt-printer-' + type, { detail: detail || {} }));
    }

    // ============================================================
    //  SHARED PRINTER STATUS (Multi-device restaurant sync)
    // ============================================================
    const SHARED_STORAGE_KEY = 'jcrt-shared-printer-status';
    const SYNC_INTERVAL_MS = 5000;
    const STATUS_TTL_MS = 30000; // 30s - si no se actualiza, se considera desconectado
    let sharedSyncTimer = null;
    let sharedChannel = null;

    function _getRestaurantId() {
        try {
            const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
            return user.id || user._id || user.restaurantId || 'default';
        } catch (e) { return 'default'; }
    }

    function _saveSharedStatus(connected, printerName) {
        const restaurantId = _getRestaurantId();
        const deviceId = _getDeviceId();
        const status = {
            restaurantId,
            deviceId,
            connected,
            printerName: printerName || null,
            timestamp: Date.now(),
            userAgent: navigator.userAgent.slice(0, 50)
        };
        try {
            let all = JSON.parse(localStorage.getItem(SHARED_STORAGE_KEY) || '{}');
            all[restaurantId] = all[restaurantId] || {};
            all[restaurantId][deviceId] = status;
            // Limpiar dispositivos viejos (> TTL)
            Object.keys(all[restaurantId]).forEach(d => {
                if (Date.now() - all[restaurantId][d].timestamp > STATUS_TTL_MS) {
                    delete all[restaurantId][d];
                }
            });
            localStorage.setItem(SHARED_STORAGE_KEY, JSON.stringify(all));
            _broadcastSharedStatus(status);
        } catch (e) { console.error('[BT-Printer] Error guardando shared status:', e); }
    }

    function _getDeviceId() {
        let id = localStorage.getItem('jcrt-device-id');
        if (!id) { id = 'dev_' + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('jcrt-device-id', id); }
        return id;
    }

    function _broadcastSharedStatus(status) {
        if (sharedChannel) {
            sharedChannel.postMessage({ type: 'printer-status', status });
        }
    }

    function _initSharedSync() {
        if (sharedChannel) return;
        try {
            sharedChannel = new BroadcastChannel('jc-printer-shared');
            sharedChannel.onmessage = (e) => {
                if (e.data?.type === 'printer-status') {
                    _updateSharedStatusFromMessage(e.data.status);
                }
            };
        } catch (e) { console.warn('[BT-Printer] BroadcastChannel no disponible'); }

        // Poll localStorage cada 5s para detectar cambios de otros dispositivos
        sharedSyncTimer = setInterval(() => {
            _checkSharedStatus();
        }, SYNC_INTERVAL_MS);

        // Escuchar evento storage (otras tabs mismo dispositivo)
        window.addEventListener('storage', (e) => {
            if (e.key === SHARED_STORAGE_KEY) _checkSharedStatus();
        });

        _checkSharedStatus(); // Check inicial
    }

    function _updateSharedStatusFromMessage(status) {
        if (!status || status.restaurantId !== _getRestaurantId()) return;
        try {
            let all = JSON.parse(localStorage.getItem(SHARED_STORAGE_KEY) || '{}');
            all[status.restaurantId] = all[status.restaurantId] || {};
            all[status.restaurantId][status.deviceId] = status;
            localStorage.setItem(SHARED_STORAGE_KEY, JSON.stringify(all));
        } catch (e) {}
    }

    function _checkSharedStatus() {
        const restaurantId = _getRestaurantId();
        const myDeviceId = _getDeviceId();
        try {
            const all = JSON.parse(localStorage.getItem(SHARED_STORAGE_KEY) || '{}');
            const restaurantDevices = all[restaurantId] || {};
            const now = Date.now();
            let anyConnected = false;
            let connectedPrinterName = null;
            Object.entries(restaurantDevices).forEach(([deviceId, status]) => {
                if (now - status.timestamp <= STATUS_TTL_MS && status.connected) {
                    anyConnected = true;
                    if (deviceId !== myDeviceId) connectedPrinterName = status.printerName;
                }
            });
            // Disparar evento para UI
            window.dispatchEvent(new CustomEvent('bt-printer-shared-status', {
                detail: { anyConnected, connectedPrinterName, myDeviceConnected: restaurantDevices[myDeviceId]?.connected }
            }));
        } catch (e) {}
    }

    // Devuelve true si ALGÚN dispositivo del restaurante tiene impresora conectada
    function isAnyRestaurantPrinterConnected() {
        const restaurantId = _getRestaurantId();
        try {
            const all = JSON.parse(localStorage.getItem(SHARED_STORAGE_KEY) || '{}');
            const restaurantDevices = all[restaurantId] || {};
            const now = Date.now();
            return Object.values(restaurantDevices).some(s => now - s.timestamp <= STATUS_TTL_MS && s.connected);
        } catch (e) { return false; }
    }

    function getSharedPrinterInfo() {
        const restaurantId = _getRestaurantId();
        try {
            const all = JSON.parse(localStorage.getItem(SHARED_STORAGE_KEY) || '{}');
            const restaurantDevices = all[restaurantId] || {};
            const now = Date.now();
            for (const status of Object.values(restaurantDevices)) {
                if (now - status.timestamp <= STATUS_TTL_MS && status.connected) {
                    return { connected: true, printerName: status.printerName, deviceId: status.deviceId };
                }
            }
        } catch (e) {}
        return { connected: false };
    }

    // Llamar en connect() y disconnect()
    function _setSharedStatus(connected, printerName) {
        _saveSharedStatus(connected, printerName);
        _checkSharedStatus();
    }

    // ============================================================
    //  PUBLIC API
    // ============================================================
    window.BluetoothPrinter = {
        connect: connect,
        disconnect: disconnect,
        tryAutoReconnect: tryAutoReconnect,
        printComanda: printComanda,
        printFactura: printFactura,
        isConnected: isConnected,
        isSupported: isSupported,
        getPrinterName: getPrinterName,
        // Shared status (multi-device)
        isAnyRestaurantPrinterConnected: isAnyRestaurantPrinterConnected,
        getSharedPrinterInfo: getSharedPrinterInfo,
        initSharedSync: _initSharedSync
    };

// Inicializar sync compartido al cargar
    _initSharedSync();
})();
