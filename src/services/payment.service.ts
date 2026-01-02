import { AppDataSource } from '../config/database';
import { Payment } from '../models/Payment';
import { Invoice } from '../models/Invoice';
import { paystackService } from './paystack.service';
import { invoiceService } from './invoice.service';

export interface CreatePaymentData {
  tenantId: string;
  centerId: string;
  invoiceId: string;
  amount: number;
  paymentMethod: 'mobile_money' | 'bank_transfer' | 'cash' | 'card' | 'check';
  referenceNumber?: string;

  // Mobile Money specific
  mobileMoneyProvider?: 'mtn' | 'vodafone' | 'airteltigo';
  mobileMoneyPhone?: string;

  // Bank transfer specific
  bankName?: string;
  accountNumber?: string;
  transactionId?: string;

  // Card payment specific
  cardProvider?: 'paystack' | 'stripe';

  // Cash specific
  cashReceivedBy?: string;

  // Common fields
  paidBy?: string;
  paidByPhone?: string;
  paidByEmail?: string;
  notes?: string;
  currency?: string;
}

export interface InitiateOnlinePaymentData {
  tenantId: string;
  centerId: string;
  invoiceId: string;
  email: string;
  amount: number;
  paymentMethod: 'card' | 'mobile_money';
  phone?: string;
  provider?: 'mtn' | 'vodafone' | 'airteltigo';
  metadata?: Record<string, any>;
}

export class PaymentService {
  private paymentRepository = AppDataSource.getRepository(Payment);
  private invoiceRepository = AppDataSource.getRepository(Invoice);

