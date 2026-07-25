"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

type SignUpRole = "ADMIN" | "TENANT" | "CUSTOMER";
type SignUpPlan = "free_trial" | "starter" | "growth" | "enterprise";
type SignUpBilling = "monthly" | "yearly";

function normalizeRole(userType?: string): SignUpRole {
  const value = userType?.toUpperCase();

  if (value === "ADMIN" || value === "TENANT" || value === "CUSTOMER") {
    return value;
  }

  return "CUSTOMER";
}

function normalizePlan(plan?: string): SignUpPlan {
  if (plan === "starter" || plan === "growth" || plan === "enterprise") {
    return plan;
  }

  return "free_trial";
}

function normalizeBilling(billing?: string): SignUpBilling {
  return billing === "yearly" ? "yearly" : "monthly";
}

export function SignUpCompleteView({
  userType,
  selectedPlan,
  selectedBilling,
  checkoutIntent,
}: {
  userType?: string;
  selectedPlan?: string;
  selectedBilling?: string;
  checkoutIntent?: string;
}) {
  const router = useRouter();
  const trpc = useTRPC();
  const finalizeSignUp = useMutation(trpc.auth.finalizeSignUp.mutationOptions());
  const hasFinalizedRef = useRef(false);
  const finalizeSignUpRef = useRef(finalizeSignUp.mutateAsync);
  const [error, setError] = useState<string | null>(null);
  const input = useMemo(
    () => ({
      role: normalizeRole(userType),
      plan: normalizePlan(selectedPlan),
      billing: normalizeBilling(selectedBilling),
      checkout: checkoutIntent,
    }),
    [checkoutIntent, selectedBilling, selectedPlan, userType],
  );

  useEffect(() => {
    finalizeSignUpRef.current = finalizeSignUp.mutateAsync;
  }, [finalizeSignUp.mutateAsync]);

  useEffect(() => {
    if (hasFinalizedRef.current) {
      return;
    }

    hasFinalizedRef.current = true;
    let cancelled = false;

    finalizeSignUpRef
      .current(input)
      .then((result) => {
        if (!cancelled) {
          router.replace(result.redirectTo);
        }
      })
      .catch((caught) => {
        if (!cancelled) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Unable to finish social sign-up.",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [input, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-100 p-8">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-zinc-950">
          Finishing account setup
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          {error ?? "Please wait while we complete your sign-up."}
        </p>
      </div>
    </main>
  );
}
