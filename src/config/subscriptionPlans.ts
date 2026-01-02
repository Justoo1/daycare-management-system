export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: {
    monthly: number;
    quarterly: number;
    yearly: number;
  };
  features: {
    maxChildren: number | null; // null = unlimited
    maxStaff: number | null;
    maxUsers: number | null;
    maxCenters: number;
    hasMessaging: boolean;
    hasReports: boolean;
    hasAnalytics: boolean;
    hasApiAccess: boolean;
    hasPrioritySupport: boolean;
    hasCustomBranding: boolean;
  };
  trialDays: number;
  popular?: boolean;
}

export const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlan> = {
  trial: {
    id: 'trial',
    name: 'Free Trial',
    description: '30-day free trial with full access',
    price: {
      monthly: 0,
      quarterly: 0,
      yearly: 0,
    },
    features: {
      maxChildren: 20,
      maxStaff: 5,
      maxUsers: 10,
      maxCenters: 1,
      hasMessaging: true,
      hasReports: true,
      hasAnalytics: true,
      hasApiAccess: false,
      hasPrioritySupport: false,
      hasCustomBranding: false,
    },
    trialDays: 30,
  },

  basic: {
    id: 'basic',
    name: 'Basic',
    description: 'Perfect for small daycare centers',
    price: {
      monthly: 150, // GHS 150/month
      quarterly: 400, // GHS 400/quarter (Save GHS 50)
      yearly: 1500, // GHS 1500/year (Save GHS 300)
    },
    features: {
      maxChildren: 50,
      maxStaff: 10,
      maxUsers: 25,
      maxCenters: 1,
      hasMessaging: true,
      hasReports: true,
      hasAnalytics: true,
      hasApiAccess: false,
      hasPrioritySupport: false,
      hasCustomBranding: false,
    },
    trialDays: 0,
  },

  standard: {
    id: 'standard',
    name: 'Standard',
    description: 'For growing daycare businesses',
    price: {
      monthly: 300, // GHS 300/month
      quarterly: 800, // GHS 800/quarter (Save GHS 100)
      yearly: 3000, // GHS 3000/year (Save GHS 600)
    },
    features: {
      maxChildren: 150,
      maxStaff: 30,
      maxUsers: 75,
      maxCenters: 3,
      hasMessaging: true,
      hasReports: true,
      hasAnalytics: true,
      hasApiAccess: true,
      hasPrioritySupport: true,
      hasCustomBranding: false,
    },
    trialDays: 0,
    popular: true,
  },

  premium: {
    id: 'premium',
    name: 'Premium',
    description: 'For large multi-center operations',
    price: {
      monthly: 600, // GHS 600/month
      quarterly: 1600, // GHS 1600/quarter (Save GHS 200)
      yearly: 6000, // GHS 6000/year (Save GHS 1200)
    },
    features: {
      maxChildren: null, // Unlimited
      maxStaff: null, // Unlimited
      maxUsers: null, // Unlimited
      maxCenters: 10,
      hasMessaging: true,
      hasReports: true,
      hasAnalytics: true,
      hasApiAccess: true,
      hasPrioritySupport: true,
      hasCustomBranding: true,
    },
    trialDays: 0,
  },
};

export const getTrialEndDate = (): Date => {
  const trialDays = SUBSCRIPTION_PLANS.trial.trialDays;
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + trialDays);
  return endDate;
};

export const getSubscriptionEndDate = (
  billingCycle: 'monthly' | 'quarterly' | 'yearly'
): Date => {
  const endDate = new Date();

  switch (billingCycle) {
    case 'monthly':
      endDate.setMonth(endDate.getMonth() + 1);
      break;
    case 'quarterly':
      endDate.setMonth(endDate.getMonth() + 3);
      break;
    case 'yearly':
      endDate.setFullYear(endDate.getFullYear() + 1);
      break;
  }

  return endDate;
};
