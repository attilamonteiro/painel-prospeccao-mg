/**
 * Common Zod schemas
 */

import { z, type ZodType } from 'zod';

/**
 * Generic schema for paginated responses
 * @param itemSchema - The Zod schema for individual items
 * @returns Zod schema for PaginatedResponse<T>
 */
export function paginatedSchema<T>(itemSchema: ZodType<T>) {
  return z.object({
    data: z.array(itemSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    page_size: z.number().int().positive(),
    total_pages: z.number().int().nonnegative(),
  });
}
