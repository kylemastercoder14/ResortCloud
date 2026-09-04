import Image from "next/image";
import Link from "next/link";

import { LandingMenu } from "@/app/_components/landing-menu";
import { Button } from "@/components/ui/button";

const navLinks = [
  { label: "Beachfront", href: "/#beachfront" },
  { label: "Rooms", href: "/#rooms" },
  { label: "Packages", href: "/#packages" },
  { label: "Amenities", href: "/#amenities" },
  { label: "Partners", href: "/partners" },
];

export function LandingHeader() {
  return (
    <header className="absolute inset-x-0 top-0 z-50 lg:px-20 py-5 text-white">
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-xl font-bold tracking-tight"
        >
          <Image
            src="/main/logo-dark.png"
            alt="ResortCloud logo"
            width={44}
            height={44}
            className="size-11 object-contain"
            priority
          />
          ResortCloud
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-white/80 lg:flex">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-white">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="outline"
            className="hidden rounded-full border-white/25 bg-white/10 px-4 text-white shadow-none hover:bg-white/20 hover:text-white sm:inline-flex"
          >
            <Link href="/partners">List your property</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="hidden rounded-full border-white/25 bg-white/10 px-4 text-white shadow-none hover:bg-white/20 hover:text-white sm:inline-flex"
          >
            <Link href="/auth/sign-in">Sign in</Link>
          </Button>
          <LandingMenu />
        </div>
      </div>
    </header>
  );
}
