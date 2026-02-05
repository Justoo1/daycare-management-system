import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';

export interface PaystackInitializePaymentData {
  email: string;
  amount: number; // Amount in kobo (GHS * 100)
  reference?: string;
  currency?: string;
  metadata?: Record<string, any>;
  channels?: string[];
  callback_url?: string;
}

export interface PaystackVerifyPaymentResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    domain: string;
    status: string;
    reference: string;
    amount: number;
    message: string;
    gateway_response: string;
    paid_at: string;
    created_at: string;
    channel: string;
    currency: string;
    ip_address: string;
    metadata: Record<string, any>;
    fees: number;
    customer: {
      id: number;
      email: string;
      customer_code: string;
    };
    authorization: {
      authorization_code: string;
      bin: string;
      last4: string;
      exp_month: string;
      exp_year: string;
      channel: string;
      card_type: string;
      bank: string;
      country_code: string;
      brand: string;
      reusable: boolean;
    };
  };
}

export class PaystackService {
  private client: AxiosInstance;
  private secretKey: string;
  private publicKey: string;

  constructor() {
    this.secretKey = process.env.PAYSTACK_SECRET_KEY || '';
    this.publicKey = process.env.PAYSTACK_PUBLIC_KEY || '';

    if (!this.secretKey) {
      console.warn('PAYSTACK_SECRET_KEY not set. Payment features will not work.');
    }

    this.client = axios.create({
      baseURL: 'https://api.paystack.co',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  /**
   * Check if Paystack is configured
   */
  isConfigured(): boolean {
    return !!this.secretKey && !!this.publicKey;
  }

  /**
   * Get public key for frontend
   */
  getPublicKey(): string {
    return this.publicKey;
  }

  /**
   * Initialize a payment transaction
   */
  async initializePayment(data: PaystackInitializePaymentData) {
    try {
      const response = await this.client.post('/transaction/initialize', {
        email: data.email,
        amount: Math.round(data.amount), // Ensure it's an integer (kobo)
        reference: data.reference || this.generateReference(),
        currency: data.currency || 'GHS',
        metadata: data.metadata || {},
        channels: data.channels || ['card', 'mobile_money', 'bank'],
        callback_url: data.callback_url,
      });

      return response.data;
    } catch (error: any) {
      console.error('Paystack initialize payment error:', error.response?.data || error.message);
      throw new Error(
        error.response?.data?.message || 'Failed to initialize payment'
      );
    }
  }

  /**
   * Verify a payment transaction
   */
  async verifyPayment(reference: string): Promise<PaystackVerifyPaymentResponse> {
    try {
      const response = await this.client.get(`/transaction/verify/${reference}`);
      return response.data;
    } catch (error: any) {
      console.error('Paystack verify payment error:', error.response?.data || error.message);
      throw new Error(
        error.response?.data?.message || 'Failed to verify payment'
      );
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    const hash = crypto
      .createHmac('sha512', this.secretKey)
      .update(payload)
      .digest('hex');
    return hash === signature;
  }

  /**
   * Generate a unique payment reference
   */
  generateReference(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    return `NKB_${timestamp}_${random}`.toUpperCase();
  }

  /**
   * Convert GHS to kobo (smallest currency unit)
   */
  convertToKobo(amount: number): number {
    return Math.round(amount * 100);
  }

  /**
   * Convert kobo to GHS
   */
  convertFromKobo(kobo: number): number {
    return kobo / 100;
  }

  /**
   * Charge a mobile money account
   */
  async chargeMobileMoney(data: {
    email: string;
    amount: number;
    phone: string;
    provider: 'mtn' | 'vodafone' | 'airteltigo';
    reference?: string;
    metadata?: Record<string, any>;
  }) {
    try {
      const response = await this.client.post('/charge', {
        email: data.email,
        amount: Math.round(data.amount),
        mobile_money: {
          phone: data.phone,
          provider: data.provider,
        },
        reference: data.reference || this.generateReference(),
        metadata: data.metadata || {},
      });

      return response.data;
    } catch (error: any) {
      console.error('Paystack mobile money charge error:', error.response?.data || error.message);
      throw new Error(
        error.response?.data?.message || 'Failed to charge mobile money'
      );
    }
  }

  /**
   * Get all supported banks (for bank transfer)
   */
  async getBanks(country: string = 'ghana') {
    try {
      const response = await this.client.get('/bank', {
        params: { country },
      });
      return response.data;
    } catch (error: any) {
      console.error('Paystack get banks error:', error.response?.data || error.message);
      throw new Error(
        error.response?.data?.message || 'Failed to get banks'
      );
    }
  }

  /**
   * Refund a transaction
   */
  async refundTransaction(reference: string, amount?: number) {
    try {
      const response = await this.client.post('/refund', {
        transaction: reference,
        amount: amount ? Math.round(amount) : undefined,
      });

      return response.data;
    } catch (error: any) {
      console.error('Paystack refund error:', error.response?.data || error.message);
      throw new Error(
        error.response?.data?.message || 'Failed to refund transaction'
      );
    }
  }

  /**
   * Get transaction details
   */
  async getTransaction(id: string) {
    try {
      const response = await this.client.get(`/transaction/${id}`);
      return response.data;
    } catch (error: any) {
      console.error('Paystack get transaction error:', error.response?.data || error.message);
      throw new Error(
        error.response?.data?.message || 'Failed to get transaction'
      );
    }
  }

  /**
   * List transactions
   */
  async listTransactions(params?: {
    perPage?: number;
    page?: number;
    customer?: string;
    status?: string;
    from?: string;
    to?: string;
  }) {
    try {
      const response = await this.client.get('/transaction', {
        params,
      });
      return response.data;
    } catch (error: any) {
      console.error('Paystack list transactions error:', error.response?.data || error.message);
      throw new Error(
        error.response?.data?.message || 'Failed to list transactions'
      );
    }
  }

  // ==================== SUBACCOUNT METHODS ====================

  /**
   * Create a subaccount for a business/school to receive payments
   */
  async createSubaccount(data: {
    business_name: string;
    bank_code: string;
    account_number: string;
    percentage_charge: number; // Platform fee percentage
    description?: string;
    primary_contact_email?: string;
    primary_contact_name?: string;
    primary_contact_phone?: string;
    metadata?: Record<string, any>;
  }) {
    try {
      const response = await this.client.post('/subaccount', {
        business_name: data.business_name,
        bank_code: data.bank_code,
        account_number: data.account_number,
        percentage_charge: data.percentage_charge,
        description: data.description,
        primary_contact_email: data.primary_contact_email,
        primary_contact_name: data.primary_contact_name,
        primary_contact_phone: data.primary_contact_phone,
        metadata: data.metadata || {},
      });

      return response.data;
    } catch (error: any) {
      console.error('Paystack create subaccount error:', error.response?.data || error.message);
      throw new Error(
        error.response?.data?.message || 'Failed to create subaccount'
      );
    }
  }

  /**
   * Get a subaccount by code
   */
  async getSubaccount(subaccountCode: string) {
    try {
      const response = await this.client.get(`/subaccount/${subaccountCode}`);
      return response.data;
    } catch (error: any) {
      console.error('Paystack get subaccount error:', error.response?.data || error.message);
      throw new Error(
        error.response?.data?.message || 'Failed to get subaccount'
      );
    }
  }

  /**
   * Update a subaccount
   */
  async updateSubaccount(subaccountCode: string, data: {
    business_name?: string;
    bank_code?: string;
    account_number?: string;
    percentage_charge?: number;
    description?: string;
    primary_contact_email?: string;
    primary_contact_name?: string;
    primary_contact_phone?: string;
  }) {
    try {
      const response = await this.client.put(`/subaccount/${subaccountCode}`, data);
      return response.data;
    } catch (error: any) {
      console.error('Paystack update subaccount error:', error.response?.data || error.message);
      throw new Error(
        error.response?.data?.message || 'Failed to update subaccount'
      );
    }
  }

  /**
   * List all subaccounts
   */
  async listSubaccounts(params?: { perPage?: number; page?: number }) {
    try {
      const response = await this.client.get('/subaccount', { params });
      return response.data;
    } catch (error: any) {
      console.error('Paystack list subaccounts error:', error.response?.data || error.message);
      throw new Error(
        error.response?.data?.message || 'Failed to list subaccounts'
      );
    }
  }

  /**
   * Resolve account number - verify bank account details
   */
  async resolveAccountNumber(accountNumber: string, bankCode: string) {
    try {
      const response = await this.client.get('/bank/resolve', {
        params: {
          account_number: accountNumber,
          bank_code: bankCode,
        },
      });
      return response.data;
    } catch (error: any) {
      console.error('Paystack resolve account error:', error.response?.data || error.message);
      throw new Error(
        error.response?.data?.message || 'Failed to resolve account number'
      );
    }
  }

  /**
   * Initialize payment with split (subaccount)
   */
  async initializePaymentWithSplit(data: PaystackInitializePaymentData & {
    subaccount: string; // Subaccount code
    bearer?: 'subaccount' | 'account'; // Who bears the Paystack charges
    transaction_charge?: number; // Flat fee to charge (in kobo)
  }) {
    try {
      const response = await this.client.post('/transaction/initialize', {
        email: data.email,
        amount: Math.round(data.amount),
        reference: data.reference || this.generateReference(),
        currency: data.currency || 'GHS',
        metadata: data.metadata || {},
        channels: data.channels || ['card', 'mobile_money', 'bank'],
        callback_url: data.callback_url,
        subaccount: data.subaccount,
        bearer: data.bearer || 'account', // Platform bears the charges by default
        transaction_charge: data.transaction_charge,
      });

      return response.data;
    } catch (error: any) {
      console.error('Paystack initialize split payment error:', error.response?.data || error.message);
      throw new Error(
        error.response?.data?.message || 'Failed to initialize payment'
      );
    }
  }
}

// Export singleton instance
export const paystackService = new PaystackService();
