"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { CheckIcon, Eye, EyeOff, XIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn, getStrengthColor, getStrengthText, passwordRequirements } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AppleMark, GoogleMark, SocialButton } from "@/components/socials";
import { authClient } from "@/lib/auth-client";
import { useTRPC } from "@/trpc/client";

function getQuoteContent(userType: "admin" | "tenant" | "customer") {
  if (userType === "admin") {
    return {
      quote:
        "Run the entire platform with a clear view of tenant growth, billing performance, and the operational health of every resort workspace.",
      title: "Platform Owner, ResortCloud",
    };
  }

  if (userType === "tenant") {
    return {
      quote:
        "ResortCloud gives operators one place to coordinate reservations, finance, operations, guest communication, and the website experience guests actually see.",
      title: "Platform Owner, ResortCloud",
    };
  }

  return {
    quote:
      "Create a guest account that stays connected across booking updates, resort communication, and future customer experiences powered by each tenant.",
    title: "Platform Owner, ResortCloud",
  };
}

export function SignUpView({
  userType,
  selectedPlan,
  selectedBilling,
  checkoutIntent,
}: {
  userType?: "admin" | "tenant" | "customer";
  selectedPlan?: string;
  selectedBilling?: string;
  checkoutIntent?: string;
}) {
  const router = useRouter();
  const trpc = useTRPC();
  const finalizeSignUp = useMutation(trpc.auth.finalizeSignUp.mutationOptions());
  const [selectedRole, setSelectedRole] = useState<
    "tenant" | "customer" | null
  >(userType === "tenant" || userType === "customer" ? userType : null);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const activeUserType = userType ?? selectedRole ?? "customer";
  const quoteContent = getQuoteContent(activeUserType);
  const passwordStrength = passwordRequirements.map((requirement) => ({
    met: requirement.regex.test(password),
    text: requirement.text,
  }));
  const strengthScore = useMemo(
    () => passwordStrength.filter((requirement) => requirement.met).length,
    [passwordStrength],
  );
  const strengthPercent = Math.round(
    (strengthScore / passwordRequirements.length) * 100,
  );
  const isSubmitting = finalizeSignUp.isPending;
  const isSocialSubmitting = isSubmitting;
  const role = activeUserType.toUpperCase() as
    | "ADMIN"
    | "TENANT"
    | "CUSTOMER";
  const plan =
    selectedPlan === "starter" ||
    selectedPlan === "growth" ||
    selectedPlan === "enterprise"
      ? selectedPlan
      : "free_trial";
  const billing = selectedBilling === "yearly" ? "yearly" : "monthly";

  function getSocialCallbackUrl() {
    const params = new URLSearchParams({
      userType: activeUserType,
      plan,
      billing,
    });

    if (checkoutIntent) {
      params.set("checkout", checkoutIntent);
    }

    return `/auth/sign-up/complete?${params.toString()}`;
  }

  async function handleSocialSignIn(provider: "google" | "apple") {
    setError(null);

    if (!userType && !selectedRole) {
      setError("Choose customer or tenant account type.");
      return;
    }

    const result = await authClient.signIn.social({
      provider,
      callbackURL: getSocialCallbackUrl(),
    });

    if (result.error) {
      setError(result.error.message ?? `Unable to continue with ${provider}.`);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!userType && !selectedRole) {
      setError("Choose customer or tenant account type.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const firstName = String(formData.get("firstName") ?? "").trim();
    const lastName = String(formData.get("lastName") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const passwordValue = String(formData.get("password") ?? "");

    const signUpResult = await authClient.signUp.email({
      email,
      password: passwordValue,
      name: `${firstName} ${lastName}`.trim(),
    });

    if (signUpResult.error) {
      setError(signUpResult.error.message ?? "Unable to create account.");
      return;
    }

    try {
      const result = await finalizeSignUp.mutateAsync({
        firstName,
        lastName,
        role,
        plan,
        billing,
        checkout: checkoutIntent,
      });

      router.push(result.redirectTo);
    } catch (mutationError) {
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : "Unable to finish account setup.",
      );
    }
  }

  return (
    <main className="min-h-screen bg-zinc-100">
      <div className="relative grid min-h-screen lg:grid-cols-2">
        <div className="flex flex-col justify-center bg-zinc-100 px-6 py-12">
          <div className="mx-auto max-w-lg">
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
                  Create your account
                </h1>
              </div>

              {!userType && !selectedRole ? (
                <div className="mb-6 grid gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedRole("customer")}
                    className="rounded-2xl border border-zinc-200 bg-white p-4 text-left transition hover:border-zinc-900"
                  >
                    <span className="text-sm font-semibold text-zinc-950">
                      Book a resort
                    </span>
                    <span className="mt-1 block text-xs text-zinc-500">
                      Customer account for bookings and guest updates.
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRole("tenant")}
                    className="rounded-2xl border border-zinc-200 bg-white p-4 text-left transition hover:border-zinc-900"
                  >
                    <span className="text-sm font-semibold text-zinc-950">
                      List my resort
                    </span>
                    <span className="mt-1 block text-xs text-zinc-500">
                      Resort owner workspace with 7-day free trial.
                    </span>
                  </button>
                </div>
              ) : null}

              {userType || selectedRole ? (
                <>
              <div className="grid grid-cols-2 gap-2">
                <SocialButton
                  icon={<GoogleMark />}
                  disabled={isSocialSubmitting}
                  onClick={() => void handleSocialSignIn("google")}
                >
                  Google
                </SocialButton>
                <SocialButton
                  icon={<AppleMark />}
                  disabled={isSocialSubmitting}
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
                <input type="hidden" name="role" value={activeUserType} />
                <input type="hidden" name="plan" value={selectedPlan ?? ""} />
                <input type="hidden" name="billing" value={selectedBilling ?? ""} />
                <input type="hidden" name="checkout" value={checkoutIntent ?? ""} />

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="firstName"
                      className="text-sm font-medium text-zinc-950"
                    >
                      First name
                    </Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      type="text"
                      placeholder="Enter your first name"
                      className="h-9 rounded-full border-zinc-200 px-4 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="lastName"
                      className="text-sm font-medium text-zinc-950"
                    >
                      Last name
                    </Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      type="text"
                      placeholder="Enter your last name"
                      className="h-9 rounded-full border-zinc-200 px-4 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="email"
                    className="text-sm font-medium text-zinc-950"
                  >
                    Email address
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Enter your email address"
                    className="h-9 rounded-full border-zinc-200 px-4 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="password"
                    className="text-sm font-medium text-zinc-950"
                  >
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="h-9 rounded-full border-zinc-200 px-4 pr-11 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-zinc-400 hover:text-zinc-600"
                      aria-label={showPassword ? "Hide password" : "Show password"}
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
                  <div className="space-y-2 pt-1.5">
                    <div
                      className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200"
                      role="progressbar"
                      aria-label="Password strength"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={strengthPercent}
                    >
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500 ease-out",
                          getStrengthColor(strengthScore),
                        )}
                        style={{ width: `${strengthPercent}%` }}
                      />
                    </div>

                    <p className="text-xs font-medium text-zinc-900">
                      {getStrengthText(strengthScore)}. Must contain:
                    </p>

                    <ul className="space-y-1">
                      {passwordStrength.map((requirement) => (
                        <li
                          key={requirement.text}
                          className="flex items-center gap-1"
                        >
                          {requirement.met ? (
                            <CheckIcon className="size-3.5 text-green-600" />
                          ) : (
                            <XIcon className="size-3.5 text-zinc-400" />
                          )}
                          <span
                            className={cn(
                              "text-xs",
                              requirement.met
                                ? "text-green-600"
                                : "text-zinc-500",
                            )}
                          >
                            {requirement.text}
                            <span className="sr-only">
                              {requirement.met
                                ? " - Requirement met"
                                : " - Requirement not met"}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {error ? (
                  <p className="rounded-full border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                  </p>
                ) : null}

                <Button type="submit" className="h-9 rounded-full w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Creating account..." : "Continue"}
                </Button>
              </form>
                </>
              ) : null}

              <p className="mt-5 text-center text-sm text-zinc-500">
                Already have an account?{" "}
                <Link
                  href="/auth/sign-in"
                  className="font-semibold text-black hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </div>
            <span className="text-sm text-muted-foreground">
              © 2026 ResortCloud
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
              {quoteContent.quote}
            </blockquote>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 text-sm font-bold text-white">
                JA
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-900">
                  Jason Jhon Almonte
                </p>
                <p className="text-sm text-zinc-500">{quoteContent.title}</p>
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
