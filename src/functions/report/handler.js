/**
 * ms-pedidos360-report
 * -----------------------------------------------------------------
 * PENDIENTE: en el diseño final, este servicio consume eventos de
 * Kafka para generar agregaciones/KPIs, exponiendo
 * /api/report/* (read-only).
 *
 * En esta primera instancia NO se despliega porque Kafka aún no está
 * en el alcance del proyecto. Este archivo queda como punto de
 * partida para esa siguiente etapa.
 * -----------------------------------------------------------------
 */
const handler = async () => ({
  statusCode: 501,
  body: JSON.stringify({
    message: 'ms-pedidos360-report: pendiente de integración con Kafka',
  }),
});

module.exports = { handler };
