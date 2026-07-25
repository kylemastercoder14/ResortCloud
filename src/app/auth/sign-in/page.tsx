import { redirect } from "next/navigation";
import {
  getAppRedirectPath,
  getTenantOnboardingStatusForAccess,
} from "@/lib/auth-redirect";
import { getCurrentAppUser } from "@/lib/current-app-user";
import { SignInView } from "./_components/sign-in";

export default async function Page() {
  const { appUser } = await getCurrentAppUser();

  if (appUser) {
    redirect(
      getAppRedirectPath({
        role: appUser.role,
        tenantOnboardingStatus: getTenantOnboardingStatusForAccess(appUser),
      }),
    );
  }

  return <SignInView />;
}
