export const FULL_PERMISSION = "*" as const;

export type TenantPermission = string;

export function hasTenantPermission(
  permissions: readonly string[] | null | undefined,
  permission: TenantPermission,
) {
  return Boolean(
    permissions?.includes(FULL_PERMISSION) || permissions?.includes(permission),
  );
}

export function hasAnyTenantPermission(
  permissions: readonly string[] | null | undefined,
  permissionIds: readonly TenantPermission[],
) {
  return (
    permissions?.includes(FULL_PERMISSION) ||
    permissionIds.some((permission) => permissions?.includes(permission))
  );
}

export function getTenantRoutePermission(pathname: string) {
  const path = pathname.replace(/\/$/, "");

  if (path === "/tenant/dashboard") return null;
  if (path.startsWith("/tenant/access/users")) return "usersRoles.view";
  if (path.startsWith("/tenant/access/roles")) return "usersRoles.permissions.manage";
  if (path.startsWith("/tenant/access/departments")) return "departments.view";
  if (path.startsWith("/tenant/reservations")) return "reservations.view";
  if (path.startsWith("/tenant/services/rooms")) return "rooms.view";
  if (path.startsWith("/tenant/services/amenities")) return "amenities.view";
  if (path.startsWith("/tenant/services")) return "services.view";
  if (path.startsWith("/tenant/leads")) return "leads.view";
  if (path.startsWith("/tenant/invoices")) return "invoices.view";
  if (path.startsWith("/tenant/finance/export")) return "finance.export";
  if (path.startsWith("/tenant/finance")) return "finance.revenueExpenses.view";
  if (path.startsWith("/tenant/payroll-history")) return null;
  if (path.startsWith("/tenant/hr/generate-payroll")) return "payroll.view";
  if (path.startsWith("/tenant/hr/staff-records")) return "hr.staffRecords.view";
  if (path.startsWith("/tenant/hr/timekeeping")) return "hr.timekeeping.view";
  if (path.startsWith("/tenant/hr/scheduling")) return "hr.scheduling.manage";
  if (path.startsWith("/tenant/hr/leave-requests")) return "hr.leaveRequests.view";
  if (path.startsWith("/tenant/hr/ot-undertime")) return "hr.otUndertime.view";
  if (path.startsWith("/tenant/hr")) return "hr.staffRecords.view";
  if (path.startsWith("/tenant/operations/reception")) return "operations.reception.manage";
  if (path.startsWith("/tenant/operations/housekeeping")) return "operations.housekeeping.manage";
  if (path.startsWith("/tenant/operations/maintenance")) return "operations.maintenance.manage";
  if (path.startsWith("/tenant/operations/laundry")) return "operations.laundry.manage";
  if (path.startsWith("/tenant/operations/inventory")) return "operations.inventory.manage";
  if (path.startsWith("/tenant/analytics")) return "analytics.reports.view";
  if (path.startsWith("/tenant/settings")) return "settings.general.manage";

  return null;
}

export function canAccessTenantPath(
  permissions: readonly string[] | null | undefined,
  pathname: string,
) {
  const permission = getTenantRoutePermission(pathname);

  return !permission || hasTenantPermission(permissions, permission);
}
