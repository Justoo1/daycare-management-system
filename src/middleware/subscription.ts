import { FastifyRequest, FastifyReply } from 'fastify';
import { subscriptionService } from '../services/subscription.service';

/**
 * Middleware to check if tenant has a valid subscription
 * This should be applied to protected routes that require an active subscription
 */
export async function requireActiveSubscription(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const { tenantId } = request.user as any;

    if (!tenantId) {
      return reply.status(401).send({
        success: false,
        error: 'Unauthorized - No tenant context',
      });
    }

    // Check if subscription is valid
    const isValid = await subscriptionService.isSubscriptionValid(tenantId);

    if (!isValid) {
      const subscription = await subscriptionService.getCurrentSubscription(tenantId);

      let message = 'Your subscription has expired. Please renew to continue.';
      let subscriptionStatus = 'expired';

      if (subscription) {
        if (subscription.status === 'suspended') {
          message = 'Your subscription has been suspended. Please contact support.';
          subscriptionStatus = 'suspended';
        } else if (subscription.status === 'cancelled') {
          message = 'Your subscription has been cancelled. Please subscribe to continue.';
          subscriptionStatus = 'cancelled';
        }
      } else {
        message = 'No active subscription found. Please subscribe to continue.';
        subscriptionStatus = 'none';
      }

      return reply.status(403).send({
        success: false,
        error: message,
        subscriptionStatus,
        requiresUpgrade: true,
      });
    }

    // Subscription is valid, continue to the next handler
  } catch (error: any) {
    console.error('Subscription validation error:', error);
    return reply.status(500).send({
      success: false,
      error: 'Failed to validate subscription',
    });
  }
}

/**
 * Middleware to check feature access based on subscription plan
 */
export function requireFeature(feature: keyof {
  hasMessaging: boolean;
  hasReports: boolean;
  hasAnalytics: boolean;
  hasApiAccess: boolean;
}) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { tenantId } = request.user as any;

      if (!tenantId) {
        return reply.status(401).send({
          success: false,
          error: 'Unauthorized',
        });
      }

      const subscription = await subscriptionService.getCurrentSubscription(tenantId);

      if (!subscription) {
        return reply.status(403).send({
          success: false,
          error: 'No active subscription found',
          requiresUpgrade: true,
        });
      }

      // Check if the subscription has access to this feature
      if (!subscription[feature]) {
        return reply.status(403).send({
          success: false,
          error: `This feature requires a subscription upgrade`,
          feature,
          requiresUpgrade: true,
        });
      }

      // Feature access granted, continue
    } catch (error: any) {
      console.error('Feature validation error:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to validate feature access',
      });
    }
  };
}

/**
 * Middleware to check resource limits (children, staff, centers)
 */
export async function checkResourceLimit(
  request: FastifyRequest,
  reply: FastifyReply,
  resourceType: 'children' | 'staff' | 'centers',
  currentCount: number
) {
  try {
    const { tenantId } = request.user as any;

    const subscription = await subscriptionService.getCurrentSubscription(tenantId);

    if (!subscription) {
      return reply.status(403).send({
        success: false,
        error: 'No active subscription found',
        requiresUpgrade: true,
      });
    }

    let limit: number | null = null;

    switch (resourceType) {
      case 'children':
        limit = subscription.maxChildren;
        break;
      case 'staff':
        limit = subscription.maxStaff;
        break;
      case 'centers':
        limit = subscription.maxCenters;
        break;
    }

    // null means unlimited
    if (limit === null) {
      return; // Allow
    }

    if (currentCount >= limit) {
      return reply.status(403).send({
        success: false,
        error: `You have reached your ${resourceType} limit (${limit}). Please upgrade your subscription.`,
        limit,
        current: currentCount,
        requiresUpgrade: true,
      });
    }

    // Limit not reached, continue
  } catch (error: any) {
    console.error('Resource limit check error:', error);
    return reply.status(500).send({
      success: false,
      error: 'Failed to check resource limit',
    });
  }
}
