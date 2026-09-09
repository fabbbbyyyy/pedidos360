/**
 * ms-pedidos360-audit
 * -----------------------------------------------------------------
 * PENDIENTE: en el diseño final, este servicio consume eventos de
 * Kafka y persiste un timeline de auditoría, exponiendo
 * /api/audit/* (read-only).
 *
 * En esta primera instancia NO se despliega porque Kafka aún no está
 * en el alcance del proyecto. Este archivo queda como punto de
 * partida para esa siguiente etapa.
 * -----------------------------------------------------------------
 */
const handler = async () => ({
  statusCode: 501,
  body: JSON.stringify({
    message: 'ms-pedidos360-audit: pendiente de integración con Kafka',
  }),
});

module.exports = { handler };
