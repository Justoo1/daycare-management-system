import { z } from 'zod';

export const createPaymentSchema = z.object({
  invoiceId: z.string().uuid('Invalid invoice ID'),
  amount: z.number().positive('Amount must be positive'),
  paymentMethod: z.enum(['mobile_money', 'bank_transfer', 'cash', 'card', 'check']),

  // Mobile Money specific
  mobileMoneyProvider: z.enum(['mtn', 'vodafone', 'airteltigo']).optional(),
  mobileMoneyPhone: z.string().optional(),

  // Bank transfer specific
  bankName: z.string().max(100).optional(),
  accountNumber: z.string().max(50).optional(),
  transactionId: z.string().max(100).optional(),

  // Card payment specific
  cardProvider: z.enum(['paystack', 'stripe']).optional(),

  // Cash specific
  cashReceivedBy: z.string().max(100).optional(),

  // Common fields
  paidBy: z.string().max(100).optional(),
  paidByPhone: z.string().max(20).optional(),
  paidByEmail: z.string().email().optional(),
  notes: z.string().max(1000).optional(),
  currency: z.string().length(3).optional(),
  referenceNumber: z.string().max(50).optional(),
});

export const initiateOnlinePaymentSchema = z.object({
  invoiceId: z.string().uuid('Invalid invoice ID'),
  email: z.string().email('Invalid email address'),
  amount: z.number().positive('Amount must be positive'),
  paymentMethod: z.enum(['card', 'mobile_money']),
  phone: z.string().optional(),
  provider: z.enum(['mtn', 'vodafone', 'airteltigo']).optional(),
  metadata: z.record(z.any()).optional(),
});

export const verifyPaymentSchema = z.object({
  reference: z.string().min(1, 'Reference is required'),
});

export const updatePaymentStatusSchema = z.object({
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'refunded']),
  notes: z.string().max(1000).optional(),
});

export const refundPaymentSchema = z.object({
  refundAmount: z.number().positive().optional(),
  refundReason: z.string().max(500).optional(),
});

export const getPaymentsQuerySchema = z.object({
  centerId: z.string().uuid().optional(),
  invoiceId: z.string().uuid().optional(),
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'refunded']).optional(),
  paymentMethod: z.enum(['mobile_money', 'bank_transfer', 'cash', 'card', 'check']).optional(),
  page: z.string().transform(Number).pipe(z.number().int().positive()).optional(),
  limit: z.string().transform(Number).pipe(z.number().int().positive().max(100)).optional(),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type InitiateOnlinePaymentInput = z.infer<typeof initiateOnlinePaymentSchema>;
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;
export type UpdatePaymentStatusInput = z.infer<typeof updatePaymentStatusSchema>;
export type RefundPaymentInput = z.infer<typeof refundPaymentSchema>;
export type GetPaymentsQuery = z.infer<typeof getPaymentsQuerySchema>;
