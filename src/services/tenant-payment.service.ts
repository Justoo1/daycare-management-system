import { AppDataSource } from '../config/database';
import { Tenant } from '../models/Tenant';
import { paystackService } from './paystack.service';

export interface SetupPaymentSettingsData {
  tenantId: string;
  bankCode: string;
  accountNumber: string;
  platformFeePercentage?: number;
}

export interface BankDetails {
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
}

export class TenantPaymentService {
  private tenantRepository = AppDataSource.getRepository(Tenant);

  /**
   * Get list of supported banks
   */
  async getSupportedBanks() {
    const response = await paystackService.getBanks('ghana');
    return response.data;
  }

  /**
   * Verify bank account details
   */
  async verifyBankAccount(accountNumber: string, bankCode: string): Promise<{
    accountNumber: string;
    accountName: string;
    bankId: number;
  }> {
    const response = await paystackService.resolveAccountNumber(accountNumber, bankCode);
    // Paystack returns snake_case, map to camelCase
    return {
      accountNumber: response.data.account_number,
      accountName: response.data.account_name,
      bankId: response.data.bank_id,
    };
  }

  /**
   * Setup payment settings for a tenant (create Paystack subaccount)
   */
  async setupPaymentSettings(data: SetupPaymentSettingsData): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({
      where: { id: data.tenantId },
    });

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    // First verify the bank account
    const accountVerification = await this.verifyBankAccount(
      data.accountNumber,
      data.bankCode
    );

    // Get bank name
    const banks = await this.getSupportedBanks();
    const bank = banks.find((b: any) => b.code === data.bankCode);
    const bankName = bank?.name || 'Test Bank';

    // Platform fee percentage
    const platformFee = data.platformFeePercentage ?? 2.5; // Default 2.5% platform fee

    // Check if using test bank (code 001) - skip actual Paystack subaccount creation
    const isTestBank = data.bankCode === '001';
    let subaccountCode: string;

    if (isTestBank) {
      // For test mode, generate a mock subaccount code
      subaccountCode = `TEST_ACCT_${tenant.id.slice(0, 8)}`;
      console.log('Test mode: Skipping Paystack subaccount creation, using mock code:', subaccountCode);
    } else {
      // Create real Paystack subaccount
      const subaccountResponse = await paystackService.createSubaccount({
        business_name: tenant.name,
        bank_code: data.bankCode,
        account_number: data.accountNumber,
        percentage_charge: platformFee,
        description: `Payment subaccount for ${tenant.name}`,
        primary_contact_email: tenant.contactEmail || undefined,
        primary_contact_phone: tenant.contactPhone || undefined,
        metadata: {
          tenantId: tenant.id,
          tenantSlug: tenant.slug,
        },
      });
      subaccountCode = subaccountResponse.data.subaccount_code;
    }

    // Update tenant with payment settings
    tenant.bankCode = data.bankCode;
    tenant.bankName = bankName;
    tenant.accountNumber = data.accountNumber;
    tenant.accountName = accountVerification.accountName;
    tenant.paystackSubaccountCode = subaccountCode;
    tenant.platformFeePercentage = platformFee;
    tenant.paymentSettingsVerified = !isTestBank; // Mark as unverified for test bank

    await this.tenantRepository.save(tenant);

