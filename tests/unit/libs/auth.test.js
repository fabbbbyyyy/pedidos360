const {
  getUserFromEvent,
  authorizeOrderAccess,
  ensureClientCreateRequest,
} = require('../../../src/libs/middlewares/auth');

describe('auth middleware', () => {
  it('usa oid como claim canónico para customerId y expone tenantId', () => {
    const user = getUserFromEvent({
      requestContext: {
        authorizer: {
          jwt: {
            claims: {
              oid: 'customer-oid-123',
              tid: 'tenant-42',
              roles: ['cliente'],
            },
          },
        },
      },
    });

    expect(user.customerId).toBe('customer-oid-123');
    expect(user.tenantId).toBe('tenant-42');
    expect(user.roles).toEqual(['cliente']);
  });

  it('rechaza un cliente que intenta sobrescribir customerId en la creación', () => {
    expect(() => ensureClientCreateRequest({
      roles: ['cliente'],
      customerId: 'customer-oid-123',
    }, {
      customerId: 'customer-oid-999',
      items: [{ productId: 'p-1', quantity: 1 }],
    })).toThrow(/No se permite/);
  });

  it('bloquea pedidos ajenos de clientes aunque compartan tenant', () => {
    const user = {
      roles: ['cliente'],
      customerId: 'customer-oid-123',
      tenantId: 'tenant-42',
    };

    expect(authorizeOrderAccess(user, {
      customerId: 'customer-oid-123',
      tenantId: 'tenant-42',
    })).toBe(true);

    expect(authorizeOrderAccess(user, {
      customerId: 'customer-oid-999',
      tenantId: 'tenant-42',
    })).toBe(false);
  });
});
