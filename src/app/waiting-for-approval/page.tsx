import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import {
  getAppRedirectPath,
  getTenantOnboardingStatusForAccess,
} from "@/lib/auth-redirect";
import { getCurrentAppUser } from "@/lib/current-app-user";
import { LogoutButton } from "./logout-button";

export default async function Page() {
  const { appUser } = await getCurrentAppUser();

  if (!appUser) {
    redirect("/auth/sign-in");
  }

  const tenantOnboardingStatus = getTenantOnboardingStatusForAccess(appUser);

  if (
    appUser.role === "TENANT" &&
    tenantOnboardingStatus !== "IN_PROGRESS"
  ) {
    redirect(
      getAppRedirectPath({
        role: appUser.role,
        tenantOnboardingStatus,
      }),
    );
  }

  if (
    appUser.role === "TENANT_STAFF" &&
    tenantOnboardingStatus === "COMPLETED"
  ) {
    redirect(
      getAppRedirectPath({
        role: appUser.role,
        tenantOnboardingStatus,
      }),
    );
  }

  return (
    <main className="min-h-screen bg-zinc-100 px-6 py-10 text-zinc-950">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-5xl flex-col">
        <header className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/main/logo-light.png"
              alt="ResortCloud logo"
              width={40}
              height={40}
              className="h-8 w-auto"
              priority
            />
            <span className="text-base font-semibold tracking-tight">
              ResortCloud
            </span>
          </Link>
          <LogoutButton />
        </header>

        <section className="grid flex-1 items-center gap-8 py-12 lg:grid-cols-[1fr_0.85fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600 shadow-sm">
              <TickingClockIcon />
              Approval pending
            </div>
            <h1 className="mt-5 max-w-2xl text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl">
              Your resort workspace is under review.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-zinc-600">
              Your onboarding form has been submitted. ResortCloud will unlock
              the tenant dashboard after account review is complete.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex size-12 items-center justify-center rounded-full bg-zinc-950 text-white">
              <ShieldCheck className="size-5" />
            </div>
            <h2 className="mt-5 text-lg font-semibold tracking-tight">
              Review in progress
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Tenant modules stay protected while business details, billing, and
              workspace access are checked.
            </p>
            <div className="mt-6 space-y-3 text-sm">
              {["Business profile received", "Payment details saved", "Dashboard access pending"].map(
                (item) => (
                  <div
                    className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2"
                    key={item}
                  >
                    <span className="font-medium text-zinc-700">{item}</span>
                    <span className="size-2 rounded-full bg-zinc-400" />
                  </div>
                ),
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function TickingClockIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-3.5"
      fill="none"
      viewBox="0 0 16 16"
    >
      <circle
        cx="8"
        cy="8"
        r="6.25"
        className="stroke-zinc-500"
        strokeWidth="1.5"
      />
      <path
        className="stroke-zinc-700"
        d="M8 4.5V8L10.5 9.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        className="animate-waiting-clock-tick stroke-zinc-950"
        d="M8 8V3.5"
        strokeLinecap="round"
        strokeWidth="1.25"
      />
      <circle cx="8" cy="8" r="0.75" className="fill-zinc-950" />
    </svg>
  );
}
