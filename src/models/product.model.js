const { z } = require('zod');

const createProductSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().int().nonnegative(),
  stock: z.number().int().nonnegative(),
  category: z.string().optional(),
});

const updateProductSchema = createProductSchema.partial();

const productImageSchema = z.object({
  imageKey: z.string().regex(/^products\/[\w-]+\/[\w.-]+$/).nullable(),
});

module.exports = { createProductSchema, updateProductSchema, productImageSchema };