    return tenant;
  }

  /**
   * Update payment settings for a tenant
   */
  async updatePaymentSettings(
    tenantId: string,
    data: {
      bankCode?: string;
      accountNumber?: string;
      platformFeePercentage?: number;
    }
  ): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    // If bank details are being updated
    if (data.bankCode && data.accountNumber) {
      // Verify the new bank account
      const accountVerification = await this.verifyBankAccount(
        data.accountNumber,
        data.bankCode
      );

      // Get bank name
      const banks = await this.getSupportedBanks();
      const bank = banks.find((b: any) => b.code === data.bankCode);
      const bankName = bank?.name || 'Test Bank';

      // Check if using test bank (code 001)
      const isTestBank = data.bankCode === '001';
      const isTestSubaccount = tenant.paystackSubaccountCode?.startsWith('TEST_ACCT_');

      if (isTestBank) {
        // For test mode, generate/update mock subaccount code
        tenant.paystackSubaccountCode = `TEST_ACCT_${tenant.id.slice(0, 8)}`;
        console.log('Test mode: Using mock subaccount code:', tenant.paystackSubaccountCode);
      } else if (tenant.paystackSubaccountCode && !isTestSubaccount) {
        // Update real Paystack subaccount
        await paystackService.updateSubaccount(tenant.paystackSubaccountCode, {
          bank_code: data.bankCode,
          account_number: data.accountNumber,
          percentage_charge: data.platformFeePercentage,
        });
      } else {
        // Create new real subaccount
        const platformFee = data.platformFeePercentage ?? tenant.platformFeePercentage ?? 2.5;

        const subaccountResponse = await paystackService.createSubaccount({
          business_name: tenant.name,
          bank_code: data.bankCode,
          account_number: data.accountNumber,
          percentage_charge: platformFee,
          description: `Payment subaccount for ${tenant.name}`,
          primary_contact_email: tenant.contactEmail || undefined,
          primary_contact_phone: tenant.contactPhone || undefined,
          metadata: {
            tenantId: tenant.id,
            tenantSlug: tenant.slug,
          },
        });

        tenant.paystackSubaccountCode = subaccountResponse.data.subaccount_code;
      }

      tenant.bankCode = data.bankCode;
      tenant.bankName = bankName;
      tenant.accountNumber = data.accountNumber;
      tenant.accountName = accountVerification.accountName;
      tenant.paymentSettingsVerified = !isTestBank;
    }

    // Update platform fee if provided
    if (data.platformFeePercentage !== undefined) {
      tenant.platformFeePercentage = data.platformFeePercentage;

      // Update in Paystack (skip for test subaccounts)
      const isTestSubaccount = tenant.paystackSubaccountCode?.startsWith('TEST_ACCT_');
      if (tenant.paystackSubaccountCode && !isTestSubaccount) {
        await paystackService.updateSubaccount(tenant.paystackSubaccountCode, {
          percentage_charge: data.platformFeePercentage,
        });
      }
    }

    await this.tenantRepository.save(tenant);

    return tenant;
  }

  /**
   * Get payment settings for a tenant
   */
  async getPaymentSettings(tenantId: string): Promise<{
    isConfigured: boolean;
    bankName: string | null;
    bankCode: string | null;
    accountNumber: string | null;
    accountName: string | null;
    platformFeePercentage: number;
    paymentSettingsVerified: boolean;
    subaccountCode: string | null;
  }> {
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    return {
      isConfigured: !!tenant.paystackSubaccountCode,
      bankName: tenant.bankName,
      bankCode: tenant.bankCode,
      accountNumber: tenant.accountNumber ? this.maskAccountNumber(tenant.accountNumber) : null,
      accountName: tenant.accountName,
      platformFeePercentage: Number(tenant.platformFeePercentage) || 2.5,
      paymentSettingsVerified: tenant.paymentSettingsVerified,
      subaccountCode: tenant.paystackSubaccountCode,
    };
  }

  /**
   * Get subaccount code for a tenant
   */
  async getSubaccountCode(tenantId: string): Promise<string | null> {
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
      select: ['id', 'paystackSubaccountCode'],
    });

    return tenant?.paystackSubaccountCode || null;
  }

  /**
   * Mask account number for display
   */
  private maskAccountNumber(accountNumber: string): string {
    if (accountNumber.length <= 4) return accountNumber;
    const lastFour = accountNumber.slice(-4);
    return '*'.repeat(accountNumber.length - 4) + lastFour;
  }
}

export const tenantPaymentService = new TenantPaymentService();
