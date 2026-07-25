export type AuthRole =
  | "ADMIN"
  | "ADMIN_STAFF"
  | "TENANT"
  | "TENANT_STAFF"
  | "CUSTOMER";
export type TenantOnboardingStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED";

export function getAppRedirectPath(input: {
  role: AuthRole;
  tenantOnboardingStatus?: TenantOnboardingStatus | null;
}) {
  const { role, tenantOnboardingStatus } = input;

  if (role === "ADMIN" || role === "ADMIN_STAFF") {
    return "/admin/dashboard";
  }

  if (role === "TENANT_STAFF") {
    return tenantOnboardingStatus === "COMPLETED"
      ? "/tenant/dashboard"
      : "/waiting-for-approval";
  }

  if (role === "TENANT") {
    if (tenantOnboardingStatus === "COMPLETED") {
      return "/tenant/dashboard";
    }

    if (tenantOnboardingStatus === "IN_PROGRESS") {
      return "/waiting-for-approval";
    }

    return "/auth/onboarding";
  }

  return "/";
}

export function getTenantOnboardingStatusForAccess(appUser: {
  role: AuthRole;
  tenantProfile?: {
    onboardingStatus?: TenantOnboardingStatus | null;
  } | null;
  staffProfile?: {
    tenantProfile?: {
      onboardingStatus?: TenantOnboardingStatus | null;
    } | null;
  } | null;
}) {
  if (appUser.role === "TENANT") {
    return appUser.tenantProfile?.onboardingStatus ?? null;
  }

  if (appUser.role === "TENANT_STAFF") {
    return appUser.staffProfile?.tenantProfile?.onboardingStatus ?? null;
  }

  return null;
}
