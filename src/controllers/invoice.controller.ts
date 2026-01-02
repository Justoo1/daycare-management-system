import { FastifyRequest, FastifyReply } from 'fastify';
import { invoiceService } from '../services/invoice.service';
import {
  createInvoiceSchema,
  updateInvoiceSchema,
  getInvoicesQuerySchema,
  addLateFeeSchema,
} from '../schemas/invoice.schema';

export class InvoiceController {
  /**
   * Create a new invoice
   * POST /api/invoices
   */
  async createInvoice(request: FastifyRequest, reply: FastifyReply) {
    try {
      const body = createInvoiceSchema.parse(request.body);
      const { tenantId, centerId } = request.user as any;

      const invoice = await invoiceService.createInvoice({
        ...body,
        tenantId,
        centerId,
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      });

      return reply.status(201).send({
        success: true,
        message: 'Invoice created successfully',
        data: invoice,
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Failed to create invoice',
      });
    }
  }

  /**
   * Get all invoices
   * GET /api/invoices
   */
  async getInvoices(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = getInvoicesQuerySchema.parse(request.query);
      const { tenantId } = request.user as any;

      const result = await invoiceService.getInvoices(tenantId, query);

      return reply.send({
        success: true,
        data: result.invoices,
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
        message: error.message || 'Failed to fetch invoices',
      });
    }
  }

  /**
   * Get invoice by ID
   * GET /api/invoices/:id
   */
  async getInvoiceById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const { tenantId } = request.user as any;

      const invoice = await invoiceService.getInvoiceById(id, tenantId);

      if (!invoice) {
        return reply.status(404).send({
          success: false,
          message: 'Invoice not found',
        });
      }

      return reply.send({
        success: true,
        data: invoice,
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Failed to fetch invoice',
      });
    }
  }

  /**
   * Get invoice by invoice number
   * GET /api/invoices/number/:invoiceNumber
   */
  async getInvoiceByNumber(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { invoiceNumber } = request.params as { invoiceNumber: string };
      const { tenantId } = request.user as any;

      const invoice = await invoiceService.getInvoiceByNumber(invoiceNumber, tenantId);

      if (!invoice) {
        return reply.status(404).send({
          success: false,
          message: 'Invoice not found',
        });
      }

      return reply.send({
        success: true,
        data: invoice,
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Failed to fetch invoice',
      });
    }
  }

  /**
   * Get child invoices
   * GET /api/invoices/child/:childId
   */
  async getChildInvoices(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { childId } = request.params as { childId: string };
      const { tenantId } = request.user as any;

      const invoices = await invoiceService.getChildInvoices(childId, tenantId);

      return reply.send({
        success: true,
        data: invoices,
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Failed to fetch child invoices',
      });
    }
  }

  /**
   * Get overdue invoices
   * GET /api/invoices/overdue
   */
  async getOverdueInvoices(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { centerId } = request.query as { centerId?: string };
      const { tenantId } = request.user as any;

      const invoices = await invoiceService.getOverdueInvoices(tenantId, centerId);

      return reply.send({
        success: true,
        data: invoices,
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Failed to fetch overdue invoices',
      });
    }
  }

  /**
   * Get pending invoices
   * GET /api/invoices/pending
   */
  async getPendingInvoices(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { centerId } = request.query as { centerId?: string };
      const { tenantId } = request.user as any;

      const invoices = await invoiceService.getPendingInvoices(tenantId, centerId);

      return reply.send({
        success: true,
        data: invoices,
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Failed to fetch pending invoices',
      });
    }
  }

  /**
   * Update invoice
   * PUT /api/invoices/:id
   */
  async updateInvoice(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const body = updateInvoiceSchema.parse(request.body);
      const { tenantId } = request.user as any;

      const invoice = await invoiceService.updateInvoice(id, tenantId, body);

      return reply.send({
        success: true,
        message: 'Invoice updated successfully',
        data: invoice,
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Failed to update invoice',
      });
    }
  }

  /**
   * Add late fee to invoice
   * POST /api/invoices/:id/late-fee
   */
  async addLateFee(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const { lateFeeAmount } = addLateFeeSchema.parse(request.body);
      const { tenantId } = request.user as any;

      const invoice = await invoiceService.addLateFee(id, tenantId, lateFeeAmount);

      return reply.send({
        success: true,
        message: 'Late fee added successfully',
        data: invoice,
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Failed to add late fee',
      });
    }
  }

  /**
   * Cancel invoice
   * POST /api/invoices/:id/cancel
   */
  async cancelInvoice(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const { tenantId } = request.user as any;

      const invoice = await invoiceService.cancelInvoice(id, tenantId);

      return reply.send({
        success: true,
        message: 'Invoice cancelled successfully',
        data: invoice,
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Failed to cancel invoice',
      });
    }
  }

  /**
   * Get invoice statistics
   * GET /api/invoices/stats
   */
  async getInvoiceStats(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { centerId } = request.query as { centerId?: string };
      const { tenantId } = request.user as any;

      const stats = await invoiceService.getInvoiceStats(tenantId, centerId);

      return reply.send({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Failed to fetch invoice statistics',
      });
    }
  }

  /**
   * Delete invoice
   * DELETE /api/invoices/:id
   */
  async deleteInvoice(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const { tenantId } = request.user as any;

      await invoiceService.deleteInvoice(id, tenantId);

      return reply.send({
        success: true,
        message: 'Invoice deleted successfully',
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Failed to delete invoice',
      });
    }
  }
}

export const invoiceController = new InvoiceController();
