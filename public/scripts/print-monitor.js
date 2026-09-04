(function() {
    console.log("🛠️ JC-RT Print Monitor PRO (Independent Mode) inicializado.");

    // Estilos del Indicador
    const indicatorStyles = `
    #print-monitor-indicator {
        position: fixed;
        bottom: 10px;
        left: 10px;
        background: rgba(30, 41, 59, 0.9);
        color: white;
        padding: 6px 14px;
        border-radius: 20px;
        font-size: 11px;
        font-weight: 700;
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        cursor: pointer;
        transition: all 0.3s;
        border: 1px solid rgba(255,255,255,0.1);
    }
    #print-monitor-indicator:hover { transform: translateY(-2px); background: #334155; }
    .status-dot-pro { width: 8px; height: 8px; background: #10b981; border-radius: 50%; box-shadow: 0 0 8px #10b981; }
    .status-dot-bt { width: 8px; height: 8px; background: #3b82f6; border-radius: 50%; box-shadow: 0 0 8px #3b82f6; }
    `;

    const styleSheet = document.createElement("style");
    styleSheet.innerText = indicatorStyles;
    document.head.appendChild(styleSheet);

    function createIndicator() {
        // Remove existing indicator if any
        const existing = document.getElementById('print-monitor-indicator');
        if (existing) existing.remove();

        const isPrintStation = localStorage.getItem('autoPrintComanda') === 'true';
        const isBtConnected = typeof BluetoothPrinter !== 'undefined' && BluetoothPrinter.isConnected();

        if (isBtConnected) {
            const btName = BluetoothPrinter.getPrinterName() || 'Bluetooth';
            const indicator = document.createElement('div');
            indicator.id = 'print-monitor-indicator';
            indicator.innerHTML = `<div class="status-dot-bt"></div> 🔵 Impresora BT: ${btName}`;
            indicator.title = "Impresión automática vía Bluetooth activa.";
            document.body.appendChild(indicator);
        } else if (isPrintStation) {
            const indicator = document.createElement('div');
            indicator.id = 'print-monitor-indicator';
            indicator.innerHTML = '<div class="status-dot-pro"></div> Estación de Impresión PRO Activa';
            indicator.title = "La impresión es automática desde el Bridge local.";
            indicator.onclick = () => window.open('http://127.0.0.1:3001', '_blank');
            document.body.appendChild(indicator);
        }
    }

    window.addEventListener('DOMContentLoaded', () => {
        // Small delay to let BluetoothPrinter auto-reconnect first
        setTimeout(createIndicator, 2000);
    });

    // Update indicator when Bluetooth status changes
    window.addEventListener('bt-printer-connected', () => createIndicator());
    window.addEventListener('bt-printer-disconnected', () => createIndicator());

    // LA LÓGICA DE IMPRESIÓN AHORA VIVE EN EL SERVER.JS DEL BRIDGE (PC LOCAL)
    // ESTE SCRIPT YA NO CONSUME RECURSOS DE RED NI BATERÍA.
})();

