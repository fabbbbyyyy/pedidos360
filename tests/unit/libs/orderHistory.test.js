const {
  buildHistoryEvent,
  appendHistoryEvent,
} = require('../../../src/libs/utils/orderHistory');

describe('order history', () => {
  it('crea un evento inicial con fromStatus nulo y changedBy desde el token', () => {
    const event = buildHistoryEvent({
      fromStatus: null,
      toStatus: 'PENDING',
      user: { customerId: 'oid-del-cliente', name: 'Cliente Demo' },
    });

    expect(event.fromStatus).toBeNull();
    expect(event.toStatus).toBe('PENDING');
    expect(event.changedBy).toEqual({ id: 'oid-del-cliente', name: 'Cliente Demo' });
    expect(event.changedAt).toMatch(/Z$/);
  });

  it('agrega el evento en orden cronologico y rechaza duplicados', () => {
    const history = [{
      fromStatus: null,
      toStatus: 'PENDING',
      changedAt: '2026-09-24T15:30:00.000Z',
      changedBy: { id: 'oid-del-cliente', name: 'Cliente Demo' },
    }];

    const next = appendHistoryEvent(history, {
      fromStatus: 'PENDING',
      toStatus: 'CONFIRMED',
      changedAt: '2026-09-24T16:10:00.000Z',
      changedBy: { id: 'oid-del-operador', name: 'Operador Demo' },
    });

    expect(next).toHaveLength(2);
    expect(next[1].toStatus).toBe('CONFIRMED');

    expect(() => appendHistoryEvent(next, {
      fromStatus: 'PENDING',
      toStatus: 'CONFIRMED',
      changedAt: '2026-09-24T18:00:00.000Z',
      changedBy: { id: 'oid-del-operador', name: 'Operador Demo' },
    })).toThrow(/duplicado|reintento/i);
  });
});
