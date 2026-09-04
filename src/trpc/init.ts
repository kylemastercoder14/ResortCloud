import { initTRPC } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import superjson from "superjson";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FULL_PERMISSION, hasTenantPermission } from "@/lib/tenant-permissions";

export const createTRPCContext = async (opts: { headers: Headers }) => {
  return {
    headers: opts.headers,
    session: await auth.api.getSession({
      headers: opts.headers,
    }),
  };
};

const t = initTRPC
  .context<Awaited<ReturnType<typeof createTRPCContext>>>()
  .create({
    transformer: superjson,
  });

const permissionMiddleware = t.middleware(async ({ ctx, path, type, next }) => {
  const permission = getTenantProcedurePermission(path, type);

  if (!permission) {
    return next();
  }

  const authUser = ctx.session?.user;

  if (!authUser?.id) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Sign in required.",
    });
  }

  const appUser = await prisma.appUser.findUnique({
    where: {
      authUserId: authUser.id,
    },
    include: {
      staffProfile: {
        include: {
          accessRole: true,
        },
      },
    },
  });
  const permissions =
    appUser?.role === "TENANT"
      ? [FULL_PERMISSION]
      : appUser?.role === "TENANT_STAFF"
        ? appUser.staffProfile?.accessRole?.permissions ??
          appUser.staffProfile?.permissions ??
          []
        : [];

  if (!hasTenantPermission(permissions, permission)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have permission to perform this action.",
    });
  }

  return next();
});

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const baseProcedure = t.procedure.use(permissionMiddleware);

function getTenantProcedurePermission(path: string, type: "query" | "mutation" | "subscription") {
  if (!path.startsWith("tenant.")) return null;

  const action = path.split(".").at(-1) ?? "";
  const isWrite = type === "mutation";

  if (path.startsWith("tenant.notifications.")) return null;
  if (path.startsWith("tenant.analytics.")) return "analytics.reports.view";
  if (path.startsWith("tenant.accessRoles.")) {
    return isWrite ? "usersRoles.permissions.manage" : "usersRoles.view";
  }
  if (path.startsWith("tenant.usersRoles.")) {
    if (action === "invite") return "usersRoles.create";
    if (action === "delete") return "usersRoles.delete";
    if (action === "suspend") return "usersRoles.update";
    if (action === "save") return "usersRoles.update";
    return "usersRoles.view";
  }
  if (path.startsWith("tenant.departments.")) {
    return isWrite ? "departments.manage" : "departments.view";
  }
  if (path.startsWith("tenant.staffRecords.")) return "hr.staffRecords.view";
  if (path.startsWith("tenant.timekeeping.")) return "hr.timekeeping.view";
  if (path.startsWith("tenant.scheduling.")) return "hr.scheduling.manage";
  if (path.startsWith("tenant.leaveRequests.")) {
    return isWrite ? "hr.leaveRequests.manage" : "hr.leaveRequests.view";
  }
  if (path.startsWith("tenant.otUndertime.")) {
    return isWrite ? "hr.otUndertime.manage" : "hr.otUndertime.view";
  }
  if (path.startsWith("tenant.payroll.")) {
    if (action === "myHistory") return null;
    return isWrite || action === "preview" ? "payroll.manage" : "payroll.view";
  }
  if (path.startsWith("tenant.rooms.")) return isWrite ? "rooms.manage" : "rooms.view";
  if (path.startsWith("tenant.amenities.")) return isWrite ? "amenities.manage" : "amenities.view";
  if (path.startsWith("tenant.services.")) return isWrite ? "services.manage" : "services.view";
  if (path.startsWith("tenant.packages.")) return isWrite ? "services.manage" : "services.view";
  if (path.startsWith("tenant.invoices.")) return isWrite ? "invoices.create" : "invoices.view";
  if (path.startsWith("tenant.financeEntries.")) {
    return isWrite ? "finance.receipts.manage" : "finance.revenueExpenses.view";
  }
  if (path.startsWith("tenant.transactionExports.")) return "finance.export";
  if (path.startsWith("tenant.reservations.")) {
    if (action === "save") return "reservations.create";
    return "reservations.view";
  }
  if (path.startsWith("tenant.reception.")) return "operations.reception.manage";
  if (path.startsWith("tenant.maintenance.")) return "operations.maintenance.manage";
  if (path.startsWith("tenant.laundry.")) return "operations.laundry.manage";
  if (path.startsWith("tenant.inventory.")) return "operations.inventory.manage";
  if (path.startsWith("tenant.housekeeping.")) return "operations.housekeeping.manage";
  if (path.startsWith("tenant.leads.")) {
    return isWrite ? "leads.assign" : "leads.view";
  }
  if (path.startsWith("tenant.onboarding.")) return null;

  return null;
}
