/**
 * Types for Contrato (Contract) domain
 * Response type is derived from Zod schema to eliminate drift.
 */

import type { z } from 'zod';
import type { ContratoSchema } from '@/shared/schemas/contrato';

export type Contrato = z.infer<typeof ContratoSchema>;
