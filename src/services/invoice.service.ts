import { AppDataSource } from '../config/database';
import { Invoice } from '../models/Invoice';
import { Child } from '../models/Child';
import { Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';

export interface CreateInvoiceData {
  tenantId: string;
  centerId: string;
  childId: string;
  month: number;
  year: number;
  tuitionAmount: number;
  mealFeeAmount?: number;
  activityFeeAmount?: number;
  otherCharges?: number;
  discount?: number;
  subsidy?: number;
  notes?: string;
  description?: string;
  dueDate?: Date;
  isPartOfPaymentPlan?: boolean;
  installmentNumber?: number;
  totalInstallments?: number;
}

export interface UpdateInvoiceData {
  status?: string;
  amountPaid?: number;
  paidDate?: Date;
  notes?: string;
  pdfUrl?: string;
}

export class InvoiceService {
  private invoiceRepository = AppDataSource.getRepository(Invoice);
  private childRepository = AppDataSource.getRepository(Child);

  /**
   * Generate unique invoice number
   */
  private async generateInvoiceNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');

    // Count invoices this month
    const startOfMonth = new Date(year, new Date().getMonth(), 1);
    const endOfMonth = new Date(year, new Date().getMonth() + 1, 0);

    const count = await this.invoiceRepository.count({
      where: {
        tenantId,
        createdAt: Between(startOfMonth, endOfMonth),
      },
    });

    const sequence = String(count + 1).padStart(4, '0');
    return `INV-${year}${month}-${sequence}`;
  }

  /**
   * Calculate invoice totals
   */
  private calculateTotals(data: CreateInvoiceData) {
    const subtotal =
      (data.tuitionAmount || 0) +
      (data.mealFeeAmount || 0) +
      (data.activityFeeAmount || 0) +
      (data.otherCharges || 0);

    const totalAmount =
      subtotal -
      (data.discount || 0) -
      (data.subsidy || 0);

    return {
      subtotal,
      totalAmount,
      balanceRemaining: totalAmount,
    };
  }

  /**
   * Create a new invoice
   */
  async createInvoice(data: CreateInvoiceData): Promise<Invoice> {
    // Verify child exists
    const child = await this.childRepository.findOne({
      where: {
        id: data.childId,
        tenantId: data.tenantId,
      },
    });

    if (!child) {
      throw new Error('Child not found');
    }

    // Generate invoice number
    const invoiceNumber = await this.generateInvoiceNumber(data.tenantId);

    // Calculate totals
    const { subtotal, totalAmount, balanceRemaining } = this.calculateTotals(data);

    // Set due date (default: 7 days from now)
    const dueDate = data.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invoice = this.invoiceRepository.create({
      ...data,
      invoiceNumber,
      invoiceDate: new Date(),
      dueDate,
      subtotal,
      totalAmount,
      balanceRemaining,
      amountPaid: 0,
      status: 'pending',
      mealFeeAmount: data.mealFeeAmount || 0,
      activityFeeAmount: data.activityFeeAmount || 0,
      otherCharges: data.otherCharges || 0,
      discount: data.discount || 0,
      subsidy: data.subsidy || 0,
      lateFee: 0,
    });

    return await this.invoiceRepository.save(invoice);
  }

  /**
   * Get invoice by ID
   */
  async getInvoiceById(id: string, tenantId: string): Promise<Invoice | null> {
    return await this.invoiceRepository.findOne({
      where: { id, tenantId },
      relations: ['child', 'payments'],
    });
  }

  /**
   * Get invoice by invoice number
   */
  async getInvoiceByNumber(invoiceNumber: string, tenantId: string): Promise<Invoice | null> {
    return await this.invoiceRepository.findOne({
      where: { invoiceNumber, tenantId },
      relations: ['child', 'payments'],
    });
  }

  /**
   * Get all invoices for a tenant
   */
  async getInvoices(
    tenantId: string,
    filters?: {
      centerId?: string;
      childId?: string;
      status?: string;
      month?: number;
      year?: number;
      page?: number;
      limit?: number;
    }
  ) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (filters?.centerId) where.centerId = filters.centerId;
    if (filters?.childId) where.childId = filters.childId;
    if (filters?.status) where.status = filters.status;
    if (filters?.month) where.month = filters.month;
    if (filters?.year) where.year = filters.year;

    const [invoices, total] = await this.invoiceRepository.findAndCount({
      where,
      relations: ['child', 'payments'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      invoices,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get invoices for a specific child
   */
  async getChildInvoices(childId: string, tenantId: string) {
    return await this.invoiceRepository.find({
      where: { childId, tenantId },
      relations: ['payments'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get overdue invoices
   */
  async getOverdueInvoices(tenantId: string, centerId?: string) {
    const where: any = {
      tenantId,
      dueDate: LessThanOrEqual(new Date()),
      status: 'pending',
    };

    if (centerId) where.centerId = centerId;

    return await this.invoiceRepository.find({
      where,
      relations: ['child'],
      order: { dueDate: 'ASC' },
    });
  }

  /**
   * Get pending invoices
   */
  async getPendingInvoices(tenantId: string, centerId?: string) {
    const where: any = {
      tenantId,
      status: 'pending',
    };

    if (centerId) where.centerId = centerId;

    return await this.invoiceRepository.find({
      where,
      relations: ['child'],
      order: { dueDate: 'ASC' },
    });
  }

  /**
   * Update invoice
   */
  async updateInvoice(
    id: string,
    tenantId: string,
    data: UpdateInvoiceData
  ): Promise<Invoice> {
    const invoice = await this.getInvoiceById(id, tenantId);

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    Object.assign(invoice, data);

    return await this.invoiceRepository.save(invoice);
  }

  /**
   * Record a payment and update invoice
   */
  async recordPayment(
    invoiceId: string,
    tenantId: string,
    amount: number
  ): Promise<Invoice> {
    const invoice = await this.getInvoiceById(invoiceId, tenantId);

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    invoice.amountPaid += amount;
    invoice.balanceRemaining = invoice.totalAmount - invoice.amountPaid;

    // Update status
    if (invoice.balanceRemaining <= 0) {
      invoice.status = 'paid';
      invoice.paidDate = new Date();
    } else if (invoice.amountPaid > 0) {
      invoice.status = 'partial';
    }

    return await this.invoiceRepository.save(invoice);
  }

  /**
   * Add late fee to invoice
   */
  async addLateFee(
    id: string,
    tenantId: string,
    lateFeeAmount: number
  ): Promise<Invoice> {
    const invoice = await this.getInvoiceById(id, tenantId);

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    invoice.lateFee += lateFeeAmount;
    invoice.totalAmount += lateFeeAmount;
    invoice.balanceRemaining += lateFeeAmount;

    if (invoice.status === 'pending') {
      invoice.status = 'overdue';
    }

    return await this.invoiceRepository.save(invoice);
  }

  /**
   * Cancel invoice
   */
  async cancelInvoice(id: string, tenantId: string): Promise<Invoice> {
    const invoice = await this.getInvoiceById(id, tenantId);

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.amountPaid > 0) {
      throw new Error('Cannot cancel invoice with payments. Please refund first.');
    }

    invoice.status = 'cancelled';

    return await this.invoiceRepository.save(invoice);
  }

  /**
   * Get invoice statistics
   */
  async getInvoiceStats(tenantId: string, centerId?: string) {
    const where: any = { tenantId };
    if (centerId) where.centerId = centerId;

    const [total, pending, paid, overdue, partial] = await Promise.all([
      this.invoiceRepository.count({ where }),
      this.invoiceRepository.count({ where: { ...where, status: 'pending' } }),
      this.invoiceRepository.count({ where: { ...where, status: 'paid' } }),
      this.invoiceRepository.count({ where: { ...where, status: 'overdue' } }),
      this.invoiceRepository.count({ where: { ...where, status: 'partial' } }),
    ]);

    const totalRevenue = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .select('SUM(invoice.totalAmount)', 'sum')
      .where('invoice.tenantId = :tenantId', { tenantId })
      .andWhere(centerId ? 'invoice.centerId = :centerId' : '1=1', { centerId })
      .getRawOne();

    const collectedRevenue = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .select('SUM(invoice.amountPaid)', 'sum')
      .where('invoice.tenantId = :tenantId', { tenantId })
      .andWhere(centerId ? 'invoice.centerId = :centerId' : '1=1', { centerId })
      .getRawOne();

    const outstandingRevenue = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .select('SUM(invoice.balanceRemaining)', 'sum')
      .where('invoice.tenantId = :tenantId', { tenantId })
      .andWhere(centerId ? 'invoice.centerId = :centerId' : '1=1', { centerId })
      .getRawOne();

    return {
      total,
      pending,
      paid,
      overdue,
      partial,
      totalRevenue: parseFloat(totalRevenue?.sum || 0),
      collectedRevenue: parseFloat(collectedRevenue?.sum || 0),
      outstandingRevenue: parseFloat(outstandingRevenue?.sum || 0),
    };
  }

  /**
   * Delete invoice (soft delete)
   */
  async deleteInvoice(id: string, tenantId: string): Promise<void> {
    const invoice = await this.getInvoiceById(id, tenantId);

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.amountPaid > 0) {
      throw new Error('Cannot delete invoice with payments');
    }

    invoice.deletedAt = new Date();
    await this.invoiceRepository.save(invoice);
  }
}

export const invoiceService = new InvoiceService();
