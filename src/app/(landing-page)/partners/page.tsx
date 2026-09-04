import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BedDouble,
  CalendarCheck,
  Check,
  ClipboardList,
  CreditCard,
  Globe2,
  KeyRound,
  Megaphone,
  MessageSquareText,
  ShieldCheck,
  Store,
  UsersRound,
} from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

const proofStats = [
  {
    value: "7 days",
    label: "free trial",
    detail: "Starter-level tools are open for evaluation.",
  },
  {
    value: "50%",
    label: "down payment links",
    detail: "Confirm bookings through PayMongo payment requests.",
  },
  {
    value: "1 click",
    label: "site publishing",
    detail: "Launch a resort booking site from your tenant workspace.",
  },
  {
    value: "24/7",
    label: "request visibility",
    detail: "Keep sales, operations, finance, and owners aligned.",
  },
];

const ownerProblems = [
  "Guests message on Facebook, call staff, then disappear before paying.",
  "Room availability, down payments, and walk-ins live in separate notebooks.",
  "Owners cannot see sales conversion, cash collection, petty cash, or HR issues until reports are late.",
  "A website is useful, but most resort websites are not connected to actual reservations and operations.",
];

const operatingSystemFeatures = [
  {
    title: "Reservation control",
    description:
      "Track inquiries, priority, follow-ups, booking status, room assignment, and cancellation policy from one workspace.",
    icon: CalendarCheck,
  },
  {
    title: "Guest-facing website",
    description:
      "Publish hero, about, rooms and rates, gallery, amenities, contact, location, and an embedded booking widget.",
    icon: Store,
  },
  {
    title: "Packages and services",
    description:
      "Sell overnight stays, day tours, venue rentals, dining bundles, pool access, spa, tours, and add-on services.",
    icon: BedDouble,
  },
  {
    title: "Payments and invoices",
    description:
      "Generate personal or company invoices, send PayMongo links, and link transactions back to the booking record.",
    icon: CreditCard,
  },
  {
    title: "Finance and petty cash",
    description:
      "Monitor inflows, outflows, liquidation, replenishment, cash reports, and bank reconciliation work.",
    icon: ClipboardList,
  },
  {
    title: "Marketing analytics",
    description:
      "See inquiry source, lead aging, page views, booking widget clicks, conversion rate, and campaign performance.",
    icon: Megaphone,
  },
  {
    title: "Staff and HR",
    description:
      "Give HR tools for attendance, leave, staff directory, and weekly or monthly reports without exposing finance.",
    icon: UsersRound,
  },
  {
    title: "Owner dashboard",
    description:
      "Watch KPIs for conversion, collection cycle, cancellation risk, petty cash, attendance, and response time.",
    icon: BarChart3,
  },
];

const publishingSteps = [
  {
    title: "Create your tenant workspace",
    description:
      "Start the trial, invite up to three staff users, and set roles for sales, accounting, HR, operations, and owner access.",
  },
  {
    title: "Load rooms, rates, services, and amenities",
    description:
      "Add capacity, photos, inclusions, seasonal pricing, service menus, guest rules, and available packages.",
  },
  {
    title: "Publish your resort site",
    description:
      "Use the builder to customize colors, fonts, images, and sections, then publish to a free ResortCloud subdomain.",
  },
  {
    title: "Connect payments and operations",
    description:
      "Send down payment links, track bookings, notify teams, and keep owner KPIs updated as reservations move.",
  },
];

const planCards = [
  {
    name: "Starter",
    fit: "For small private resorts getting organized.",
    price: "₱2,499",
    cadence: "per month",
    items: [
      "Reservations and sales tracking",
      "Public booking website",
      "Basic marketing reports",
      "Optional custom domain add-on",
    ],
  },
  {
    name: "Growth",
    fit: "For resorts that need stronger reporting.",
    price: "₱5,999",
    cadence: "per month",
    items: [
      "Advanced analytics",
      "AI-assisted inquiry tagging",
      "Custom date-range reports",
      "One custom domain included",
    ],
  },
  {
    name: "Enterprise",
    fit: "For high-volume resort operations.",
    price: "Custom",
    cadence: "starts at ₱12,999/month",
    items: [
      "Guest-facing AI chatbot",
      "Revenue forecasting",
      "Smart booking recommendations",
      "Three custom domains included",
    ],
  },
];

