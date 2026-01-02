import { z } from 'zod';

export const createInvoiceSchema = z.object({
  childId: z.string().uuid('Invalid child ID'),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2100),
  tuitionAmount: z.number().positive('Tuition amount must be positive'),
  mealFeeAmount: z.number().nonnegative().optional(),
  activityFeeAmount: z.number().nonnegative().optional(),
  otherCharges: z.number().nonnegative().optional(),
  discount: z.number().nonnegative().optional(),
  subsidy: z.number().nonnegative().optional(),
  notes: z.string().max(1000).optional(),
  description: z.string().max(500).optional(),
  dueDate: z.string().datetime().optional(),
  isPartOfPaymentPlan: z.boolean().optional(),
  installmentNumber: z.number().int().positive().optional(),
  totalInstallments: z.number().int().positive().optional(),
});

export const updateInvoiceSchema = z.object({
  status: z.enum(['pending', 'partial', 'paid', 'overdue', 'cancelled']).optional(),
  notes: z.string().max(1000).optional(),
  pdfUrl: z.string().url().optional(),
});

export const getInvoicesQuerySchema = z.object({
  centerId: z.string().uuid().optional(),
  childId: z.string().uuid().optional(),
  status: z.enum(['pending', 'partial', 'paid', 'overdue', 'cancelled']).optional(),
  month: z.string().transform(Number).pipe(z.number().int().min(1).max(12)).optional(),
  year: z.string().transform(Number).pipe(z.number().int().min(2020).max(2100)).optional(),
  page: z.string().transform(Number).pipe(z.number().int().positive()).optional(),
  limit: z.string().transform(Number).pipe(z.number().int().positive().max(100)).optional(),
});

export const addLateFeeSchema = z.object({
  lateFeeAmount: z.number().positive('Late fee amount must be positive'),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
export type GetInvoicesQuery = z.infer<typeof getInvoicesQuerySchema>;
export type AddLateFeeInput = z.infer<typeof addLateFeeSchema>;
