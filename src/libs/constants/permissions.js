const { ROLES } = require('./roles');

module.exports = {
  catalog: {
    create: [ROLES.ADMIN],
    read:   [ROLES.ADMIN, ROLES.VIEWER],
    update: [ROLES.ADMIN],
    delete: [ROLES.ADMIN],
  },
  orders: {
    create: [ROLES.ADMIN, ROLES.VIEWER],
    read:   [ROLES.ADMIN, ROLES.VIEWER],
    updateStatus: [ROLES.ADMIN],
    delete: [ROLES.ADMIN],
  },
};