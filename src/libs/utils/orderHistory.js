const buildHistoryEvent = ({ fromStatus, toStatus, user, changedAt = new Date().toISOString() }) => {
  if (!toStatus) {
    const err = new Error('toStatus es obligatorio para registrar el historial del pedido');
    err.statusCode = 400;
    throw err;
  }

  const changedBy = {
    id: user?.customerId || user?.oid || user?.id || user?.email || 'system',
  };

  if (user?.name) {
    changedBy.name = user.name;
  }

  return {
    fromStatus,
    toStatus,
    changedAt,
    changedBy,
  };
};

const appendHistoryEvent = (history = [], event = []) => {
  const entries = Array.isArray(history) ? history : [];
  const nextEntry = event && typeof event === 'object' ? event : null;

  if (!nextEntry) {
    return entries;
  }

  const duplicated = entries.some((entry) => (
    entry.fromStatus === nextEntry.fromStatus &&
    entry.toStatus === nextEntry.toStatus &&
    entry.changedBy?.id === nextEntry.changedBy?.id
  ));

  if (duplicated) {
    const err = new Error('Evento de historial duplicado: la transición ya fue registrada');
    err.statusCode = 409;
    throw err;
  }

  return [...entries, nextEntry].sort((a, b) => new Date(a.changedAt) - new Date(b.changedAt));
};

module.exports = { buildHistoryEvent, appendHistoryEvent };
