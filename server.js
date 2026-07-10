const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const compression = require('compression');
const expensesRoutes = require('./routes/Expenses');
const liquidacionesRoutes = require('./routes/liquidaciones');
const adminMeserosRoutes = require('./routes/adminMeseros');
const ordersRoutes = require('./routes/Orders');
const alimentosRoutes = require('./routes/alimentos');
const mesasRoutes = require('./routes/mesas');
const productsRoutes = require('./routes/Products');
const mandaoRoutes = require('./routes/mandao'); // ✅ Integración Mandao
const pushRoutes = require('./routes/push'); // ✅ Push notifications
const { protect } = require('./middleware/auth');
require('dotenv').config();

// ✅ Inicializar Firebase Admin
const { initializeFirebase } = require('./services/pushNotification');
initializeFirebase();

// ✅ Inicializar Cron Jobs (Bloqueo automático)
const { startCronJobs } = require('./services/cronJobs');
startCronJobs();

// ✅ MONITOREO DE RENDIMIENTO
const performance = require('perf_hooks').performance;
const consoleTime = console.time;
const consoleTimeEnd = console.timeEnd;

// Reemplazar console.time con medición de rendimiento
console.time = function(label) {
  performance.mark(`start-${label}`);
};

console.timeEnd = function(label) {
  performance.mark(`end-${label}`);
  performance.measure(label, `start-${label}`, `end-${label}`);
  const measure = performance.getEntriesByName(label)[0];
  console.log(`⏱ ${label}: ${measure.duration.toFixed(2)}ms`);
  performance.clearMarks();
  performance.clearMeasures();
};

const app = express();

// ✅ Compresión gzip para reducir tamaño de respuestas (mejora en dispositivos lentos)
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
  level: 6,
  threshold: 1024
}));

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ✅ Headers de caché para archivos estáticos (reduce carga en dispositivos lentos)
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1d',
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    } else if (filePath.match(/\.(js|css)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=604800');
    } else if (filePath.match(/\.(png|jpg|jpeg|gif|svg|webp|ico)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=2592000');
    }
  }
}));

// Conexión a MongoDB Atlas
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Conectado a MongoDB Atlas'))
  .catch((err) => console.error('❌ Error de conexión a MongoDB:', err.message));

// ⭐ RUTAS PÚBLICAS PRIMERO (SIN protect)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/orders', ordersRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/mandao', protect, mandaoRoutes); // ✅ Integración Mandao
app.use('/api/push', pushRoutes); // ✅ Notificaciones push (público)

// ✅ Endpoint para detectar capacidad del dispositivo (público, sin auth)
app.get('/api/device-capability', (req, res) => {
  const ua = req.headers['user-agent'] || '';
  const isLowEnd = /Android (5|6|7|8\.[012])|iPhone|iPad.*(?:A[0-9]+X|A1[0-8])|Windows Phone|Opera Mini|UCBrowser/i.test(ua);
  const isSlowNetwork = /2G|3G|slow-2g/i.test(req.headers['ect'] || '');
  res.json({
    success: true,
    lowEnd: isLowEnd || isSlowNetwork,
    lowEndUA: isLowEnd,
    slowNetwork: isSlowNetwork
  });
});

// ⭐ RUTAS PROTEGIDAS (CON protect)
app.use('/api/expenses', protect, expensesRoutes);
app.use('/api/liquidaciones', protect, liquidacionesRoutes);
app.use('/api/admin-meseros', protect, adminMeserosRoutes);
app.use('/api/alimentos', alimentosRoutes);
app.use('/api/mesas', protect, mesasRoutes);

// Ruta principal (sirve index.html desde public)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Manejo de errores 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada'
  });
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    error: err.message
  });
});

// Puerto dinámico
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`📊 Compresión gzip: ACTIVADA (nivel 6)`);
  console.log(`💾 Caché estático: 7 días JS/CSS, 30 días imágenes`);
});