"use client";

import {
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { usePaymentInputs } from "react-payment-inputs";
import images, { type CardImages } from "react-payment-inputs/images";
import {
  ArrowLeft,
  ArrowRight,
  BedDouble,
  Building2,
  Check,
  ChevronDown,
  CircleAlert,
  CreditCard,
  Hotel,
  HelpCircle,
  Landmark,
  Leaf,
  Loader2,
  LogOut,
  Palmtree,
  Sparkles,
  TentTree,
  WalletCards,
  Waves,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { onboardingSteps, propertyTypes } from "./data";
import Image from "next/image";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";

type OnboardingForm = {
  resortName: string;
  propertyType: string;
  shortDescription: string;
  region: string;
  province: string;
  municipality: string;
  barangay: string;
  fullAddress: string;
  phoneNumber: string;
  website: string;
  businessName: string;
  billingEmail: string;
  billingPhoneNumber: string;
  billingAddress: string;
  billingCity: string;
  billingStateProvince: string;
  billingPostalCode: string;
  paymentMethod: TenantPaymentMethod;
  paymentProvider: string;
  paymentAccountName: string;
  paymentAccountNumber: string;
  cardholderName: string;
  cardBrand: string;
  cardLastFour: string;
  cardExpiry: string;
};

type TenantProfileSnapshot = Partial<
  Record<keyof OnboardingForm, string | null>
> & {
  onboardingCurrentStep?: number | null;
};

type PsgcArea = {
  code: string;
  name: string;
  regionName?: string;
  regionCode?: string;
  provinceCode?: string | false;
  municipalityCode?: string | false;
};

type PaymentMethod = "bank" | "ewallet" | "card";

type TenantPaymentMethod =
  | "CREDIT_CARD"
  | "BANK_TRANSFER"
  | "E_WALLET"
  | "CASH_DEPOSIT";

type PaymentConnectionForm = {
  method: PaymentMethod;
  bankProvider: string;
  bankAccountName: string;
  bankAccountNumber: string;
  walletProvider: string;
  walletAccountName: string;
  walletAccountNumber: string;
  cardProvider: string;
  cardAccountName: string;
  cardNumber: string;
  cardExpiry: string;
  cardCvc: string;
};

type OnboardingDraft = {
  companySize: number;
  form: OnboardingForm;
  paymentConnection: PaymentConnectionForm;
  step: number;
};

const PSGC_API_BASE = "https://psgc.gitlab.io/api";
const ONBOARDING_DRAFT_VERSION = 1;

const resortStageOptions = [
  {
    value: "Private resort",
    title: "I am setting up a private resort",
    description: "Start with property details, location, and contact info.",
  },
  {
    value: "Beach resort",
    title: "I already manage resort bookings",
    description: "Move faster with operations and billing setup.",
  },
] as const;

const companySizeRanges = [
  "1-10 people",
  "11-25 people",
  "26-50 people",
  "51-100 people",
  "100+ people",
] as const;

const optionIcons = {
  "I am setting up a private resort": TentTree,
  "I already manage resort bookings": Palmtree,
  "Private resort": Landmark,
  "Beach resort": Waves,
  Villa: BedDouble,
  "Farm resort": Leaf,
  Hotel,
  "Event venue": Sparkles,
} as const;

const paymentOptions = [
  {
    method: "bank",
    title: "Online bank",
    description: "Accept deposits or transfers from bank accounts.",
    icon: Building2,
  },
  {
    method: "ewallet",
    title: "E-wallets",
    description: "Connect GCash, Maya, or another wallet provider.",
    icon: WalletCards,
  },
  {
    method: "card",
    title: "Credit cards",
    description: "Add card details for billing and payment collection.",
    icon: CreditCard,
  },
] as const;

function valueOrEmpty(value?: string | null) {
  return value ?? "";
}

function getInitialForm(profile: TenantProfileSnapshot): OnboardingForm {
  return {
    resortName: valueOrEmpty(profile.resortName),
    propertyType: profile.propertyType ?? "Private resort",
    shortDescription: valueOrEmpty(profile.shortDescription),
    region: valueOrEmpty(profile.region),
    province: valueOrEmpty(profile.province),
    municipality: valueOrEmpty(profile.municipality),
    barangay: valueOrEmpty(profile.barangay),
    fullAddress: valueOrEmpty(profile.fullAddress),
    phoneNumber: valueOrEmpty(profile.phoneNumber),
    website: valueOrEmpty(profile.website),
    businessName: valueOrEmpty(profile.businessName),
    billingEmail: valueOrEmpty(profile.billingEmail),
    billingPhoneNumber: valueOrEmpty(profile.billingPhoneNumber),
    billingAddress: valueOrEmpty(profile.billingAddress),
    billingCity: valueOrEmpty(profile.billingCity),
    billingStateProvince: valueOrEmpty(profile.billingStateProvince),
    billingPostalCode: valueOrEmpty(profile.billingPostalCode),
    paymentMethod: normalizeTenantPaymentMethod(profile.paymentMethod),
    paymentProvider: valueOrEmpty(profile.paymentProvider),
    paymentAccountName: valueOrEmpty(profile.paymentAccountName),
    paymentAccountNumber: valueOrEmpty(profile.paymentAccountNumber),
    cardholderName: valueOrEmpty(profile.cardholderName),
    cardBrand: valueOrEmpty(profile.cardBrand),
    cardLastFour: valueOrEmpty(profile.cardLastFour),
    cardExpiry: valueOrEmpty(profile.cardExpiry),
  };
}

export function OnboardingView() {
  const trpc = useTRPC();
  const onboarding = useQuery(trpc.tenant.onboarding.queryOptions());

  if (onboarding.isLoading || !onboarding.data) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-5 animate-spin text-zinc-500" />
      </main>
    );
  }

  return (
    <OnboardingFormShell
      key={`${onboarding.data.id}-${onboarding.data.updatedAt}`}
      initialForm={getInitialForm(onboarding.data)}
      initialStep={Math.min(onboarding.data.onboardingCurrentStep ?? 0, 4)}
    />
  );
}

