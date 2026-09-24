const { TransactWriteCommand } = require('@aws-sdk/lib-dynamodb');
const { dynamoDb } = require('../../../libs/db/dynamoClient');

const ORDERS_TABLE = process.env.ORDERS_TABLE;
const CATALOG_TABLE = process.env.CATALOG_TABLE;

const changeOrderStatus = async ({ order, status, expectedVersion }) => {
  const version = order.version || 1;
  const updatedAt = new Date().toISOString();
  const orderKey = { pk: order.pk, sk: order.sk };
  const transactItems = [{
    Update: {
      TableName: ORDERS_TABLE,
      Key: orderKey,
      ConditionExpression: '#status = :currentStatus AND version = :expectedVersion',
      UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt, version = :nextVersion',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':currentStatus': order.status,
        ':status': status,
        ':updatedAt': updatedAt,
        ':expectedVersion': expectedVersion,
        ':nextVersion': version + 1,
      },
    },
  }];

  if (status === 'CANCELLED') {
    transactItems.push(...(order.items || []).map((item) => ({
      Update: {
        TableName: CATALOG_TABLE,
        Key: { id: item.productId },
        UpdateExpression: 'SET stock = stock + :qty',
        ConditionExpression: 'attribute_exists(id)',
        ExpressionAttributeValues: { ':qty': item.quantity },
      },
    })));
  }

  try {
    await dynamoDb.send(new TransactWriteCommand({ TransactItems: transactItems }));
  } catch (err) {
    if (err.name === 'TransactionCanceledException') {
      const conflict = new Error('El pedido cambió antes de actualizarse; vuelve a intentarlo');
      conflict.statusCode = 409;
      throw conflict;
    }
    throw err;
  }

  return { ...order, status, updatedAt, version: version + 1 };
};

module.exports = { changeOrderStatus };
