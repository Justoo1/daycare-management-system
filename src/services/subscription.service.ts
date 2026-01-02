import { AppDataSource } from '../config/database';
import { Subscription } from '../models/Subscription';
import { Tenant } from '../models/Tenant';
import { Child } from '../models/Child';
import { User } from '../models/User';
import { Center } from '../models/Center';
import { StaffProfile } from '../models/StaffProfile';
import { In } from 'typeorm';
import { EnrollmentStatus } from '../types';
import { SUBSCRIPTION_PLANS, getTrialEndDate, getSubscriptionEndDate } from '../config/subscriptionPlans';

export interface CreateSubscriptionData {
  tenantId: string;
  planType: 'trial' | 'basic' | 'standard' | 'premium';
  billingCycle?: 'monthly' | 'quarterly' | 'yearly';
  autoRenew?: boolean;
}

export class SubscriptionService {
  private subscriptionRepository = AppDataSource.getRepository(Subscription);
  private tenantRepository = AppDataSource.getRepository(Tenant);
  private childRepository = AppDataSource.getRepository(Child);
  private userRepository = AppDataSource.getRepository(User);
  private centerRepository = AppDataSource.getRepository(Center);
  private staffRepository = AppDataSource.getRepository(StaffProfile);

  /**
   * Create a trial subscription for a new tenant
   */
  async createTrialSubscription(tenantId: string): Promise<Subscription> {
    const plan = SUBSCRIPTION_PLANS.trial;
    const startDate = new Date();
    const endDate = getTrialEndDate();

    const subscription = this.subscriptionRepository.create({
      tenantId,
      planType: 'trial',
      billingCycle: 'monthly',
      amount: 0,
      currency: 'GHS',
      startDate,
      endDate,
      trialEndDate: endDate,
      status: 'trial',
      autoRenew: false,
      maxChildren: plan.features.maxChildren,
      maxStaff: plan.features.maxStaff,
      maxUsers: plan.features.maxUsers,
      maxCenters: plan.features.maxCenters,
      hasMessaging: plan.features.hasMessaging,
      hasReports: plan.features.hasReports,
      hasAnalytics: plan.features.hasAnalytics,
      hasApiAccess: plan.features.hasApiAccess,
    });

    return await this.subscriptionRepository.save(subscription);
  }

  /**
   * Upgrade subscription from trial to paid plan
   */
  async upgradeSubscription(
    tenantId: string,
    data: CreateSubscriptionData
  ): Promise<Subscription> {
    // Get current subscription
    const currentSubscription = await this.getCurrentSubscription(tenantId);

    if (currentSubscription) {
      // Cancel current subscription
      currentSubscription.status = 'cancelled';
      currentSubscription.cancelledAt = new Date();
      await this.subscriptionRepository.save(currentSubscription);
    }

    const plan = SUBSCRIPTION_PLANS[data.planType];
    const billingCycle = data.billingCycle || 'monthly';
    const startDate = new Date();
    const endDate = getSubscriptionEndDate(billingCycle);
    const nextBillingDate = getSubscriptionEndDate(billingCycle);

    const subscription = this.subscriptionRepository.create({
      tenantId,
      planType: data.planType,
      billingCycle,
      amount: plan.price[billingCycle],
      currency: 'GHS',
      startDate,
      endDate,
      trialEndDate: null,
      status: 'active',
      autoRenew: data.autoRenew !== undefined ? data.autoRenew : true,
      nextBillingDate,
      lastPaymentDate: startDate,
      maxChildren: plan.features.maxChildren,
      maxStaff: plan.features.maxStaff,
      maxUsers: plan.features.maxUsers,
      maxCenters: plan.features.maxCenters,
      hasMessaging: plan.features.hasMessaging,
      hasReports: plan.features.hasReports,
      hasAnalytics: plan.features.hasAnalytics,
      hasApiAccess: plan.features.hasApiAccess,
    });

    return await this.subscriptionRepository.save(subscription);
  }