function OnboardingFormShell({
  initialForm,
  initialStep,
}: {
  initialForm: OnboardingForm;
  initialStep: number;
}) {
  const router = useRouter();
  const trpc = useTRPC();
  const saveOnboarding = useMutation(
    trpc.tenant.saveOnboarding.mutationOptions(),
  );
  const draftKey = useMemo(
    () => getOnboardingDraftKey(initialForm),
    [initialForm],
  );
  const [initialDraft] = useState(() => getStoredOnboardingDraft(draftKey));
  const [step, setStep] = useState(initialDraft?.step ?? initialStep);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [form, setForm] = useState<OnboardingForm>(
    initialDraft?.form ?? initialForm,
  );
  const [companySize, setCompanySize] = useState(
    initialDraft?.companySize ?? 0,
  );
  const [paymentConnection, setPaymentConnection] =
    useState<PaymentConnectionForm>(
      initialDraft?.paymentConnection ??
        getInitialPaymentConnection(initialForm),
    );
  const isLastStep = step === onboardingSteps.length - 1;
  const regions = useQuery({
    queryKey: ["psgc", "regions"],
    queryFn: () => fetchPsgc<PsgcArea[]>("/regions"),
    staleTime: 1000 * 60 * 60,
  });
  const selectedRegionCode = getSelectedCode(regions.data, form.region);
  const provinces = useQuery({
    queryKey: ["psgc", "provinces", selectedRegionCode],
    queryFn: () =>
      fetchPsgc<PsgcArea[]>(`/regions/${selectedRegionCode}/provinces`),
    enabled: Boolean(selectedRegionCode),
    staleTime: 1000 * 60 * 60,
  });
  const selectedProvinceCode = getSelectedCode(provinces.data, form.province);
  const municipalities = useQuery({
    queryKey: [
      "psgc",
      "cities-municipalities",
      selectedRegionCode,
      selectedProvinceCode,
    ],
    queryFn: () =>
      fetchPsgc<PsgcArea[]>(
        selectedProvinceCode
          ? `/provinces/${selectedProvinceCode}/cities-municipalities`
          : `/regions/${selectedRegionCode}/cities-municipalities`,
      ),
    enabled: Boolean(selectedRegionCode),
    staleTime: 1000 * 60 * 60,
  });
  const selectedMunicipalityCode = getSelectedCode(
    municipalities.data,
    form.municipality,
  );
  const barangays = useQuery({
    queryKey: ["psgc", "barangays", selectedMunicipalityCode],
    queryFn: () =>
      fetchPsgc<PsgcArea[]>(
        `/cities-municipalities/${selectedMunicipalityCode}/barangays`,
      ),
    enabled: Boolean(selectedMunicipalityCode),
    staleTime: 1000 * 60 * 60,
  });

  useEffect(() => {
    saveOnboardingDraft(draftKey, {
      companySize,
      form,
      paymentConnection,
      step,
    });
  }, [companySize, draftKey, form, paymentConnection, step]);

  function updateForm(field: keyof OnboardingForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updatePaymentConnection(
    field: keyof PaymentConnectionForm,
    value: string,
  ) {
    setPaymentConnection((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const result = await saveOnboarding.mutateAsync({
      ...form,
      ...getPaymentProfileInput(paymentConnection),
      onboardingCurrentStep: isLastStep ? step : step + 1,
      complete: isLastStep,
    });

    if (isLastStep) {
      removeOnboardingDraft(draftKey);
      router.push(result.redirectTo);
      return;
    }

    setStep((current) => Math.min(current + 1, onboardingSteps.length - 1));
  }

  async function handleLogout() {
    if (isSigningOut) return;

    setIsSigningOut(true);
    const result = await authClient.signOut();

    if (result.error) {
      toast.error(result.error.message ?? "Unable to log out.");
      setIsSigningOut(false);
      return;
    }

    router.replace("/auth/sign-in");
    router.refresh();
  }

  return (
    <main className="min-h-screen">
      <form
        onSubmit={handleSubmit}
        className="mx-auto flex min-h-screen flex-col overflow-hidden pt-15"
      >
        <header className="fixed inset-x-0 top-0 z-30 flex h-15 shrink-0 items-center justify-between border-b border-zinc-200 bg-background px-5 text-xs">
          <div className="flex items-center gap-2 font-bold tracking-tight">
            <Image
              src="/main/logo-light.png"
              alt="ResortCloud logo"
              width={56}
              height={56}
              className="h-6 w-auto"
              priority
            />
            <span>ResortCloud</span>
          </div>
          <div className="flex items-center gap-4 text-zinc-500">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 font-medium text-zinc-700 transition hover:text-zinc-950"
            >
              <HelpCircle className="size-3.5" />
              Help Assistance
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                void handleLogout();
              }}
              className="hidden items-center gap-1.5 font-medium text-zinc-700 transition hover:text-zinc-950 sm:inline-flex"
            >
              <LogOut className="size-3.5" />
              Log out
            </button>
          </div>
        </header>

        <div className="flex flex-1 flex-col lg:block">
          <aside className="p-5 lg:fixed lg:inset-y-0 lg:left-0 lg:top-15 lg:z-20 lg:h-[calc(100vh-3.75rem)] lg:w-87.5">
            <div className="relative flex min-h-180 flex-col overflow-hidden rounded-2xl border bg-linear-to-br from-zinc-100 via-white to-zinc-100 px-7 py-8 lg:h-full lg:min-h-0">
              <div className="mb-8 flex items-start gap-3 text-xs text-zinc-600">
                <CircleAlert className="mt-0.5 size-4 shrink-0" />
                <p>Set up your resort workspace and booking profile.</p>
              </div>

              <div className="relative space-y-7">
                {onboardingSteps.map((item, index) => (
                  <StepMarker
                    key={item.title}
                    active={index === step}
                    complete={index < step}
                    description={item.description}
                    icon={item.icon}
                    last={index === onboardingSteps.length - 1}
                    title={item.title}
                  />
                ))}
              </div>

              <div className="pointer-events-none mt-auto hidden text-zinc-200/70 lg:block">
                <div className="absolute bottom-8 left-10 h-20 w-20 border border-current" />
                <div className="absolute bottom-2 left-28 h-16 w-16 border border-current" />
                <div className="absolute bottom-12 left-32 h-12 w-12 border border-current" />
              </div>
            </div>
          </aside>

          <section className="flex min-w-0 flex-col px-6 py-8 sm:px-10 lg:ml-87.5 lg:min-h-[calc(100vh-3.75rem)] lg:px-14 lg:py-14">
            <div className="max-w-4xl flex-1">
              <p className="text-xs font-bold uppercase tracking-tight text-foreground">
                {isLastStep
                  ? "Last step"
                  : `Step ${step + 1} of ${onboardingSteps.length}`}
              </p>

              {step === 0 ? (
                <StepFrame
                  title="Create your resort workspace"
                  description="Set up your workspace to manage listings, bookings, guest messages, and billing from one place."
                >
                  <div className="space-y-6">
                    <Field label="Resort name" htmlFor="resortName">
                      <Input
                        id="resortName"
                        value={form.resortName}
                        onChange={(event) =>
                          updateForm("resortName", event.target.value)
                        }
                        placeholder="e.g. Alrio Private Resort"
                        required
                      />
                    </Field>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {resortStageOptions.map((option) => (
                        <OptionTile
                          key={option.value}
                          active={form.propertyType === option.value}
                          title={option.title}
                          description={option.description}
                          onClick={() =>
                            updateForm("propertyType", option.value)
                          }
                        />
                      ))}
                    </div>

                    <CompanySizeSlider
                      value={companySize}
                      onChange={setCompanySize}
                    />
                  </div>
                </StepFrame>
              ) : null}

              {step === 1 ? (
                <StepFrame
                  title="Set up property details"
                  description="Choose the closest resort category and add a short description guests and staff can understand quickly."
                >
                  <div className="grid gap-3 sm:grid-cols-3">
                    {propertyTypes.map((type) => (
                      <OptionTile
                        key={type}
                        active={form.propertyType === type}
                        title={type}
                        description={getPropertyDescription(type)}
                        onClick={() => updateForm("propertyType", type)}
                      />
                    ))}
                  </div>
                  <div className="mt-6 max-w-4xl">
                    <Field label="Short description" htmlFor="shortDescription">
                      <Textarea
                        id="shortDescription"
                        value={form.shortDescription}
                        onChange={(event) =>
                          updateForm("shortDescription", event.target.value)
                        }
                        placeholder="Describe amenities, rooms, event spaces, and ideal guests."
                        className="min-h-20 rounded-md border-zinc-200"
                      />
                    </Field>
                  </div>
                </StepFrame>
              ) : null}

              {step === 2 ? (
                <StepFrame
                  title="Add location information"
                  description="This helps guests find your property and lets ResortCloud prepare maps, search, and booking details."
                >
                  <div className="grid gap-4 lg:grid-cols-2">
                    <LocationSelect
                      label="Region"
                      placeholder="Select region"
                      value={selectedRegionCode}
                      items={regions.data}
                      disabled={regions.isLoading}
                      loading={regions.isLoading}
                      onValueChange={(code) => {
                        const selected = findPsgcArea(regions.data, code);
                        setForm((current) => ({
                          ...current,
                          region: selected?.name ?? "",
                          province: "",
                          municipality: "",
                          barangay: "",
                        }));
                      }}
                    />
                    <LocationSelect
                      label="Province"
                      placeholder={
                        selectedRegionCode
                          ? "Select province"
                          : "Select region first"
                      }
                      value={selectedProvinceCode}
                      items={provinces.data}
                      disabled={
                        !selectedRegionCode ||
                        provinces.isLoading ||
                        (provinces.data?.length ?? 0) === 0
                      }
                      loading={provinces.isLoading}
                      emptyText="No province for selected region"
                      onValueChange={(code) => {
                        const selected = findPsgcArea(provinces.data, code);
                        setForm((current) => ({
                          ...current,
                          province: selected?.name ?? "",
                          municipality: "",
                          barangay: "",
                        }));
                      }}
                    />
                    <LocationSelect
                      label="Municipality / City"
                      placeholder={
                        selectedRegionCode
                          ? "Select municipality or city"
                          : "Select region first"
                      }
                      value={selectedMunicipalityCode}
                      items={municipalities.data}
                      disabled={!selectedRegionCode || municipalities.isLoading}
                      loading={municipalities.isLoading}
                      onValueChange={(code) => {
                        const selected = findPsgcArea(
                          municipalities.data,
                          code,
                        );
                        setForm((current) => ({
                          ...current,
                          municipality: selected?.name ?? "",
                          barangay: "",
                        }));
                      }}
                    />
                    <LocationSelect
                      label="Barangay"
                      placeholder={
                        selectedMunicipalityCode
                          ? "Select barangay"
                          : "Select municipality first"
                      }
                      value={getSelectedCode(barangays.data, form.barangay)}
                      items={barangays.data}
                      disabled={
                        !selectedMunicipalityCode || barangays.isLoading
                      }
                      loading={barangays.isLoading}
                      onValueChange={(code) => {
                        const selected = findPsgcArea(barangays.data, code);
                        updateForm("barangay", selected?.name ?? "");
                      }}
                    />
                  </div>

                  <div className="mt-4" />

                  <PhoneNumberField
                    id="phoneNumberLocation"
                    label="Phone number"
                    value={form.phoneNumber}
                    onChange={(value) => updateForm("phoneNumber", value)}
                    required
                  />
                  <div className="mt-6">
                    <Field label="Full address" htmlFor="fullAddress">
                      <Textarea
                        id="fullAddress"
                        value={form.fullAddress}
                        onChange={(event) =>
                          updateForm("fullAddress", event.target.value)
                        }
                        required
                        placeholder="Complete address"
                        className="min-h-24 rounded-md border-zinc-200"
                      />
                    </Field>
                  </div>
                </StepFrame>
              ) : null}

              {step === 3 ? (
                <StepFrame
                  title="Connect payment options"
                  description="Choose how guests can pay and add the tenant account details used for collections."
                >
                  <PaymentConnectionCards
                    payment={paymentConnection}
                    onSelectMethod={(method) =>
                      setPaymentConnection((current) => ({
                        ...current,
                        method,
                      }))
                    }
                    onUpdate={updatePaymentConnection}
                  />
                </StepFrame>
              ) : null}

              {step === 4 ? (
                <StepFrame
                  title="Review and launch workspace"
                  description="Check the key setup details before opening the tenant dashboard."
                >
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-tight text-zinc-500">
                            Workspace
                          </p>
                          <h2 className="mt-2 text-2xl font-bold tracking-tight text-zinc-950">
                            {form.resortName || "Unnamed resort"}
                          </h2>
                          <p className="mt-2 max-w-2xl text-sm text-zinc-600">
                            {form.shortDescription ||
                              "No short description provided."}
                          </p>
                        </div>
                        <div className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold text-zinc-700">
                          {form.propertyType || "No property type"}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 xl:grid-cols-2">
                      <ReviewSection
                        icon={<Landmark className="size-4" />}
                        title="Property details"
                        items={[
                          ["Company size", companySizeRanges[companySize]],
                          ["Property type", form.propertyType],
                          ["Website", form.website],
                        ]}
                      />
                      <ReviewSection
                        icon={<Building2 className="size-4" />}
                        title="Location"
                        items={[
                          ["Region", form.region],
                          ["Province", form.province],
                          ["Municipality / City", form.municipality],
                          ["Barangay", form.barangay],
                          ["Full address", form.fullAddress],
                        ]}
                      />
                      <ReviewSection
                        icon={<WalletCards className="size-4" />}
                        title="Contact"
                        items={[
                          [
                            "Phone",
                            formatPhilippinePhoneDisplay(form.phoneNumber),
                          ],
                          ["Billing email", form.billingEmail],
                          [
                            "Billing phone",
                            formatPhilippinePhoneDisplay(
                              form.billingPhoneNumber,
                            ),
                          ],
                        ]}
                      />
                      <PaymentReviewSection payment={paymentConnection} />
                    </div>
                  </div>
                </StepFrame>
              ) : null}
            </div>

            <footer className="mt-10 flex max-w-4xl items-center justify-between">
              <Button
                type="button"
                variant="outline"
                disabled={step === 0 || saveOnboarding.isPending}
                onClick={() => setStep((current) => Math.max(current - 1, 0))}
                className="rounded-full"
              >
                <ArrowLeft className="size-4" />
                Back
              </Button>

              <div className="flex items-center gap-3">
                <Button
                  type="submit"
                  disabled={saveOnboarding.isPending}
                  className="h-10 rounded-full bg-foreground px-5 text-background shadow-sm hover:bg-foreground/90"
                >
                  {saveOnboarding.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : isLastStep ? (
                    <Check className="size-4" />
                  ) : null}
                  {isLastStep ? "Process and set up" : "Save and continue"}
                  {!saveOnboarding.isPending && !isLastStep ? (
                    <ArrowRight className="size-4" />
                  ) : null}
                </Button>
              </div>
            </footer>
          </section>
        </div>
      </form>
    </main>
  );
}

function StepMarker({
  active,
  complete,
  description,
  icon: Icon,
  last,
  title,
}: {
  active: boolean;
  complete: boolean;
  description: string;
  icon: (typeof onboardingSteps)[number]["icon"];
  last: boolean;
  title: string;
}) {
  return (
    <div className="relative z-10 flex gap-4">
      {!last ? (
        <div
          className={cn(
            "absolute left-5 top-10 h-7 w-px",
            complete ? "bg-black" : "border-l border-dashed border-zinc-300",
          )}
        />
      ) : null}
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full border bg-white shadow-sm transition",
          active || complete
            ? "border-foreground bg-foreground text-background"
            : "border-zinc-200 text-zinc-500",
        )}
      >
        {complete ? <Check className="size-4" /> : <Icon className="size-4" />}
      </div>
      <div className="pt-0.5">
        <p className="text-sm font-bold text-zinc-950">{title}</p>
        <p className="mt-1 max-w-52 text-xs leading-relaxed text-zinc-500">
          {description}
        </p>
      </div>
    </div>
  );
}

