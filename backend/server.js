require('./src/config/env'); // Valida variables de entorno al inicio
const http = require('http');
const app = require('./src/app');
const { initSocket } = require('./src/config/socket');
const jornadaScheduler = require('./src/modules/jornadas/jornada.scheduler');
const env = require('./src/config/env');

const httpServer = http.createServer(app);
initSocket(httpServer);

httpServer.listen(env.PORT, () => {
  console.log(`\n🚀 Servidor iniciado`);
  console.log(`   URL:         http://localhost:${env.PORT}`);
  console.log(`   Health:      http://localhost:${env.PORT}/health`);
  console.log(`   Entorno:     ${env.NODE_ENV}`);
  console.log(`   Frontend:    ${env.frontendUrl}\n`);
  // El scheduler se inicia aquí: garantiza que el servidor esté escuchando
  // y que los clientes puedan haberse conectado antes del primer tick.
  jornadaScheduler.init();
});

process.on('unhandledRejection', (err) => {
  console.error('[Server] Unhandled rejection:', err.message);
});
