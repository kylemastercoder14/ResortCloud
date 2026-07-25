export type SubscriptionPlan = "FREE_TRIAL" | "STARTER" | "GROWTH" | "ENTERPRISE";
export type SubscriptionStatus =
  | "PENDING"
  | "TRIALING"
  | "ACTIVE"
  | "PAST_DUE"
  | "CANCELED"
  | "REVOKED"
  | "SUSPENDED";

export type PlanEntitlements = {
  staffSeatLimit: number | null;
  domainLimit: number;
  hasAiAccess: boolean;
  hasAdvancedAnalyticsAccess: boolean;
  multiPropertyLimit: number;
  showAds: boolean;
};

const ENTITLEMENTS_BY_PLAN: Record<SubscriptionPlan, PlanEntitlements> = {
  FREE_TRIAL: {
    staffSeatLimit: 3,
    domainLimit: 0,
    hasAiAccess: false,
    hasAdvancedAnalyticsAccess: false,
    multiPropertyLimit: 1,
    showAds: true,
  },
  STARTER: {
    staffSeatLimit: 10,
    domainLimit: 0,
    hasAiAccess: false,
    hasAdvancedAnalyticsAccess: false,
    multiPropertyLimit: 1,
    showAds: false,
  },
  GROWTH: {
    staffSeatLimit: 25,
    domainLimit: 1,
    hasAiAccess: false,
    hasAdvancedAnalyticsAccess: true,
    multiPropertyLimit: 2,
    showAds: false,
  },
  ENTERPRISE: {
    staffSeatLimit: null,
    domainLimit: 3,
    hasAiAccess: true,
    hasAdvancedAnalyticsAccess: true,
    multiPropertyLimit: 3,
    showAds: false,
  },
};

export function getPlanEntitlements(plan: SubscriptionPlan): PlanEntitlements {
  return ENTITLEMENTS_BY_PLAN[plan];
}

export function shouldShowAds(input: {
  plan: SubscriptionPlan;
  subscriptionStatus?: SubscriptionStatus | null;
}) {
  return input.plan === "FREE_TRIAL" && input.subscriptionStatus === "TRIALING";
}

export function getTenantEntitlements(input: {
  plan: SubscriptionPlan;
  subscriptionStatus?: SubscriptionStatus | null;
}): PlanEntitlements {
  const base = getPlanEntitlements(input.plan);

  return {
    ...base,
    showAds: shouldShowAds(input),
  };
}

export function isWithinStaffSeatLimit(input: {
  plan: SubscriptionPlan;
  currentSeatCount: number;
  requestedSeats?: number;
}) {
  const limit = getPlanEntitlements(input.plan).staffSeatLimit;

  if (limit === null) {
    return true;
  }

  return input.currentSeatCount + (input.requestedSeats ?? 1) <= limit;
}

export function isWithinDomainLimit(input: {
  plan: SubscriptionPlan;
  currentDomainCount: number;
  requestedDomains?: number;
}) {
  const limit = getPlanEntitlements(input.plan).domainLimit;

  return input.currentDomainCount + (input.requestedDomains ?? 1) <= limit;
}