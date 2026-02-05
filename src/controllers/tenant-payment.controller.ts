import { FastifyRequest, FastifyReply } from 'fastify';
import { tenantPaymentService } from '../services/tenant-payment.service';
import { paystackService } from '../services/paystack.service';

interface AuthenticatedRequest extends FastifyRequest {
  tenant: {
    tenantId: string;
    userId: string;
    centerId: string;
    role: string;
    email: string;
  };
}

class TenantPaymentController {
  /**
   * Get list of supported banks
   * GET /api/tenant-payment/banks
   */
  async getSupportedBanks(request: AuthenticatedRequest, reply: FastifyReply) {
    try {
      const banks = await tenantPaymentService.getSupportedBanks();

      return reply.status(200).send({
        success: true,
        data: banks,
        message: 'Banks retrieved successfully',
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to get banks',
      });
    }
  }

  /**
   * Verify bank account
   * POST /api/tenant-payment/verify-account
   */
  async verifyBankAccount(request: AuthenticatedRequest, reply: FastifyReply) {
    try {
      const { accountNumber, bankCode } = request.body as {
        accountNumber: string;
        bankCode: string;
      };

      if (!accountNumber || !bankCode) {
        return reply.status(400).send({
          success: false,
          error: 'Account number and bank code are required',
        });
      }

      const result = await tenantPaymentService.verifyBankAccount(
        accountNumber,
        bankCode
      );

      return reply.status(200).send({
        success: true,
        data: result,
        message: 'Account verified successfully',
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        error: error.message || 'Failed to verify account',
      });
    }
  }

  /**
   * Setup payment settings (create subaccount)
   * POST /api/tenant-payment/setup
   */
  async setupPaymentSettings(request: AuthenticatedRequest, reply: FastifyReply) {
    try {
      const { tenantId } = request.tenant;
      const { bankCode, accountNumber, platformFeePercentage } = request.body as {
        bankCode: string;
        accountNumber: string;
        platformFeePercentage?: number;
      };

      if (!bankCode || !accountNumber) {
        return reply.status(400).send({
          success: false,
          error: 'Bank code and account number are required',
        });
      }

      const tenant = await tenantPaymentService.setupPaymentSettings({
        tenantId,
        bankCode,
        accountNumber,
        platformFeePercentage,
      });

      return reply.status(200).send({
        success: true,
        data: {
          bankName: tenant.bankName,
          accountName: tenant.accountName,
          isConfigured: true,
          platformFeePercentage: tenant.platformFeePercentage,
        },
        message: 'Payment settings configured successfully. You can now receive payments.',
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        error: error.message || 'Failed to setup payment settings',
      });
    }
  }

  /**
   * Update payment settings
   * PUT /api/tenant-payment/settings
   */
  async updatePaymentSettings(request: AuthenticatedRequest, reply: FastifyReply) {
    try {
      const { tenantId } = request.tenant;
      const { bankCode, accountNumber, platformFeePercentage } = request.body as {
        bankCode?: string;
        accountNumber?: string;
        platformFeePercentage?: number;
      };

      const tenant = await tenantPaymentService.updatePaymentSettings(tenantId, {
        bankCode,
        accountNumber,
        platformFeePercentage,
      });

      return reply.status(200).send({
        success: true,
        data: {
          bankName: tenant.bankName,
          accountName: tenant.accountName,
          isConfigured: !!tenant.paystackSubaccountCode,
          platformFeePercentage: tenant.platformFeePercentage,
        },
        message: 'Payment settings updated successfully',
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        error: error.message || 'Failed to update payment settings',
      });
    }
  }

  /**
   * Get payment settings
   * GET /api/tenant-payment/settings
   */
  async getPaymentSettings(request: AuthenticatedRequest, reply: FastifyReply) {
    try {
      const { tenantId } = request.tenant;

      const settings = await tenantPaymentService.getPaymentSettings(tenantId);

      return reply.status(200).send({
        success: true,
        data: settings,
        message: 'Payment settings retrieved successfully',
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to get payment settings',
      });
    }
  }

  /**
   * Check if Paystack is configured for the platform
   * GET /api/tenant-payment/platform-status
   */
  async getPlatformPaymentStatus(request: AuthenticatedRequest, reply: FastifyReply) {
    try {
      const isConfigured = paystackService.isConfigured();

      return reply.status(200).send({
        success: true,
        data: {
          isConfigured,
          publicKey: isConfigured ? paystackService.getPublicKey() : null,
        },
        message: 'Platform payment status retrieved',
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to get platform payment status',
      });
    }
  }
}

export const tenantPaymentController = new TenantPaymentController();
