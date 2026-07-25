import { forbidden, redirect } from "next/navigation";
import { TenantHeader } from "@/components/tenant/tenant-header";
import { TenantSidebar } from "@/components/tenant/tenant-sidebar";
import {
  getAppRedirectPath,
  getTenantOnboardingStatusForAccess,
} from "@/lib/auth-redirect";
import { getCurrentAppUser } from "@/lib/current-app-user";

export default async function TenantRoutesLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { appUser } = await getCurrentAppUser();

  if (!appUser) {
    redirect("/auth/sign-in");
  }

  if (appUser.role !== "TENANT" && appUser.role !== "TENANT_STAFF") {
    redirect(
      getAppRedirectPath({
        role: appUser.role,
        tenantOnboardingStatus: null,
      }),
    );
  }

  if (
    appUser.role === "TENANT_STAFF" &&
    appUser.staffProfile?.status === "SUSPENDED"
  ) {
    forbidden();
  }

  const tenantOnboardingStatus = getTenantOnboardingStatusForAccess(appUser);

  if (tenantOnboardingStatus !== "COMPLETED") {
    redirect(
      getAppRedirectPath({
        role: appUser.role,
        tenantOnboardingStatus,
      }),
    );
  }

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#0b0b0b] text-[#303030]">
      <TenantHeader />
      <div className="flex h-[calc(100dvh-4.25rem)] min-h-0 overflow-hidden rounded-tl-2xl bg-[#F1F1F1]">
        <TenantSidebar />
        <main className="h-full min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-[#F1F1F1] p-5">
          {children}
        </main>
      </div>
    </div>
  );
}