  /**
   * Generate unique reference number
   */
  private generateReferenceNumber(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    return `PAY-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Create a payment record (for cash, bank transfer, etc.)
   */
  async createPayment(data: CreatePaymentData): Promise<Payment> {
    // Verify invoice exists
    const invoice = await this.invoiceRepository.findOne({
      where: {
        id: data.invoiceId,
        tenantId: data.tenantId,
      },
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.status === 'paid') {
      throw new Error('Invoice is already fully paid');
    }

    if (data.amount > invoice.balanceRemaining) {
      throw new Error('Payment amount exceeds balance remaining');
    }

    const payment = this.paymentRepository.create({
      ...data,
      referenceNumber: data.referenceNumber || this.generateReferenceNumber(),
      status: data.paymentMethod === 'cash' ? 'completed' : 'pending',
      processedAt: data.paymentMethod === 'cash' ? new Date() : null,
      currency: data.currency || 'GHS',
    });

    const savedPayment = await this.paymentRepository.save(payment);

    // Update invoice if payment is completed
    if (savedPayment.status === 'completed') {
      await invoiceService.recordPayment(
        invoice.id,
        data.tenantId,
        data.amount
      );
    }

    return savedPayment;
  }

  /**
   * Initiate online payment with Paystack
   */
  async initiateOnlinePayment(data: InitiateOnlinePaymentData) {
    if (!paystackService.isConfigured()) {
      throw new Error('Payment gateway not configured');
    }

    // Verify invoice exists
    const invoice = await this.invoiceRepository.findOne({
      where: {
        id: data.invoiceId,
        tenantId: data.tenantId,
      },
      relations: ['child'],
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.status === 'paid') {
      throw new Error('Invoice is already fully paid');
    }

    if (data.amount > invoice.balanceRemaining) {
      throw new Error('Payment amount exceeds balance remaining');
    }

    // Generate reference number
    const referenceNumber = this.generateReferenceNumber();

    // Convert amount to kobo (Paystack uses smallest currency unit)
    const amountInKobo = paystackService.convertToKobo(data.amount);

    // Create payment record
    const payment = this.paymentRepository.create({
      tenantId: data.tenantId,
      centerId: data.centerId,
      invoiceId: data.invoiceId,
      amount: data.amount,
      referenceNumber,
      paymentMethod: data.paymentMethod === 'card' ? 'card' : 'mobile_money',
      cardProvider: data.paymentMethod === 'card' ? 'paystack' : undefined,
      mobileMoneyProvider: data.provider,
      mobileMoneyPhone: data.phone,
      paidByEmail: data.email,
      status: 'pending',
      currency: 'GHS',
    });

    await this.paymentRepository.save(payment);

    // Initialize payment with Paystack
    try {
      const paystackResponse = await paystackService.initializePayment({
        email: data.email,
        amount: amountInKobo,
        reference: referenceNumber,
        currency: 'GHS',
        metadata: {
          ...data.metadata,
          invoiceId: data.invoiceId,
          invoiceNumber: invoice.invoiceNumber,
          childId: invoice.childId,
          childName: invoice.child?.firstName + ' ' + invoice.child?.lastName,
          tenantId: data.tenantId,
          centerId: data.centerId,
        },
        channels: data.paymentMethod === 'card' ? ['card'] : ['mobile_money'],
      });

      return {
        payment,
        authorization_url: paystackResponse.data.authorization_url,
        access_code: paystackResponse.data.access_code,
        reference: referenceNumber,
      };
    } catch (error: any) {
      // Update payment status to failed
      payment.status = 'failed';
      payment.failureReason = error.message;
      await this.paymentRepository.save(payment);

      throw error;
    }
  }

  /**
   * Verify and complete payment
   */
  async verifyPayment(reference: string, tenantId: string): Promise<Payment> {
    // Find payment by reference
    const payment = await this.paymentRepository.findOne({
      where: { referenceNumber: reference, tenantId },
      relations: ['invoice'],
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.status === 'completed') {
      return payment; // Already verified
    }

    // Verify with Paystack
    try {
      const verification = await paystackService.verifyPayment(reference);

      if (verification.data.status === 'success') {
        // Update payment record
        payment.status = 'completed';
        payment.processedAt = new Date(verification.data.paid_at);
        payment.confirmationCode = verification.data.reference;
        payment.transactionId = verification.data.id.toString();

        // Extract card details if available
        if (verification.data.authorization) {
          payment.cardLastFourDigits = verification.data.authorization.last4;
        }

        await this.paymentRepository.save(payment);

        // Update invoice
        await invoiceService.recordPayment(
          payment.invoiceId,
          tenantId,
          payment.amount
        );

        return payment;
      } else {
        // Payment failed
        payment.status = 'failed';
        payment.failureReason = verification.data.gateway_response || 'Payment failed';
        await this.paymentRepository.save(payment);

        throw new Error(payment.failureReason);
      }
    } catch (error: any) {
      payment.status = 'failed';
      payment.failureReason = error.message;
      await this.paymentRepository.save(payment);

      throw error;
    }
  }

  /**
   * Get payment by ID
   */
  async getPaymentById(id: string, tenantId: string): Promise<Payment | null> {
    return await this.paymentRepository.findOne({
      where: { id, tenantId },
      relations: ['invoice', 'invoice.child'],
    });
  }

  /**
   * Get payment by reference number
   */
  async getPaymentByReference(reference: string, tenantId: string): Promise<Payment | null> {
    return await this.paymentRepository.findOne({
      where: { referenceNumber: reference, tenantId },
      relations: ['invoice', 'invoice.child'],
    });
  }

  /**
   * Get all payments for an invoice
   */
  async getInvoicePayments(invoiceId: string, tenantId: string) {
    return await this.paymentRepository.find({
      where: { invoiceId, tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get all payments for a tenant
   */
  async getPayments(
    tenantId: string,
    filters?: {
      centerId?: string;
      invoiceId?: string;
      status?: string;
      paymentMethod?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (filters?.centerId) where.centerId = filters.centerId;
    if (filters?.invoiceId) where.invoiceId = filters.invoiceId;
    if (filters?.status) where.status = filters.status;
    if (filters?.paymentMethod) where.paymentMethod = filters.paymentMethod;

    const [payments, total] = await this.paymentRepository.findAndCount({
      where,
      relations: ['invoice', 'invoice.child'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      payments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Update payment status
   */
  async updatePaymentStatus(
    id: string,
    tenantId: string,
    status: string,
    notes?: string
  ): Promise<Payment> {
    const payment = await this.getPaymentById(id, tenantId);

    if (!payment) {
      throw new Error('Payment not found');
    }

    const oldStatus = payment.status;
    payment.status = status;

    if (notes) {
      payment.notes = notes;
    }

    if (status === 'completed' && oldStatus !== 'completed') {
      payment.processedAt = new Date();
      // Update invoice
      await invoiceService.recordPayment(
        payment.invoiceId,
        tenantId,
        payment.amount
      );
    }

    return await this.paymentRepository.save(payment);
  }

  /**
   * Refund a payment
   */
  async refundPayment(
    id: string,
    tenantId: string,
    refundAmount?: number,
    refundReason?: string
  ): Promise<Payment> {
    const payment = await this.getPaymentById(id, tenantId);

    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.status !== 'completed') {
      throw new Error('Can only refund completed payments');
    }

    if (payment.isRefunded) {
      throw new Error('Payment already refunded');
    }

    const amountToRefund = refundAmount || payment.amount;

    if (amountToRefund > payment.amount) {
      throw new Error('Refund amount cannot exceed payment amount');
    }

    // If payment was made via Paystack, initiate refund
    if (payment.cardProvider === 'paystack' && payment.referenceNumber) {
      try {
        await paystackService.refundTransaction(
          payment.referenceNumber,
          paystackService.convertToKobo(amountToRefund)
        );
      } catch (error: any) {
        throw new Error(`Refund failed: ${error.message}`);
      }
    }

    payment.isRefunded = true;
    payment.refundAmount = amountToRefund;
    payment.refundedAt = new Date();
    payment.refundReason = refundReason || 'Refund requested';
    payment.status = 'refunded';

    await this.paymentRepository.save(payment);

    // Update invoice (reduce amount paid)
    const invoice = await this.invoiceRepository.findOne({
      where: { id: payment.invoiceId },
    });

    if (invoice) {
      invoice.amountPaid -= amountToRefund;
      invoice.balanceRemaining += amountToRefund;

      if (invoice.balanceRemaining >= invoice.totalAmount) {
        invoice.status = 'pending';
        invoice.paidDate = null;
      } else if (invoice.balanceRemaining > 0) {
        invoice.status = 'partial';
      }

      await this.invoiceRepository.save(invoice);
    }

    return payment;
  }

  /**
   * Get payment statistics
   */
  async getPaymentStats(tenantId: string, centerId?: string) {
    const where: any = { tenantId };
    if (centerId) where.centerId = centerId;

    const [total, completed, pending, failed] = await Promise.all([
      this.paymentRepository.count({ where }),
      this.paymentRepository.count({ where: { ...where, status: 'completed' } }),
      this.paymentRepository.count({ where: { ...where, status: 'pending' } }),
      this.paymentRepository.count({ where: { ...where, status: 'failed' } }),
    ]);

    const totalAmount = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('SUM(payment.amount)', 'sum')
      .where('payment.tenantId = :tenantId', { tenantId })
      .andWhere('payment.status = :status', { status: 'completed' })
      .andWhere(centerId ? 'payment.centerId = :centerId' : '1=1', { centerId })
      .getRawOne();

    return {
      total,
      completed,
      pending,
      failed,
      totalAmount: parseFloat(totalAmount?.sum || 0),
    };
  }

  /**
   * Delete payment (soft delete)
   */
  async deletePayment(id: string, tenantId: string): Promise<void> {
    const payment = await this.getPaymentById(id, tenantId);

    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.status === 'completed') {
      throw new Error('Cannot delete completed payment. Please refund instead.');
    }

    payment.deletedAt = new Date();
    await this.paymentRepository.save(payment);
  }
}

export const paymentService = new PaymentService();
