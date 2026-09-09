/**
 * ms-pedidos360-notify
 * -----------------------------------------------------------------
 * PENDIENTE: en el diseño final, este servicio consume mensajes de
 * RabbitMQ para procesar envío de notificaciones (email / webpush).
 *
 * En esta primera instancia NO se despliega (no está referenciado en
 * serverless.yml) porque todavía no se define infraestructura de
 * mensajería (p. ej. Amazon MQ para RabbitMQ). Este archivo queda
 * como punto de partida para esa siguiente etapa.
 * -----------------------------------------------------------------
 */
const handler = async () => ({
  statusCode: 501,
  body: JSON.stringify({
    message: 'ms-pedidos360-notify: pendiente de integración con RabbitMQ',
  }),
});

module.exports = { handler };
