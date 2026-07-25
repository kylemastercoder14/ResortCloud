"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconActivity,
  IconAdFilled,
  IconAdjustmentsHorizontalFilled,
  IconBowlSpoonFilled,
  IconBuildingBroadcastTowerFilled,
  IconCalendarFilled,
  IconChartPieFilled,
  IconChevronRight,
  IconClockHour3Filled,
  IconCodeCircle2Filled,
  IconCreditCardFilled,
  IconFidgetSpinnerFilled,
  IconFileInvoiceFilled,
  IconHomeFilled,
  IconLayoutDashboard,
  IconLayoutDashboardFilled,
  IconReceiptFilled,
  IconSettingsFilled,
  IconShieldCheckFilled,
  IconSparkles2Filled,
  IconUserFilled,
} from "@tabler/icons-react";

import { TENANT_NAVIGATION_DATA } from "@/constants/tenant-navigation";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ICONS = {
  House: IconHomeFilled,
  LayoutDashboard: IconLayoutDashboardFilled,
  Flame: IconFidgetSpinnerFilled,
  FileText: IconFileInvoiceFilled,
  User: IconUserFilled,
  Wrench: IconAdjustmentsHorizontalFilled,
  UtensilsCrossed: IconBowlSpoonFilled,
  Globe: IconCodeCircle2Filled,
  Megaphone: IconAdFilled,
  Sparkles: IconSparkles2Filled,
  Clock3: IconClockHour3Filled,
  CalendarClock: IconCalendarFilled,
  CreditCard: IconCreditCardFilled,
  Landmark: IconBuildingBroadcastTowerFilled,
  ReceiptText: IconReceiptFilled,
  BarChart3: IconChartPieFilled,
  ShieldCheck: IconShieldCheckFilled,
  Activity: IconActivity,
  Settings: IconSettingsFilled,
} as const;

const PRIMARY_ITEMS = TENANT_NAVIGATION_DATA.filter(
  (item) => item.label !== "Settings",
);
const SETTINGS_ITEM = TENANT_NAVIGATION_DATA.find(
  (item) => item.label === "Settings",
);

export function TenantSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden h-full w-60 shrink-0 flex-col overflow-hidden bg-[#EBEBEB] px-3 py-3 lg:flex">
      <nav className="no-scrollbar min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="space-y-1">
          {PRIMARY_ITEMS.slice(0, 5).map((item) => (
            <NavItem key={item.label} item={item} pathname={pathname} />
          ))}
        </div>

        <SidebarSection title="Operations">
          {PRIMARY_ITEMS.slice(5, 8).map((item) => (
            <NavItem key={item.label} item={item} pathname={pathname} />
          ))}
        </SidebarSection>

        <SidebarSection title="Apps">
          {PRIMARY_ITEMS.slice(8).map((item) => (
            <NavItem key={item.label} item={item} pathname={pathname} />
          ))}
          {SETTINGS_ITEM ? (
            <NavItem item={SETTINGS_ITEM} pathname={pathname} />
          ) : null}
        </SidebarSection>
      </nav>
      <div className="shrink-0 space-y-3 pt-3">
        <TrialCard />
      </div>
    </aside>
  );
}

function SidebarSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-5">
      <div className="mb-2 flex items-center gap-1 px-3 text-xs font-semibold text-[#303030]">
        {title}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function NavItem({
  item,
  pathname,
}: {
  item: (typeof TENANT_NAVIGATION_DATA)[number];
  pathname: string;
}) {
  const Icon = ICONS[item.icon as keyof typeof ICONS] ?? IconLayoutDashboard;
  const children = "children" in item ? item.children : undefined;
  const locked = isLocked(item);
  const activeChildHref = children
    ?.filter(
      (child) =>
        pathname === child.href || pathname.startsWith(`${child.href}/`),
    )
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  const isActive =
    pathname === item.href ||
    pathname.startsWith(`${item.href}/`) ||
    Boolean(activeChildHref);

  if (children?.length) {
    return (
      <Collapsible defaultOpen={isActive}>
        <CollapsibleTrigger asChild>
          <button
            className={cn(
              "group flex h-9 w-full items-center gap-3 rounded-lg px-3 text-left text-xs font-semibold text-[#303030] hover:bg-[#f7f7f7]",
              locked && "text-[#777777]",
              isActive && "bg-white shadow-sm",
            )}
            type="button"
          >
            <Icon className="size-4 text-[#4a4a4a]" />
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {locked ? <SoonBadge /> : null}
            <IconChevronRight className="size-4 text-[#616161] transition-transform duration-200 ease-out group-data-[state=open]:rotate-90" />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="ml-6 mt-1 space-y-1 pl-2">
          {children.map((child) => {
            const childActive = activeChildHref === child.href;
            const childLocked = isLocked(child);
            const childClassName = cn(
              "flex items-center justify-between gap-2 rounded-md px-3 py-1.5 text-xs font-medium text-[#4a4a4a] hover:bg-[#f7f7f7]",
              childActive && "font-semibold text-[#1f1f1f]",
              childLocked &&
                "cursor-not-allowed text-[#858585] hover:bg-transparent",
            );

            return childLocked ? (
              <span
                key={child.href}
                aria-disabled="true"
                className={childClassName}
              >
                <span className="min-w-0 truncate">{child.label}</span>
                <SoonBadge />
              </span>
            ) : (
              <Link
                key={child.href}
                href={child.href}
                className={childClassName}
              >
                <span className="min-w-0 truncate">{child.label}</span>
              </Link>
            );
          })}
        </CollapsibleContent>
      </Collapsible>
    );
  }

  const linkClassName = cn(
    "flex h-9 items-center gap-3 rounded-lg px-3 text-xs font-semibold text-[#303030] hover:bg-[#f7f7f7]",
    isActive && "bg-white",
    locked && "cursor-not-allowed text-[#777777] hover:bg-transparent",
  );
  const linkContent = (
    <>
      <Icon className="size-4 text-[#4a4a4a]" />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {locked ? <SoonBadge /> : null}
    </>
  );

  return locked ? (
    <span aria-disabled="true" className={linkClassName}>
      {linkContent}
    </span>
  ) : (
    <Link href={item.href} className={linkClassName}>
      {linkContent}
    </Link>
  );
}

function isLocked(item: object) {
  return "locked" in item && item.locked === true;
}

function SoonBadge() {
  return (
    <span className="shrink-0 rounded-full border border-[#d7d7d7] bg-white px-1.5 py-0.5 text-[10px] font-bold leading-none text-[#606060]">
      Soon
    </span>
  );
}

function TrialCard() {
  return (
    <div className="rounded-xl bg-[#061615] p-4 text-white shadow-sm">
      <p className="text-sm font-semibold tracking-tight text-white/60">
        Trial ends in 7 days
      </p>
      <p className="mt-1 text-base font-bold tracking-tight text-white">
        Subscribe for ₱499
      </p>
      <Button size="sm" variant="secondary" className="mt-4 w-full">
        Select a plan
      </Button>
    </div>
  );
}
