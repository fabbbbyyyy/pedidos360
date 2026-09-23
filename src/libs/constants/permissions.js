const { ROLES } = require('./roles');

module.exports = {
  catalog: {
    create: [ROLES.ADMIN,],
    read:   [ROLES.ADMIN, ROLES.OPERADOR, ROLES.CLIENTE],
    update: [ROLES.ADMIN,],
    delete: [ROLES.ADMIN,],
  },
  orders: {
    create: [ROLES.ADMIN, ROLES.OPERADOR, ROLES.CLIENTE],
    read:   [ROLES.ADMIN, ROLES.OPERADOR, ROLES.CLIENTE],
    updateStatus: [ROLES.ADMIN, ROLES.OPERADOR, ROLES.CLIENTE],
    delete: [ROLES.ADMIN, ROLES.OPERADOR, ROLES.CLIENTE],
  },
};