  /**
   * Get current active subscription for a tenant
   */
  async getCurrentSubscription(tenantId: string): Promise<Subscription | null> {
    return await this.subscriptionRepository.findOne({
      where: {
        tenantId,
        status: In(['trial', 'active']),
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  /**
   * Get subscription by ID
   */
  async getSubscriptionById(id: string, tenantId: string): Promise<Subscription | null> {
    return await this.subscriptionRepository.findOne({
      where: { id, tenantId },
    });
  }

  /**
   * Get all subscriptions for a tenant
   */
  async getSubscriptionHistory(tenantId: string): Promise<Subscription[]> {
    return await this.subscriptionRepository.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Renew subscription
   */
  async renewSubscription(tenantId: string): Promise<Subscription> {
    const currentSubscription = await this.getCurrentSubscription(tenantId);

    if (!currentSubscription) {
      throw new Error('No active subscription found');
    }

    const plan = SUBSCRIPTION_PLANS[currentSubscription.planType];
    const newEndDate = getSubscriptionEndDate(currentSubscription.billingCycle as any);
    const newNextBillingDate = getSubscriptionEndDate(currentSubscription.billingCycle as any);

    currentSubscription.endDate = newEndDate;
    currentSubscription.nextBillingDate = newNextBillingDate;
    currentSubscription.lastPaymentDate = new Date();
    currentSubscription.status = 'active';

    return await this.subscriptionRepository.save(currentSubscription);
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(
    tenantId: string,
    reason?: string
  ): Promise<Subscription> {
    const subscription = await this.getCurrentSubscription(tenantId);

    if (!subscription) {
      throw new Error('No active subscription found');
    }

    subscription.status = 'cancelled';
    subscription.cancelledAt = new Date();
    subscription.cancellationReason = reason || null;
    subscription.autoRenew = false;

    return await this.subscriptionRepository.save(subscription);
  }

  /**
   * Suspend subscription (for non-payment)
   */
  async suspendSubscription(tenantId: string): Promise<Subscription> {
    const subscription = await this.getCurrentSubscription(tenantId);

    if (!subscription) {
      throw new Error('No active subscription found');
    }

    subscription.status = 'suspended';

    return await this.subscriptionRepository.save(subscription);
  }

  /**
   * Reactivate suspended subscription
   */
  async reactivateSubscription(tenantId: string): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findOne({
      where: {
        tenantId,
        status: 'suspended',
      },
      order: {
        createdAt: 'DESC',
      },
    });

    if (!subscription) {
      throw new Error('No suspended subscription found');
    }

    subscription.status = 'active';

    return await this.subscriptionRepository.save(subscription);
  }

  /**
   * Check if subscription is valid
   */
  async isSubscriptionValid(tenantId: string): Promise<boolean> {
    const subscription = await this.getCurrentSubscription(tenantId);

    if (!subscription) {
      return false;
    }

    return subscription.isActive();
  }

  /**
   * Get subscription statistics
   */
  async getSubscriptionStats() {
    const [total, trial, active, cancelled, expired, suspended] = await Promise.all([
      this.subscriptionRepository.count(),
      this.subscriptionRepository.count({ where: { status: 'trial' } }),
      this.subscriptionRepository.count({ where: { status: 'active' } }),
      this.subscriptionRepository.count({ where: { status: 'cancelled' } }),
      this.subscriptionRepository.count({ where: { status: 'expired' } }),
      this.subscriptionRepository.count({ where: { status: 'suspended' } }),
    ]);

    const monthlyRevenue = await this.subscriptionRepository
      .createQueryBuilder('subscription')
      .select('SUM(subscription.amount)', 'sum')
      .where('subscription.billingCycle = :cycle', { cycle: 'monthly' })
      .andWhere('subscription.status = :status', { status: 'active' })
      .getRawOne();

    return {
      total,
      trial,
      active,
      cancelled,
      expired,
      suspended,
      monthlyRevenue: parseFloat(monthlyRevenue?.sum || 0),
    };
  }

  /**
   * Get expiring subscriptions (within 7 days)
   */
  async getExpiringSubscriptions(): Promise<Subscription[]> {
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    return await this.subscriptionRepository
      .createQueryBuilder('subscription')
      .where('subscription.status IN (:...statuses)', { statuses: ['trial', 'active'] })
      .andWhere('subscription.endDate <= :date', { date: sevenDaysFromNow })
      .andWhere('subscription.endDate > :now', { now: new Date() })
      .getMany();
  }

  /**
   * Update auto-renew setting
   */
  async updateAutoRenew(
    tenantId: string,
    autoRenew: boolean
  ): Promise<Subscription> {
    const subscription = await this.getCurrentSubscription(tenantId);

    if (!subscription) {
      throw new Error('No active subscription found');
    }

    subscription.autoRenew = autoRenew;

    return await this.subscriptionRepository.save(subscription);
  }

  /**
   * Get usage statistics for a tenant
   */
  async getUsageStats(tenantId: string) {
    const subscription = await this.getCurrentSubscription(tenantId);

    if (!subscription) {
      return null;
    }

    // Count only enrolled children
    const childrenCount = await this.childRepository.count({
      where: {
        tenantId,
        enrollmentStatus: EnrollmentStatus.ENROLLED
      },
    });

    // Count active staff from StaffProfile
    const staffCount = await this.staffRepository.count({
      where: {
        tenantId,
        isActive: true
      },
    });

    // Count active users
    const usersCount = await this.userRepository.count({
      where: {
        tenantId,
        isActive: true
      },
    });

    // Count centers
    const centersCount = await this.centerRepository.count({
      where: { tenantId },
    });

    return {
      childrenCount,
      staffCount,
      usersCount,
      centersCount,
      childrenLimit: subscription.maxChildren,
      staffLimit: subscription.maxStaff,
      usersLimit: subscription.maxUsers,
      centersLimit: subscription.maxCenters,
    };
  }
}

export const subscriptionService = new SubscriptionService();
