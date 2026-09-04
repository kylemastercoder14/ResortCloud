import type { ReactNode } from "react";

import { LandingFooter } from "@/app/_components/landing-footer";
import { LandingHeader } from "@/app/_components/landing-header";

export default function LandingPageLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <>
      <LandingHeader />
      {children}
      <LandingFooter />
    </>
  );
}