const faqItems = [
  {
    question: "Is ResortCloud a booking marketplace or resort software?",
    answer:
      "Both. The public site helps guests discover resorts, rooms, packages, amenities, and services. Behind each listing is a tenant workspace where the resort team manages bookings, sales, payments, finance, HR, and marketing.",
  },
  {
    question: "Can my resort publish its own website?",
    answer:
      "Yes. Every tenant can publish a mobile-responsive resort site with editable sections, gallery, rooms and rates, amenities, contact details, and a booking widget connected to the reservation module.",
  },
  {
    question: "Do I need to buy a domain somewhere else?",
    answer:
      "No. Paid plans can manage domains inside ResortCloud through the Domain Marketplace. The platform handles registrar purchase, DNS setup, SSL, reminders, and renewals.",
  },
  {
    question: "How do guests pay?",
    answer:
      "Bookings can use PayMongo payment links for GCash, Maya, and cards. The MVP plan supports a 50% down payment policy and links transactions to invoice and booking records.",
  },
  {
    question: "What happens after the 7-day trial?",
    answer:
      "The resort chooses Starter, Growth, or Enterprise. If no paid subscription is activated, the account is suspended while data is retained for 30 days.",
  },
];

export default function PartnersPage() {
  return (
    <main className="min-h-screen bg-white text-zinc-950">
      <section className="relative overflow-hidden bg-zinc-950 text-white">
        <Image
          src="https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=2200&q=85"
          alt="Private resort pool and suites prepared for guests"
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-45"
        />
        <div className="absolute inset-0 bg-linear-to-b from-black/70 via-black/55 to-black/85" />

        <div className="relative mx-auto flex min-h-180 max-w-7xl flex-col px-4 pb-14 pt-28 sm:px-6 lg:px-8">
          <div className="grid flex-1 items-center gap-12 lg:grid-cols-[1fr_0.82fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur">
                <KeyRound className="size-4 text-amber-300" />
                For resort owners and operators
              </div>
              <h1 className="mt-6 max-w-4xl text-5xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl">
                Publish your resort. Run the operation behind it.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-white/80">
                ResortCloud gives private resorts a guest-facing booking site
                and a tenant workspace for reservations, sales, payments,
                finance, HR, marketing, and owner reporting.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Button
                  asChild
                  size="lg"
                  className="h-13 rounded-full bg-white px-7 text-base font-semibold text-zinc-950 hover:bg-zinc-100"
                >
                  <Link href="/auth/sign-up">
                    Start 7-day trial
                    <ArrowRight className="size-5" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-13 rounded-full border-white/25 bg-white/10 px-7 text-base font-semibold text-white shadow-none hover:bg-white/20 hover:text-white"
                >
                  <Link href="#platform">See platform</Link>
                </Button>
              </div>
            </div>

            <div className="rounded-3xl border border-white/15 bg-white/10 p-3 shadow-2xl backdrop-blur-md">
              <div className="overflow-hidden rounded-2xl bg-white text-zinc-950">
                <div className="relative aspect-4/3">
                  <Image
                    src="https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=85"
                    alt="Resort suite and pool listed on ResortCloud"
                    fill
                    sizes="(min-width: 1024px) 40vw, 100vw"
                    className="object-cover"
                  />
                  <div className="absolute left-4 top-4 rounded-full bg-white px-3 py-1 text-sm font-semibold">
                    Published
                  </div>
                </div>
                <div className="p-5">
                  <p className="text-sm font-medium text-sky-700">
                    Nasugbu, Batangas
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold">
                    Azure Tide Beach Resort
                  </h2>
                  <p className="mt-3 text-sm text-zinc-600">
                    Family villa, pool access, breakfast bundle, function hall,
                    housekeeping, and add-on island tour.
                  </p>
                  <div className="mt-5 grid grid-cols-3 gap-2 text-center text-sm">
                    <div className="rounded-xl bg-zinc-100 p-3">
                      <p className="font-semibold">8 pax</p>
                      <p className="text-zinc-500">capacity</p>
                    </div>
                    <div className="rounded-xl bg-zinc-100 p-3">
                      <p className="font-semibold">₱8,450</p>
                      <p className="text-zinc-500">per night</p>
                    </div>
                    <div className="rounded-xl bg-zinc-100 p-3">
                      <p className="font-semibold">4.96</p>
                      <p className="text-zinc-500">rating</p>
                    </div>
                  </div>
                  <div className="mt-5 rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
                    Booking widget connected to tenant inventory
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-zinc-200 bg-[#1c1c1c] px-4 py-12 text-white sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {proofStats.map((stat) => (
            <div key={stat.label}>
              <p className="text-4xl font-light tracking-tight">{stat.value}</p>
              <p className="mt-2 text-base font-semibold">{stat.label}</p>
              <p className="mt-1 text-sm text-zinc-400">{stat.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-sm font-semibold text-sky-700">
              Why owners switch
            </p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
              Your resort should not run on chat threads and spreadsheets.
            </h2>
            <p className="mt-5 text-lg leading-8 text-zinc-600">
              The public listing is only one part. ResortCloud is designed so
              the booking, payment, staff workflow, and owner dashboard stay
              connected after a guest clicks inquire.
            </p>
          </div>
          <div className="grid gap-4">
            {ownerProblems.map((problem) => (
              <div
                key={problem}
                className="flex gap-4 rounded-2xl border border-zinc-200 p-5"
              >
                <div className="mt-1 grid size-7 shrink-0 place-items-center rounded-full bg-sky-900 text-white">
                  <Check className="size-4" />
                </div>
                <p className="text-lg text-zinc-700">{problem}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="platform"
        className="bg-zinc-50 px-4 py-16 sm:px-6 lg:px-8 lg:py-24"
      >
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold text-sky-700">
              One operating system
            </p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
              Publish, sell, collect, operate, and report from one tenant
              workspace.
            </h2>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {operatingSystemFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <article
                  key={feature.title}
                  className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
                >
                  <div className="mb-6 grid size-12 place-items-center rounded-xl bg-sky-50 text-sky-800">
                    <Icon className="size-6" />
                  </div>
                  <h3 className="text-xl font-semibold">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-zinc-600">
                    {feature.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="publish" className="px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="text-sm font-semibold text-sky-700">
              From setup to bookings
            </p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
              Launch your resort storefront without waiting on developers.
            </h2>
            <p className="mt-5 text-lg leading-8 text-zinc-600">
              Use ResortCloud&apos;s resort foundation template, upload photos,
              choose brand colors, publish rooms and packages, then connect
              payments and workflows.
            </p>
            <Button
              asChild
              className="mt-8 h-12 rounded-full bg-sky-900 px-6 text-white hover:bg-sky-800"
            >
              <Link href="/auth/sign-up">List your resort</Link>
            </Button>
          </div>

          <div className="relative">
            <div className="absolute bottom-6 left-6 top-6 hidden w-px bg-zinc-200 sm:block" />
            <div className="space-y-5">
              {publishingSteps.map((step, index) => (
                <article
                  key={step.title}
                  className="relative rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
                >
                  <div className="mb-4 inline-grid size-11 place-items-center rounded-full bg-zinc-950 text-sm font-semibold text-white">
                    {index + 1}
                  </div>
                  <h3 className="text-xl font-semibold">{step.title}</h3>
                  <p className="mt-3 text-zinc-600">{step.description}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-black px-4 py-16 text-white sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1fr_0.9fr]">
          <div>
            <p className="text-sm font-semibold text-sky-300">
              Owner dashboard
            </p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
              Know what is happening before month-end.
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-300">
              ResortCloud tracks the signals owners usually chase manually:
              booking conversion, down payment compliance, cancellation risk,
              collection cycle, petty cash, lead aging, attendance, and website
              conversion.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/8 p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["Booking conversion", "38%"],
                ["Down payment compliance", "91%"],
                ["Avg. response time", "14 min"],
                ["Cash collection cycle", "2.8 days"],
                ["Hot leads", "26"],
                ["Widget clicks", "1,284"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-2xl bg-white p-5 text-zinc-950"
                >
                  <p className="text-sm text-zinc-500">{label}</p>
                  <p className="mt-2 text-3xl font-semibold">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="plans" className="px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold text-sky-700">
              Choose the plan that fits your operation
            </p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
              Start simple, then unlock deeper analytics and AI as volume grows.
            </h2>
          </div>

          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {planCards.map((plan) => (
              <article
                key={plan.name}
                className="rounded-2xl border border-zinc-200 bg-white p-7 shadow-sm"
              >
                <h3 className="text-2xl font-semibold">{plan.name}</h3>
                <p className="mt-2 text-zinc-600">{plan.fit}</p>
                <div className="mt-7 border-y border-zinc-200 py-6">
                  <p className="text-4xl font-semibold tracking-tight">
                    {plan.price}
                  </p>
                  <p className="mt-1 text-sm font-medium text-zinc-500">
                    {plan.cadence}
                  </p>
                </div>
                <ul className="mt-7 space-y-4">
                  {plan.items.map((item) => (
                    <li key={item} className="flex gap-3 text-sm text-zinc-700">
                      <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-zinc-50 px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-3">
          {[
            {
              title: "Custom domain handled",
              description:
                "Use a free ResortCloud subdomain or buy and manage a custom domain from the dashboard.",
              icon: Globe2,
            },
            {
              title: "Role-scoped notifications",
              description:
                "Send booking, cash, petty cash, KPI, and department alerts to the people who need them.",
              icon: MessageSquareText,
            },
            {
              title: "Ad-free paid plans",
              description:
                "Trial workspaces can show ads. Paid subscriptions remove ads and unlock production use.",
              icon: ShieldCheck,
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <article
                key={item.title}
                className="rounded-2xl bg-white p-7 shadow-sm"
              >
                <Icon className="size-8 text-sky-800" />
                <h3 className="mt-6 text-2xl font-semibold">{item.title}</h3>
                <p className="mt-3 leading-7 text-zinc-600">
                  {item.description}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section id="faq" className="px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm font-semibold text-sky-700">FAQ</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
              Common owner questions
            </h2>
          </div>
          <Accordion type="single" collapsible className="border-t border-zinc-200">
            {faqItems.map((item) => (
              <AccordionItem key={item.question} value={item.question}>
                <AccordionTrigger className="py-6 text-lg font-semibold hover:no-underline">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="pb-6 text-base leading-7 text-zinc-600">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <section className="bg-[#1c1c1c] px-4 py-16 text-white sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="relative h-12 w-36">
              <Image
                src="/main/logo-dark.png"
                alt="ResortCloud logo"
                fill
                className="object-contain object-left"
                sizes="144px"
              />
            </div>
            <h2 className="mt-8 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
              Ready to publish your resort?
            </h2>
            <p className="mt-4 max-w-2xl text-zinc-300">
              Start with a trial workspace, publish your resort profile, and
              connect the operations your team already runs every day.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="h-13 rounded-full bg-white px-7 text-base font-semibold text-zinc-950 hover:bg-zinc-100"
            >
              <Link href="/auth/sign-up">Start 7-day trial</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-13 rounded-full border-white/20 bg-transparent px-7 text-base font-semibold text-white shadow-none hover:bg-white/10 hover:text-white"
            >
              <Link href="/">View marketplace</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
