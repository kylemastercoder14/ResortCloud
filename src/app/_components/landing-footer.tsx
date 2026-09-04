import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";

const footerStats = [
  {
    value: "4.92",
    label: "average guest rating",
    detail: "across sample resort stays",
  },
  {
    value: "9.1/10",
    label: "booking experience",
    detail: "from direct reservation flows",
  },
  {
    value: "98%",
    label: "guest request resolution",
    detail: "before or during the stay",
  },
  {
    value: "Top 1%",
    label: "owner visibility",
    detail: "for complete published profiles",
  },
];

const footerColumns = [
  {
    title: "Stay",
    links: [
      { label: "Beach resorts", href: "/#stays" },
      { label: "Day tours", href: "/#packages" },
      { label: "Family rooms", href: "/#rooms" },
      { label: "Group packages", href: "/#packages" },
    ],
  },
  {
    title: "Partners",
    links: [
      { label: "List your property", href: "/partners" },
      { label: "Publish services", href: "/partners#platform" },
      { label: "Manage amenities", href: "/partners#platform" },
      { label: "Tenant workspace", href: "/partners#publish" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/#about" },
      { label: "Guest support", href: "/#support" },
      { label: "Owner support", href: "/partners#faq" },
      { label: "Contact", href: "/#contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms of service", href: "#" },
      { label: "Privacy policy", href: "#" },
      { label: "Cancellation policy", href: "#" },
      { label: "Acceptable use", href: "#" },
    ],
  },
];

export function LandingFooter() {
  return (
    <footer className="bg-[#1c1c1c] py-14 text-white lg:px-20">
      <div>
        <p className="text-xs font-semibold uppercase text-zinc-500">
          Why owners hand us the keys
        </p>

        <div className="mt-9 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {footerStats.map((stat) => (
            <div key={stat.label}>
              <p className="text-4xl font-light tracking-tight sm:text-5xl">
                {stat.value}
              </p>
              <p className="mt-2 text-base font-medium text-white">
                {stat.label}
              </p>
              <p className="mt-1 text-sm text-zinc-500">{stat.detail}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 border-t border-white/10 pt-14">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_2fr]">
            <div>
              <Link href="/" className="inline-flex items-center gap-3">
                <span className="relative block h-12 w-36">
                  <Image
                    src="/main/logo-dark.png"
                    alt="ResortCloud logo"
                    fill
                    className="object-contain object-left"
                    sizes="144px"
                  />
                </span>
              </Link>
              <p className="mt-8 text-sm font-semibold text-zinc-400">
                Follow us @resortcloud.ph
              </p>
              <div className="mt-4 flex flex-wrap gap-5 text-base">
                <a
                  href="#"
                  className="inline-flex items-center gap-2 text-white hover:text-amber-300"
                >
                  Instagram
                </a>
                <a href="#" className="text-white hover:text-amber-300">
                  Facebook
                </a>
              </div>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button
                  asChild
                  className="rounded-full bg-white px-5 text-zinc-950 hover:bg-zinc-100"
                >
                  <Link href="/auth/sign-up">List your property</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="rounded-full border-white/20 bg-transparent px-5 text-white shadow-none hover:bg-white/10 hover:text-white"
                >
                  <Link href="/auth/sign-in">Sign in</Link>
                </Button>
              </div>
            </div>

            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {footerColumns.map((column) => (
                <div key={column.title}>
                  <h2 className="text-xs font-semibold uppercase text-zinc-500">
                    {column.title}
                  </h2>
                  <ul className="mt-7 space-y-5">
                    {column.links.map((item) => (
                      <li key={item.label}>
                        <Link
                          href={item.href}
                          className="text-base text-zinc-100 hover:text-amber-300"
                        >
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-14 border-t border-white/10 pt-8">
          <p className="font-serif text-xl italic text-amber-300">
            Where every stay is an experience.
          </p>
          <p className="mt-5 text-sm text-zinc-500">
            (c) 2026 ResortCloud - PIP Spore Technology Inc. All rights
            reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