function CompanySizeSlider({
  onChange,
  value,
}: {
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <div className="pt-1">
      <p className="text-sm font-bold text-zinc-950">
        How large is your company?
      </p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-zinc-950">
        {companySizeRanges[value]}
      </p>
      <Slider
        value={[value]}
        min={0}
        max={companySizeRanges.length - 1}
        step={1}
        onValueChange={(nextValue) => onChange(nextValue[0] ?? 0)}
        className="mt-5 **:data-[slot=slider-range]:bg-foreground **:data-[slot=slider-thumb]:size-5 **:data-[slot=slider-thumb]:border-foreground **:data-[slot=slider-track]:h-2"
      />
    </div>
  );
}

function CreditCardDetails({
  onUpdate,
  payment,
}: {
  onUpdate: (field: keyof PaymentConnectionForm, value: string) => void;
  payment: PaymentConnectionForm;
}) {
  const id = useId();
  const {
    getCVCProps,
    getCardImageProps,
    getCardNumberProps,
    getExpiryDateProps,
    meta,
  } = usePaymentInputs();

  return (
    <div className="space-y-2">
      <Label>Card details</Label>
      <div>
        <InputGroup className="focus-within:z-1 rounded-full">
          <InputGroupInput
            {...getCardNumberProps({
              onChange: (event: ChangeEvent<HTMLInputElement>) => {
                const digits = event.target.value.replace(/\D/g, "");
                onUpdate("cardNumber", digits);
                onUpdate("cardProvider", detectCardBrand(digits));
              },
            })}
            id={`number-${id}`}
            value={payment.cardNumber}
            placeholder="Card number"
          />
          <InputGroupAddon align="inline-end" className="pointer-events-none">
            {meta.cardType ? (
              <svg
                className="size-6 overflow-hidden"
                {...getCardImageProps({
                  images: images as unknown as CardImages,
                })}
              />
            ) : (
              <CreditCard className="size-4" />
            )}
            <span className="sr-only">Card provider</span>
          </InputGroupAddon>
        </InputGroup>
        <div className="flex mt-3 gap-3">
          <div className="min-w-0 flex-1 focus-within:z-1">
            <Input
              {...getExpiryDateProps({
                onChange: (event: ChangeEvent<HTMLInputElement>) =>
                  onUpdate("cardExpiry", event.target.value),
              })}
              id={`expiry-${id}`}
              value={payment.cardExpiry}
              placeholder="MM/YY"
            />
          </div>
          <div className="min-w-0 flex-1 focus-within:z-1">
            <Input
              {...getCVCProps({
                onChange: (event: ChangeEvent<HTMLInputElement>) =>
                  onUpdate(
                    "cardCvc",
                    event.target.value.replace(/\D/g, "").slice(0, 4),
                  ),
              })}
              id={`cvc-${id}`}
              value={payment.cardCvc}
              placeholder="CVC"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function PaymentConnectionCards({
  onSelectMethod,
  onUpdate,
  payment,
}: {
  onSelectMethod: (method: PaymentMethod) => void;
  onUpdate: (field: keyof PaymentConnectionForm, value: string) => void;
  payment: PaymentConnectionForm;
}) {
  const [openMethod, setOpenMethod] = useState<PaymentMethod | null>(
    payment.method,
  );

  return (
    <div className="mt-8 space-y-3">
      <div>
        <h2 className="text-sm font-bold text-zinc-950">Payment connection</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Choose how this tenant will receive customer payments.
        </p>
      </div>

      <div className="grid gap-3">
        {paymentOptions.map((option) => {
          const Icon = option.icon;
          const open = openMethod === option.method;

          return (
            <Collapsible
              key={option.method}
              open={open}
              onOpenChange={(nextOpen) => {
                setOpenMethod(nextOpen ? option.method : null);
                if (nextOpen) {
                  onSelectMethod(option.method);
                }
              }}
              className={cn(
                "rounded-xl border bg-background transition",
                open
                  ? "border-foreground ring-1 ring-foreground"
                  : "border-zinc-200",
              )}
            >
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center gap-4 px-4 py-4 text-left"
                >
                  <span
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-lg border",
                      open
                        ? "bg-foreground text-background"
                        : "border-zinc-200 text-zinc-500",
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-zinc-950">
                      {option.title}
                    </span>
                    <span className="mt-1 block text-xs text-zinc-500">
                      {option.description}
                    </span>
                  </span>
                  <ChevronDown
                    className={cn(
                      "size-4 shrink-0 text-zinc-400 transition",
                      open && "rotate-180 text-zinc-900",
                    )}
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="grid gap-4 border-t border-zinc-200 px-4 py-4 sm:grid-cols-2">
                  {option.method === "bank" ? (
                    <>
                      <Field label="Bank provider" htmlFor="bankProvider">
                        <Input
                          id="bankProvider"
                          value={payment.bankProvider}
                          onChange={(event) =>
                            onUpdate("bankProvider", event.target.value)
                          }
                          placeholder="BDO, BPI, Metrobank"
                        />
                      </Field>
                      <Field label="Account name" htmlFor="bankAccountName">
                        <Input
                          id="bankAccountName"
                          value={payment.bankAccountName}
                          onChange={(event) =>
                            onUpdate("bankAccountName", event.target.value)
                          }
                          placeholder="Registered account name"
                        />
                      </Field>
                      <Field label="Account number" htmlFor="bankAccountNumber">
                        <Input
                          id="bankAccountNumber"
                          value={payment.bankAccountNumber}
                          inputMode="numeric"
                          onChange={(event) =>
                            onUpdate(
                              "bankAccountNumber",
                              event.target.value.replace(/\D/g, ""),
                            )
                          }
                          placeholder="Account number"
                        />
                      </Field>
                    </>
                  ) : null}

                  {option.method === "ewallet" ? (
                    <>
                      <Field label="Provider" htmlFor="walletProvider">
                        <Input
                          id="walletProvider"
                          value={payment.walletProvider}
                          onChange={(event) =>
                            onUpdate("walletProvider", event.target.value)
                          }
                          placeholder="GCash, Maya"
                        />
                      </Field>
                      <Field label="Account name" htmlFor="walletAccountName">
                        <Input
                          id="walletAccountName"
                          value={payment.walletAccountName}
                          onChange={(event) =>
                            onUpdate("walletAccountName", event.target.value)
                          }
                          placeholder="Registered wallet name"
                        />
                      </Field>
                      <Field
                        label="Account number"
                        htmlFor="walletAccountNumber"
                      >
                        <Input
                          id="walletAccountNumber"
                          value={payment.walletAccountNumber}
                          inputMode="numeric"
                          onChange={(event) =>
                            onUpdate(
                              "walletAccountNumber",
                              event.target.value.replace(/\D/g, ""),
                            )
                          }
                          placeholder="Wallet mobile number"
                        />
                      </Field>
                    </>
                  ) : null}

                  {option.method === "card" ? (
                    <div className="space-y-4 sm:col-span-2">
                      <Field label="Cardholder name" htmlFor="cardAccountName">
                        <Input
                          id="cardAccountName"
                          value={payment.cardAccountName}
                          onChange={(event) =>
                            onUpdate("cardAccountName", event.target.value)
                          }
                          placeholder="Cardholder name"
                        />
                      </Field>
                      <CreditCardDetails
                        payment={payment}
                        onUpdate={onUpdate}
                      />
                    </div>
                  ) : null}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
}

function StepFrame({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <div>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-950 md:text-3xl">
        {title}
      </h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-600">
        {description}
      </p>
      <div className="mt-7">{children}</div>
    </div>
  );
}

function ReviewSection({
  icon,
  items,
  title,
}: {
  icon: ReactNode;
  items: Array<[string, string | undefined]>;
  title: string;
}) {
  return (
    <section className="min-w-0 rounded-2xl h-fit border border-zinc-200 bg-white p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-700">
          {icon}
        </span>
        <h2 className="text-sm tracking-tight font-bold text-zinc-950">
          {title}
        </h2>
      </div>
      <div className="divide-y divide-zinc-100">
        {items.map(([label, value]) => (
          <ReviewRow key={label} label={label} value={value} />
        ))}
      </div>
    </section>
  );
}

function PaymentReviewSection({ payment }: { payment: PaymentConnectionForm }) {
  const option = paymentOptions.find((item) => item.method === payment.method);
  const Icon = option?.icon ?? CreditCard;
  const rows = getPaymentReviewRows(payment);

  return (
    <section className="min-w-0 rounded-2xl border border-zinc-200 bg-white p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-700">
          <Icon className="size-4" />
        </span>
        <div>
          <h2 className="text-sm font-bold text-zinc-950">
            Payment connection
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            {option?.title ?? "No payment option selected"}
          </p>
        </div>
      </div>
      <div className="divide-y divide-zinc-100">
        {rows.map(([label, value]) => (
          <ReviewRow key={label} label={label} value={value} />
        ))}
      </div>
    </section>
  );
}

function ReviewRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="grid min-w-0 gap-1 py-3 sm:grid-cols-[minmax(0,44%)_minmax(0,56%)] sm:gap-4">
      <p className="min-w-0 text-xs font-semibold uppercase tracking-tight text-zinc-500">
        {label}
      </p>
      <p className="min-w-0 text-sm font-semibold tracking-tight text-zinc-950 wrap-anywhere">
        {value || "Not provided"}
      </p>
    </div>
  );
}

function LocationSelect({
  disabled,
  emptyText = "No options found",
  items,
  label,
  loading,
  onValueChange,
  placeholder,
  value,
}: {
  disabled?: boolean;
  emptyText?: string;
  items?: PsgcArea[];
  label: string;
  loading?: boolean;
  onValueChange: (value: string) => void;
  placeholder: string;
  value?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-semibold text-zinc-950">{label}</Label>
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={loading ? "Loading..." : placeholder} />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {items?.length ? (
            items.map((item) => (
              <SelectItem key={item.code} value={item.code}>
                {formatPsgcName(item)}
              </SelectItem>
            ))
          ) : (
            <div className="px-2 py-2 text-sm text-zinc-500">
              {loading ? "Loading..." : emptyText}
            </div>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

function PhoneNumberField({
  id,
  label,
  onChange,
  required,
  value,
}: {
  id: string;
  label: string;
  onChange: (value: string) => void;
  required?: boolean;
  value: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-semibold text-zinc-950">
        {label}
      </Label>
      <InputGroup className="rounded-full h-9">
        <InputGroupAddon className="gap-2 pl-3 pr-2">
          <Image src="/ph.png" alt="Ph" width={20} height={20} />
          <span className="text-sm text-zinc-700">+63</span>
        </InputGroupAddon>
        <InputGroupInput
          id={id}
          value={value}
          inputMode="numeric"
          maxLength={10}
          pattern="[0-9]{10}"
          placeholder="9123456789"
          required={required}
          title="Enter 10 digits after +63"
          onChange={(event) =>
            onChange(normalizePhilippinePhone(event.target.value))
          }
        />
      </InputGroup>
    </div>
  );
}

function OptionTile({
  active,
  description,
  onClick,
  title,
}: {
  active: boolean;
  description: string;
  onClick: () => void;
  title: string;
}) {
  const Icon = optionIcons[title as keyof typeof optionIcons] ?? Sparkles;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex min-h-32 flex-col items-start rounded-xl border bg-background px-4 py-4 text-left transition",
        active
          ? "border-foreground ring-1 ring-foreground"
          : "border-zinc-200 hover:border-zinc-400",
      )}
    >
      <span
        className={cn(
          "flex size-8 items-center justify-center rounded-md border transition",
          active
            ? "bg-foreground text-background"
            : "border-zinc-200 text-zinc-500",
        )}
      >
        <Icon className="size-4" />
      </span>
      <span
        className={cn(
          "absolute right-3 top-3 flex size-5 items-center justify-center rounded-full border text-[10px] transition",
          active
            ? "border-foreground bg-foreground text-white"
            : "border-zinc-200 bg-white text-transparent",
        )}
      >
        <Check className="size-3.5" />
      </span>
      <span className="mt-4">
        <span className="block text-sm font-bold text-zinc-950">{title}</span>
        <span className="mt-1 block text-xs text-zinc-500">{description}</span>
      </span>
    </button>
  );
}

function Field({
  children,
  htmlFor,
  label,
}: {
  children: ReactNode;
  htmlFor: string;
  label: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-sm font-semibold text-zinc-950">
        {label}
      </Label>
      {children}
    </div>
  );
}

function getPropertyDescription(type: string) {
  if (type === "Private resort")
    return "Exclusive stay, day tour, or event use";
  if (type === "Beach resort") return "Coastal stays, cottages, and activities";
  if (type === "Villa") return "Private house, pool villa, or family property";
  if (type === "Farm resort")
    return "Nature stay, farm activities, and retreats";
  if (type === "Hotel") return "Rooms, front desk, and overnight bookings";
  if (type === "Event venue")
    return "Weddings, parties, and group reservations";
  return "General resort or hospitality property";
}

async function fetchPsgc<T>(path: string): Promise<T> {
  const response = await fetch(`${PSGC_API_BASE}${path}`);

  if (!response.ok) {
    throw new Error(`PSGC request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

function findPsgcArea(items: PsgcArea[] | undefined, code: string) {
  return items?.find((item) => item.code === code);
}

function getSelectedCode(items: PsgcArea[] | undefined, name: string) {
  return items?.find((item) => item.name === name)?.code;
}

function formatPsgcName(item: PsgcArea) {
  return item.regionName ? `${item.regionName} - ${item.name}` : item.name;
}

function normalizePhilippinePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  const withoutCountryCode = digits.startsWith("63") ? digits.slice(2) : digits;
  const withoutLeadingZero = withoutCountryCode.startsWith("0")
    ? withoutCountryCode.slice(1)
    : withoutCountryCode;

  return withoutLeadingZero.slice(0, 10);
}

function detectCardBrand(value: string) {
  if (/^4/.test(value)) return "Visa";
  if (/^(5[1-5]|2[2-7])/.test(value)) return "Mastercard";
  if (/^3[47]/.test(value)) return "American Express";
  if (/^6(?:011|5)/.test(value)) return "Discover";
  if (/^35/.test(value)) return "JCB";

  return "";
}

function formatPhilippinePhoneDisplay(value: string) {
  if (!value) {
    return "";
  }

  return `+63 ${value}`;
}

function getPaymentReviewRows(
  payment: PaymentConnectionForm,
): Array<[string, string | undefined]> {
  if (payment.method === "bank") {
    return [
      ["Saved method", "BANK_TRANSFER"],
      ["Provider", payment.bankProvider],
      ["Account name", payment.bankAccountName],
      ["Account number", maskAccountNumber(payment.bankAccountNumber)],
    ];
  }

  if (payment.method === "ewallet") {
    return [
      ["Saved method", "E_WALLET"],
      ["Provider", payment.walletProvider],
      ["Account name", payment.walletAccountName],
      [
        "Account number",
        formatPhilippinePhoneDisplay(payment.walletAccountNumber),
      ],
    ];
  }

  return [
    ["Saved method", "CREDIT_CARD"],
    ["Card brand", payment.cardProvider],
    ["Cardholder name", payment.cardAccountName],
    ["Card number", maskAccountNumber(payment.cardNumber)],
    ["Expiry date", payment.cardExpiry],
  ];
}

function maskAccountNumber(value: string) {
  if (!value) {
    return "";
  }

  if (value.length <= 4) {
    return value;
  }

  return `**** ${value.slice(-4)}`;
}

function normalizeTenantPaymentMethod(
  value?: string | null,
): TenantPaymentMethod {
  if (
    value === "CREDIT_CARD" ||
    value === "BANK_TRANSFER" ||
    value === "E_WALLET" ||
    value === "CASH_DEPOSIT"
  ) {
    return value;
  }

  return "CREDIT_CARD";
}

function toPaymentMethod(value: TenantPaymentMethod): PaymentMethod {
  if (value === "BANK_TRANSFER") return "bank";
  if (value === "E_WALLET") return "ewallet";
  return "card";
}

function toTenantPaymentMethod(value: PaymentMethod): TenantPaymentMethod {
  if (value === "bank") return "BANK_TRANSFER";
  if (value === "ewallet") return "E_WALLET";
  return "CREDIT_CARD";
}

function getInitialPaymentConnection(
  initialForm: OnboardingForm,
): PaymentConnectionForm {
  const paymentMethod = toPaymentMethod(initialForm.paymentMethod);

  return {
    method: paymentMethod,
    bankProvider: paymentMethod === "bank" ? initialForm.paymentProvider : "",
    bankAccountName:
      paymentMethod === "bank" ? initialForm.paymentAccountName : "",
    bankAccountNumber:
      paymentMethod === "bank" ? initialForm.paymentAccountNumber : "",
    walletProvider:
      paymentMethod === "ewallet" ? initialForm.paymentProvider : "",
    walletAccountName:
      paymentMethod === "ewallet" ? initialForm.paymentAccountName : "",
    walletAccountNumber:
      paymentMethod === "ewallet" ? initialForm.paymentAccountNumber : "",
    cardProvider: initialForm.cardBrand,
    cardAccountName: initialForm.cardholderName,
    cardNumber: initialForm.cardLastFour,
    cardExpiry: initialForm.cardExpiry,
    cardCvc: "",
  };
}

function getPaymentProfileInput(payment: PaymentConnectionForm) {
  const paymentMethod = toTenantPaymentMethod(payment.method);

  if (payment.method !== "card") {
    const isBank = payment.method === "bank";

    return {
      paymentMethod,
      paymentProvider: isBank ? payment.bankProvider : payment.walletProvider,
      paymentAccountName: isBank
        ? payment.bankAccountName
        : payment.walletAccountName,
      paymentAccountNumber: isBank
        ? payment.bankAccountNumber
        : payment.walletAccountNumber,
      cardholderName: "",
      cardBrand: "",
      cardLastFour: "",
      cardExpiry: "",
    };
  }

  return {
    paymentMethod,
    paymentProvider: payment.cardProvider,
    paymentAccountName: payment.cardAccountName,
    paymentAccountNumber: payment.cardNumber.replace(/\D/g, "").slice(-4),
    cardholderName: payment.cardAccountName,
    cardBrand: payment.cardProvider,
    cardLastFour: payment.cardNumber.replace(/\D/g, "").slice(-4),
    cardExpiry: payment.cardExpiry,
  };
}

function getOnboardingDraftKey(form: OnboardingForm) {
  return `resort-cloud:onboarding-draft:v${ONBOARDING_DRAFT_VERSION}:${
    form.billingEmail || form.resortName || "tenant"
  }`;
}

function getStoredOnboardingDraft(key: string): OnboardingDraft | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawDraft = window.localStorage.getItem(key);

    if (!rawDraft) {
      return null;
    }

    const draft = JSON.parse(rawDraft) as Partial<OnboardingDraft>;

    if (!draft.form || !draft.paymentConnection) {
      return null;
    }

    return {
      companySize: clampCompanySize(draft.companySize),
      form: draft.form,
      paymentConnection: draft.paymentConnection,
      step: clampStep(draft.step),
    };
  } catch {
    return null;
  }
}

function saveOnboardingDraft(key: string, draft: OnboardingDraft) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(draft));
}

function removeOnboardingDraft(key: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(key);
}

function clampStep(value: unknown) {
  if (typeof value !== "number") {
    return 0;
  }

  return Math.min(Math.max(value, 0), onboardingSteps.length - 1);
}

function clampCompanySize(value: unknown) {
  if (typeof value !== "number") {
    return 0;
  }

  return Math.min(Math.max(value, 0), companySizeRanges.length - 1);
}
