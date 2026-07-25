"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

export function SignInCompleteView() {
  const router = useRouter();
  const trpc = useTRPC();
  const resolveRedirect = useMutation(
    trpc.auth.resolveRedirect.mutationOptions(),
  );
  const resolveRedirectRef = useRef(resolveRedirect.mutateAsync);
  const hasResolvedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    resolveRedirectRef.current = resolveRedirect.mutateAsync;
  }, [resolveRedirect.mutateAsync]);

  useEffect(() => {
    if (hasResolvedRef.current) {
      return;
    }

    hasResolvedRef.current = true;
    let cancelled = false;

    resolveRedirectRef
      .current()
      .then((result) => {
        if (!cancelled) {
          router.replace(result.redirectTo);
        }
      })
      .catch((caught) => {
        if (!cancelled) {
          setError(
            caught instanceof Error ? caught.message : "Unable to sign in.",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-100 p-8">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-zinc-950">
          Finishing sign in
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          {error ?? "Please wait while we open your account."}
        </p>
      </div>
    </main>
  );
}
