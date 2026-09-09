const { z } = require('zod');

const orderItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
});

const createOrderSchema = z.object({
  customerId: z.string().min(1),
  items: z.array(orderItemSchema).min(1),
});

const updateOrderStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
});

module.exports = { createOrderSchema, updateOrderStatusSchema };
