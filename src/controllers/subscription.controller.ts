import { FastifyRequest, FastifyReply } from 'fastify';
import { subscriptionService } from '../services/subscription.service';
import { SUBSCRIPTION_PLANS } from '../config/subscriptionPlans';

export class SubscriptionController {
  /**
   * Get all available subscription plans
   * GET /api/subscriptions/plans
   */
  async getPlans(request: FastifyRequest, reply: FastifyReply) {
    try {
      return reply.send({
        success: true,
        data: Object.values(SUBSCRIPTION_PLANS),
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Failed to fetch plans',
      });
    }
  }

  /**
   * Get current subscription for authenticated tenant
   * GET /api/subscriptions/current
   */
  async getCurrentSubscription(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { tenantId } = request.user as any;

      const subscription = await subscriptionService.getCurrentSubscription(tenantId);

      if (!subscription) {
        return reply.status(404).send({
          success: false,
          message: 'No active subscription found',
        });
      }

      // Get usage stats
      const usageStats = await subscriptionService.getUsageStats(tenantId);

      // Calculate stats
      const stats = {
        daysRemaining: subscription.getDaysRemaining(),
        isExpiringSoon: subscription.isExpiringSoon(),
        isInTrial: subscription.isInTrial(),
        usageStats,
      };

      return reply.send({
        success: true,
        data: {
          subscription,
          stats,
        },
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Failed to fetch subscription',
      });
    }
  }

  /**
   * Get subscription history
   * GET /api/subscriptions/history
   */
  async getSubscriptionHistory(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { tenantId } = request.user as any;

      const subscriptions = await subscriptionService.getSubscriptionHistory(tenantId);

      return reply.send({
        success: true,
        data: subscriptions,
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Failed to fetch subscription history',
      });
    }
  }

  /**
   * Upgrade subscription from trial to paid plan
   * POST /api/subscriptions/upgrade
   */
  async upgradeSubscription(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { tenantId } = request.user as any;
      const { planType, billingCycle, autoRenew } = request.body as {
        planType: 'basic' | 'standard' | 'premium';
        billingCycle: 'monthly' | 'quarterly' | 'yearly';
        autoRenew?: boolean;
      };

      if (!planType || !billingCycle) {
        return reply.status(400).send({
          success: false,
          message: 'Plan type and billing cycle are required',
        });
      }

      if (!['basic', 'standard', 'premium'].includes(planType)) {
        return reply.status(400).send({
          success: false,
          message: 'Invalid plan type',
        });
      }

      if (!['monthly', 'quarterly', 'yearly'].includes(billingCycle)) {
        return reply.status(400).send({
          success: false,
          message: 'Invalid billing cycle',
        });
      }

      const subscription = await subscriptionService.upgradeSubscription(tenantId, {
        planType,
        billingCycle,
        autoRenew,
        tenantId,
      });

      return reply.status(201).send({
        success: true,
        message: 'Subscription upgraded successfully',
        data: subscription,
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Failed to upgrade subscription',
      });
    }
  }

  /**
   * Renew subscription
   * POST /api/subscriptions/renew
   */
  async renewSubscription(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { tenantId } = request.user as any;

      const subscription = await subscriptionService.renewSubscription(tenantId);

      return reply.send({
        success: true,
        message: 'Subscription renewed successfully',
        data: subscription,
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Failed to renew subscription',
      });
    }
  }

  /**
   * Cancel subscription
   * POST /api/subscriptions/cancel
   */
  async cancelSubscription(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { tenantId } = request.user as any;
      const { reason } = request.body as { reason?: string };

      const subscription = await subscriptionService.cancelSubscription(
        tenantId,
        reason
      );

      return reply.send({
        success: true,
        message: 'Subscription cancelled successfully',
        data: subscription,
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Failed to cancel subscription',
      });
    }
  }

  /**
   * Update auto-renew setting
   * PUT /api/subscriptions/auto-renew
   */
  async updateAutoRenew(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { tenantId } = request.user as any;
      const { autoRenew } = request.body as { autoRenew: boolean };

      if (typeof autoRenew !== 'boolean') {
        return reply.status(400).send({
          success: false,
          message: 'Auto-renew must be a boolean value',
        });
      }

      const subscription = await subscriptionService.updateAutoRenew(
        tenantId,
        autoRenew
      );

      return reply.send({
        success: true,
        message: 'Auto-renew setting updated successfully',
        data: subscription,
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Failed to update auto-renew',
      });
    }
  }

  /**
   * Check if subscription is valid
   * GET /api/subscriptions/validate
   */
  async validateSubscription(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { tenantId } = request.user as any;

      const isValid = await subscriptionService.isSubscriptionValid(tenantId);

      return reply.send({
        success: true,
        data: {
          isValid,
        },
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Failed to validate subscription',
      });
    }
  }

  /**
   * Get subscription statistics (Admin only)
   * GET /api/subscriptions/stats
   */
  async getSubscriptionStats(request: FastifyRequest, reply: FastifyReply) {
    try {
      const stats = await subscriptionService.getSubscriptionStats();

      return reply.send({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Failed to fetch subscription stats',
      });
    }
  }

  /**
   * Get expiring subscriptions (Admin only)
   * GET /api/subscriptions/expiring
   */
  async getExpiringSubscriptions(request: FastifyRequest, reply: FastifyReply) {
    try {
      const subscriptions = await subscriptionService.getExpiringSubscriptions();

      return reply.send({
        success: true,
        data: subscriptions,
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Failed to fetch expiring subscriptions',
      });
    }
  }

  /**
   * Create trial subscription for current tenant (one-time fix for existing tenants)
   * POST /api/subscriptions/create-trial
   */
  async createTrialForExistingTenant(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { tenantId } = request.user as any;

      // Check if subscription already exists
      const existing = await subscriptionService.getCurrentSubscription(tenantId);
      if (existing) {
        return reply.status(400).send({
          success: false,
          message: 'Subscription already exists for this tenant',
        });
      }

      const subscription = await subscriptionService.createTrialSubscription(tenantId);

      return reply.status(201).send({
        success: true,
        message: 'Trial subscription created successfully',
        data: subscription,
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Failed to create trial subscription',
      });
    }
  }

  /**
   * Debug endpoint to check all subscriptions for current tenant
   * GET /api/subscriptions/debug
   */
  async debugSubscriptions(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { tenantId } = request.user as any;

      const allSubscriptions = await subscriptionService.getSubscriptionHistory(tenantId);

      return reply.send({
        success: true,
        data: {
          tenantId,
          count: allSubscriptions.length,
          subscriptions: allSubscriptions,
        },
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Failed to debug subscriptions',
      });
    }
  }
}

export const subscriptionController = new SubscriptionController();
