import { FastifyRequest, FastifyReply } from 'fastify';
import { paymentService } from '../services/payment.service';
import { paystackService } from '../services/paystack.service';
import {
  createPaymentSchema,
  initiateOnlinePaymentSchema,
  verifyPaymentSchema,
  updatePaymentStatusSchema,
  refundPaymentSchema,
  getPaymentsQuerySchema,
} from '../schemas/payment.schema';

export class PaymentController {
  /**
   * Create a payment (for manual payments like cash, bank transfer)
   * POST /api/payments
   */
  async createPayment(request: FastifyRequest, reply: FastifyReply) {
    try {
      const body = createPaymentSchema.parse(request.body);
      const { tenantId, centerId } = request.user as any;

      const payment = await paymentService.createPayment({
        ...body,
        tenantId,
        centerId,
      });

      return reply.status(201).send({
        success: true,
        message: 'Payment created successfully',
        data: payment,
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Failed to create payment',
      });
    }
  }

  /**
   * Initiate online payment (card or mobile money via Paystack)
   * POST /api/payments/initiate
   */
  async initiateOnlinePayment(request: FastifyRequest, reply: FastifyReply) {
    try {
      const body = initiateOnlinePaymentSchema.parse(request.body);
      const { tenantId, centerId } = request.user as any;

      const result = await paymentService.initiateOnlinePayment({
        ...body,
        tenantId,
        centerId,
      });

      return reply.status(201).send({
        success: true,
        message: 'Payment initiated successfully',
        data: result,
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Failed to initiate payment',
      });
    }
  }

  /**
   * Verify payment after Paystack redirect
   * GET /api/payments/verify/:reference
   */
  async verifyPayment(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { reference } = request.params as { reference: string };
      const { tenantId } = request.user as any;

      const payment = await paymentService.verifyPayment(reference, tenantId);

      return reply.send({
        success: true,
        message: 'Payment verified successfully',
        data: payment,
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Payment verification failed',
      });
    }
  }

  /**
   * Handle Paystack webhook
   * POST /api/payments/webhook
   */
  async handleWebhook(request: FastifyRequest, reply: FastifyReply) {
    try {
      const signature = request.headers['x-paystack-signature'] as string;

      if (!signature) {
        return reply.status(400).send({
          success: false,
          message: 'Missing signature',
        });
      }

      const payload = JSON.stringify(request.body);

      // Verify webhook signature
      const isValid = paystackService.verifyWebhookSignature(payload, signature);

      if (!isValid) {
        return reply.status(400).send({
          success: false,
          message: 'Invalid signature',
        });
      }

      const event = request.body as any;

      // Handle different event types
      if (event.event === 'charge.success') {
        const reference = event.data.reference;
        const metadata = event.data.metadata;

        if (metadata?.tenantId) {
          try {
            await paymentService.verifyPayment(reference, metadata.tenantId);
          } catch (error) {
            console.error('Webhook payment verification error:', error);
          }
        }
      }

      return reply.send({ success: true });
    } catch (error: any) {
      console.error('Webhook error:', error);
      return reply.status(400).send({
        success: false,
        message: error.message || 'Webhook processing failed',
      });
    }
  }

  /**
   * Get payment by ID
   * GET /api/payments/:id
   */
  async getPaymentById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const { tenantId } = request.user as any;

      const payment = await paymentService.getPaymentById(id, tenantId);

      if (!payment) {
        return reply.status(404).send({
          success: false,
          message: 'Payment not found',
        });
      }

      return reply.send({
        success: true,
        data: payment,
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Failed to fetch payment',
      });
    }
  }

  /**
   * Get payment by reference
   * GET /api/payments/reference/:reference
   */
  async getPaymentByReference(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { reference } = request.params as { reference: string };
      const { tenantId } = request.user as any;

      const payment = await paymentService.getPaymentByReference(reference, tenantId);

      if (!payment) {
        return reply.status(404).send({
          success: false,
          message: 'Payment not found',
        });
      }

      return reply.send({
        success: true,
        data: payment,
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Failed to fetch payment',
      });
    }
  }

  /**
   * Get all payments
   * GET /api/payments
   */
  async getPayments(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = getPaymentsQuerySchema.parse(request.query);
      const { tenantId } = request.user as any;

      const result = await paymentService.getPayments(tenantId, query);

      return reply.send({
        success: true,
        data: result.payments,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Failed to fetch payments',
      });
    }
  }

  /**
   * Get payments for an invoice
   * GET /api/payments/invoice/:invoiceId
   */
  async getInvoicePayments(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { invoiceId } = request.params as { invoiceId: string };
      const { tenantId } = request.user as any;

      const payments = await paymentService.getInvoicePayments(invoiceId, tenantId);

      return reply.send({
        success: true,
        data: payments,
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Failed to fetch invoice payments',
      });
    }
  }

  /**
   * Update payment status
   * PUT /api/payments/:id/status
   */
  async updatePaymentStatus(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const { status, notes } = updatePaymentStatusSchema.parse(request.body);
      const { tenantId } = request.user as any;

      const payment = await paymentService.updatePaymentStatus(id, tenantId, status, notes);

      return reply.send({
        success: true,
        message: 'Payment status updated successfully',
        data: payment,
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Failed to update payment status',
      });
    }
  }

  /**
   * Refund a payment
   * POST /api/payments/:id/refund
   */
  async refundPayment(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const { refundAmount, refundReason } = refundPaymentSchema.parse(request.body);
      const { tenantId } = request.user as any;

      const payment = await paymentService.refundPayment(
        id,
        tenantId,
        refundAmount,
        refundReason
      );

      return reply.send({
        success: true,
        message: 'Payment refunded successfully',
        data: payment,
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Failed to refund payment',
      });
    }
  }

  /**
   * Get payment statistics
   * GET /api/payments/stats
   */
  async getPaymentStats(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { centerId } = request.query as { centerId?: string };
      const { tenantId } = request.user as any;

      const stats = await paymentService.getPaymentStats(tenantId, centerId);

      return reply.send({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Failed to fetch payment statistics',
      });
    }
  }

  /**
   * Get Paystack public key
   * GET /api/payments/config
   */
  async getPaymentConfig(request: FastifyRequest, reply: FastifyReply) {
    try {
      return reply.send({
        success: true,
        data: {
          publicKey: paystackService.getPublicKey(),
          isConfigured: paystackService.isConfigured(),
          supportedMethods: ['card', 'mobile_money', 'bank_transfer', 'cash'],
          mobileMoneyProviders: ['mtn', 'vodafone', 'airteltigo'],
        },
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Failed to fetch payment config',
      });
    }
  }

  /**
   * Delete payment
   * DELETE /api/payments/:id
   */
  async deletePayment(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const { tenantId } = request.user as any;

      await paymentService.deletePayment(id, tenantId);

      return reply.send({
        success: true,
        message: 'Payment deleted successfully',
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Failed to delete payment',
      });
    }
  }
}

export const paymentController = new PaymentController();
