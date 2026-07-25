"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Eye, EyeOff } from "lucide-react";
import { AppleMark, GoogleMark, SocialButton } from "@/components/socials";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { useTRPC } from "@/trpc/client";

export function SignInView() {
  const router = useRouter();
  const trpc = useTRPC();
  const resolveRedirect = useMutation(
    trpc.auth.resolveRedirect.mutationOptions(),
  );
  const resolveSignInIdentifier = useMutation(
    trpc.auth.resolveSignInIdentifier.mutationOptions(),
  );
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isSubmitting =
    resolveRedirect.isPending || resolveSignInIdentifier.isPending;

  async function goToApp() {
    const result = await resolveRedirect.mutateAsync();
    router.push(result.redirectTo);
    router.refresh();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const identifier = String(formData.get("identifier") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    let email = identifier;

    try {
      const resolved = await resolveSignInIdentifier.mutateAsync({
        identifier,
      });
      email = resolved.email;
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Invalid email or username.",
      );
      return;
    }

    const result = await authClient.signIn.email({
      email,
      password,
    });

    if (result.error) {
      setError(result.error.message ?? "Invalid email or password.");
      return;
    }

    try {
      await goToApp();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to open account.",
      );
    }
  }

  async function handleSocialSignIn(provider: "google" | "apple") {
    setError(null);

    const result = await authClient.signIn.social({
      provider,
      callbackURL: "/auth/sign-in/complete",
    });

    if (result.error) {
      setError(result.error.message ?? `Unable to continue with ${provider}.`);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-100">
      <div className="relative grid min-h-screen lg:grid-cols-2">
        <div className="flex flex-col justify-center bg-zinc-100 px-6 py-12">
          <div className="mx-auto w-full max-w-lg">
            <div className="mb-5 rounded-4xl border border-zinc-200/80 bg-white p-6 shadow-sm">
              <div className="mb-6 flex flex-col items-center">
                <Image
                  src="/main/logo-light.png"
                  alt="ResortCloud logo"
                  width={56}
                  height={56}
                  className="h-10 w-auto"
                  priority
                />
                <h1 className="mt-2 text-lg font-semibold tracking-tight text-zinc-900">
                  Sign in to ResortCloud
                </h1>
                <p className="mt-1 text-center text-sm text-zinc-500">
                  Continue to your dashboard, onboarding, or booking account.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <SocialButton
                  icon={<GoogleMark />}
                  disabled={isSubmitting}
                  onClick={() => void handleSocialSignIn("google")}
                >
                  Google
                </SocialButton>
                <SocialButton
                  icon={<AppleMark />}
                  disabled={isSubmitting}
                  onClick={() => void handleSocialSignIn("apple")}
                >
                  Apple
                </SocialButton>
              </div>

              <div className="my-6 flex items-center gap-4">
                <div className="h-px flex-1 bg-zinc-200" />
                <span className="text-xs font-medium text-zinc-500">OR</span>
                <div className="h-px flex-1 bg-zinc-200" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="identifier"
                    className="text-sm font-medium text-zinc-950"
                  >
                    Email or username
                  </Label>
                  <Input
                    id="identifier"
                    name="identifier"
                    type="text"
                    placeholder="Enter your email or username"
                    className="h-9 rounded-full border-zinc-200 px-4 text-sm"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="password"
                      className="text-sm font-medium text-zinc-950"
                    >
                      Password
                    </Label>
                    <Link
                      href="/auth/forgot-password"
                      className="text-xs font-medium text-zinc-500 hover:text-zinc-950"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      className="h-9 rounded-full border-zinc-200 px-4 pr-11 text-sm"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-zinc-400 hover:text-zinc-600"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      aria-pressed={showPassword}
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                </div>

                {error ? (
                  <p className="rounded-full border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                  </p>
                ) : null}

                <Button
                  type="submit"
                  className="h-9 w-full rounded-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Signing in..." : "Sign in"}
                </Button>
              </form>

              <p className="mt-5 text-center text-sm text-zinc-500">
                New to ResortCloud?{" "}
                <Link
                  href="/auth/sign-up"
                  className="font-semibold text-black hover:underline"
                >
                  Create account
                </Link>
              </p>
            </div>
            <span className="text-sm text-muted-foreground">
              &copy; 2026 ResortCloud
            </span>
          </div>
        </div>

        <div
          className="pointer-events-none absolute inset-y-0 z-10 hidden w-10 flex-col lg:flex"
          style={{ left: "calc(50% - 5px)", transform: "scaleX(-1)" }}
        >
          <div className="shrink-0" style={{ height: 48 }}>
            <svg
              width="40"
              height="48"
              viewBox="0 0 40 48"
              fill="none"
              aria-hidden="true"
              style={{ display: "block" }}
            >
              <path
                d="M1.5726 39.2806L35.8127 1.84475C36.8877 0.669421 38.4072 0 40 0V48H0V43.3301C0 41.8312 0.561002 40.3866 1.5726 39.2806Z"
                fill="#f4f4f5"
              />
            </svg>
          </div>
          <div className="flex-1 bg-zinc-100" />
          <div className="shrink-0" style={{ height: 48 }}>
            <svg
              width="40"
              height="48"
              viewBox="0 0 40 48"
              fill="none"
              aria-hidden="true"
              style={{ display: "block" }}
            >
              <path
                d="M1.5726 8.71937L35.8127 46.1552C36.8877 47.3306 38.4072 48 40 48V0H0V4.66991C0 6.16878 0.561002 7.61336 1.5726 8.71937Z"
                fill="#f4f4f5"
              />
            </svg>
          </div>
        </div>

        <div className="hidden flex-col justify-between bg-white py-16 pl-40 pr-20 lg:flex">
          <div />

          <div className="flex flex-col gap-8">
            <svg
              width="40"
              height="32"
              viewBox="0 0 40 32"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M0 32V19.556C0 14.37 1.333 9.956 4 6.311 6.667 2.667 10.667.444 16 0l2 3.556C13.778 4.444 11.556 6 10 8.444 8.444 10.889 7.778 13.556 8 16.444H16V32H0zm24 0V19.556c0-5.186 1.333-9.6 4-13.245C30.667 2.667 34.667.444 40 0l2 3.556C37.778 4.444 35.556 6 34 8.444c-1.556 2.445-2.222 5.112-2 8H40V32H24z"
                fill="#111827"
              />
            </svg>

            <blockquote className="text-2xl font-semibold leading-snug tracking-tight text-zinc-900">
              Manage bookings, resort operations, billing, and guest
              communication from one workspace.
            </blockquote>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 text-sm font-bold text-white">
                RC
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-900">
                  ResortCloud
                </p>
                <p className="text-sm text-zinc-500">
                  Secure access for guests and resort operators
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
            <Link
              href="/help-center"
              target="_blank"
              className="transition-colors hover:text-black"
            >
              Support
            </Link>
            <span className="size-0.75 rounded-full bg-muted-foreground" />
            <Link
              href="/privacy-policy"
              target="_blank"
              className="transition-colors hover:text-black"
            >
              Privacy
            </Link>
            <span className="size-0.75 rounded-full bg-muted-foreground" />
            <Link
              href="/terms"
              target="_blank"
              className="transition-colors hover:text-black"
            >
              Terms
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
