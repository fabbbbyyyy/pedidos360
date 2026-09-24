const { z } = require('zod');

const orderItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
});

const createOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1),
}).superRefine((data, ctx) => {
  const productIds = data.items.map((item) => item.productId);
  if (new Set(productIds).size !== productIds.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['items'], message: 'No se pueden repetir productos' });
  }
});

const updateOrderStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED']),
  expectedVersion: z.number().int().nonnegative().optional(),
});

const ORDER_TRANSITIONS = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY'],
  READY: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

module.exports = { createOrderSchema, updateOrderStatusSchema, ORDER_TRANSITIONS };
