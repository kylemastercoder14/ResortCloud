"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ChevronRight,
  CreditCard,
  FileText,
  Landmark,
  ReceiptText,
  Wallet,
  WalletCards,
} from "lucide-react";
import {
  IconBellFilled,
  IconBuildingBank,
  IconCashBanknote,
  IconCoin,
  IconWallet,
} from "@tabler/icons-react";

import { KpiGrid, type KpiGridItem } from "@/components/reusable/kpi-grid";
import { TenantBreadcrumb } from "@/components/tenant/tenant-breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTRPC } from "@/trpc/client";

const ACCOUNT_ICONS = {
  "Cash drawer": IconCashBanknote,
  "E-wallet": IconWallet,
  "Operating bank": IconBuildingBank,
  "Petty cash": IconCoin,
} as const;

export function MoneyStatusView() {
  const trpc = useTRPC();
  const financeEntries = useQuery({
    ...trpc.tenant.financeEntries.list.queryOptions(),
    retry: false,
  });
  const invoices = useQuery({
    ...trpc.tenant.invoices.list.queryOptions(),
    retry: false,
  });
  const isLoading = financeEntries.isPending || invoices.isPending;
  const totals = useMemo(() => {
    const entries = financeEntries.data ?? [];
    const invoiceRows = invoices.data ?? [];
    const clearedRevenue = entries
      .filter((entry) => entry.type === "Revenue" && entry.status === "Cleared")
      .reduce((total, entry) => total + parseMoney(entry.amount), 0);
    const clearedExpenses = entries
      .filter((entry) => entry.type === "Expense" && entry.status === "Cleared")
      .reduce((total, entry) => total + parseMoney(entry.amount), 0);
    const pendingExpenses = entries
      .filter((entry) => entry.type === "Expense" && entry.status === "Pending")
      .reduce((total, entry) => total + parseMoney(entry.amount), 0);
    const receivables = invoiceRows
      .filter((invoice) => !["Paid", "Void"].includes(invoice.status))
      .reduce((total, invoice) => total + parseMoney(invoice.balanceDue), 0);
    const openDueThisWeek = invoiceRows
      .filter((invoice) => !["Paid", "Void"].includes(invoice.status))
      .filter((invoice) => isWithinDays(invoice.dueDate, 7))
      .reduce((total, invoice) => total + parseMoney(invoice.balanceDue), 0);
    const paidInvoices = invoiceRows.filter((invoice) => invoice.status === "Paid");
    const cashInvoicePayments = paidInvoices
      .filter((invoice) => getPaymentAccount(invoice.paymentMethod) === "cash")
      .reduce((total, invoice) => total + parseMoney(invoice.totalAmount), 0);
    const bankInvoicePayments = paidInvoices
      .filter((invoice) => getPaymentAccount(invoice.paymentMethod) === "bank")
      .reduce((total, invoice) => total + parseMoney(invoice.totalAmount), 0);
    const eWalletInvoicePayments = paidInvoices
      .filter((invoice) => getPaymentAccount(invoice.paymentMethod) === "ewallet")
      .reduce((total, invoice) => total + parseMoney(invoice.totalAmount), 0);
    const cashDrawer = cashInvoicePayments;
    const eWallet = eWalletInvoicePayments;
    const bankBalance = clearedRevenue + bankInvoicePayments - clearedExpenses;
    const pettyCash = 0;
    const cashOnHand = bankBalance + cashDrawer + eWallet + pettyCash;
    const watchlist = [
      pettyCash < 5000,
      openDueThisWeek > 0,
      pendingExpenses > 0,
    ].filter(Boolean).length;

    return {
      bankBalance,
      cashDrawer,
      cashOnHand,
      eWallet,
      openDueThisWeek,
      pendingExpenses,
      pettyCash,
      receivables,
      watchlist,
    };
  }, [financeEntries.data, invoices.data]);
  const value = (content: React.ReactNode) =>
    isLoading ? <Skeleton className="h-8 w-24" /> : content;
  const kpiItems: KpiGridItem[] = [
    {
      title: "Cash on hand",
      value: value(formatPeso(String(totals.cashOnHand))),
      note: "Available operating cash",
      icon: <Wallet className="size-4" />,
    },
    {
      title: "Bank balance",
      value: value(formatPeso(String(totals.bankBalance))),
      note: "Estimated operating bank",
      icon: <Landmark className="size-4" />,
    },
    {
      title: "Receivables",
      value: value(formatPeso(String(totals.receivables))),
      note: "Open invoices",
      icon: <CreditCard className="size-4" />,
    },
    {
      title: "Watchlist",
      value: value(totals.watchlist),
      note: "Needs attention",
      icon: <AlertCircle className="size-4" />,
    },
  ];
  const accounts = [
    ["Operating bank", "Estimated from cleared cash", formatPeso(String(totals.bankBalance)), getHealthLabel(totals.bankBalance, 10000)],
    ["Cash drawer", "Front office", formatPeso(String(totals.cashDrawer)), "Count today"],
    ["E-wallet", "Resort wallet", formatPeso(String(totals.eWallet)), getHealthLabel(totals.eWallet, 3000)],
    ["Petty cash", "Maintenance", formatPeso(String(totals.pettyCash)), getHealthLabel(totals.pettyCash, 5000)],
  ] as const;
  const attentionItems = [
    {
      icon: WalletCards,
      iconClassName: "bg-zinc-100 text-zinc-950",
      title: totals.pettyCash < 5000 ? "Petty cash is below threshold" : "Petty cash is healthy",
      value: `Current balance: ${formatPeso(String(totals.pettyCash))}`,
      valueClassName: "text-zinc-950",
    },
    {
      icon: FileText,
      iconClassName: "bg-zinc-100 text-zinc-950",
      title: "Open invoices due this week",
      value: `Total amount: ${formatPeso(String(totals.openDueThisWeek))}`,
      valueClassName: "text-zinc-950",
    },
    {
      icon: CreditCard,
      iconClassName: "bg-zinc-100 text-zinc-950",
      title: "Pending expense review",
      value: totals.pendingExpenses
        ? `Pending amount: ${formatPeso(String(totals.pendingExpenses))}`
        : "No pending expenses",
      valueClassName: totals.pendingExpenses ? "text-zinc-950" : "text-zinc-500",
    },
  ] as const;
  const overview = buildCashOverview(totals);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TenantBreadcrumb />
        <Button variant="outline" size="xs">Reconcile</Button>
      </div>
      <KpiGrid columnsClassName="sm:grid-cols-2 xl:grid-cols-4" items={kpiItems} />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <Card className="gap-0 overflow-hidden rounded-xl h-fit border-zinc-200 bg-white p-0">
            <div className="border-b border-zinc-200 px-5 py-4">
              <h2 className="text-base font-bold text-[#303030]">Money accounts</h2>
              <p className="mt-1 text-sm text-zinc-500">Bank, cash, and wallet balances.</p>
            </div>
            {accounts.map(([name, detail, amount, status]) => {
              const Icon = ACCOUNT_ICONS[name as keyof typeof ACCOUNT_ICONS];

              return (
                <div key={name} className="flex items-center justify-between gap-4 border-b border-zinc-200 px-5 py-4 last:border-b-0">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-zinc-600"><Icon className="size-4" /></div>
                    <div><p className="font-bold text-zinc-950">{name}</p><p className="text-xs font-medium text-zinc-500">{detail}</p></div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-zinc-950">{isLoading ? <Skeleton className="h-5 w-20" /> : amount}</p>
                    <Badge variant="secondary">{status}</Badge>
                  </div>
                </div>
              );
            })}
          </Card>
          <Card className="rounded-xl bg-accent p-5">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.75 size-4 shrink-0" />
              <div>
                <h3 className="text-sm font-semibold">Daily money check reminder</h3>
                <p className="mt-1 text-xs font-medium text-muted-foreground">
                  Reconcile cash drawer and petty cash before closing shift.
                  Bank and wallet balances refresh after provider sync.
                </p>
              </div>
            </div>
          </Card>
        </div>
        <Card className="gap-4 rounded-2xl border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <IconBellFilled className="size-4" />
            <h2 className="text-base font-bold text-[#303030]">Attention</h2>
          </div>
          <div className="space-y-3">
            {attentionItems.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.title}
                  type="button"
                  className="flex w-full items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3 text-left shadow-xs transition hover:bg-zinc-50"
                >
                  <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${item.iconClassName}`}>
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-zinc-900">{item.title}</span>
                    <span className="block truncate text-xs font-semibold">
                      <span className={item.valueClassName}>{isLoading ? "Loading..." : item.value}</span>
                    </span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-zinc-500" />
                </button>
              );
            })}
          </div>

          <div className="rounded-xl border border-zinc-200 p-4">
            <div className="flex items-center gap-1">
              <h3 className="text-sm font-bold text-zinc-950">Cash overview</h3>
              <span className="text-xs font-semibold text-zinc-500">(This month)</span>
            </div>
            <div className="mt-5 grid grid-cols-[120px_minmax(0,1fr)] items-center gap-5">
              <div
                className="relative size-28 rounded-full"
                style={{ background: overview.conicGradient }}
              >
                <div className="absolute inset-8 rounded-full bg-white" />
              </div>
              <div className="space-y-3">
                {overview.items.map((item) => (
                  <div key={item.label} className="grid grid-cols-[12px_minmax(0,1fr)_auto] items-center gap-2 text-xs">
                    <span className={`size-2 rounded-full ${item.color}`} />
                    <span className="truncate font-semibold text-zinc-500">{item.label}</span>
                    <span className="font-bold text-zinc-900">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <Button variant="outline" size="xs" className="mt-5 w-full">
              <ReceiptText className="size-4" />
              View financial report
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function buildCashOverview(totals: {
  bankBalance: number;
  cashDrawer: number;
  cashOnHand: number;
  eWallet: number;
  receivables: number;
}) {
  const cash = Math.max(totals.cashDrawer, 0);
  const bank = Math.max(totals.bankBalance, 0);
  const receivables = Math.max(totals.receivables, 0);
  const other = Math.max(totals.eWallet, 0);
  const total = cash + bank + receivables + other || 1;
  const cashPct = Math.round((cash / total) * 100);
  const bankPct = Math.round((bank / total) * 100);
  const receivablePct = Math.round((receivables / total) * 100);
  const otherPct = Math.max(0, 100 - cashPct - bankPct - receivablePct);
  const bankEnd = cashPct + bankPct;
  const receivableEnd = bankEnd + receivablePct;

  return {
    conicGradient: `conic-gradient(#000000 0 ${cashPct}%,#3f3f46 ${cashPct}% ${bankEnd}%,#a1a1aa ${bankEnd}% ${receivableEnd}%,#e4e4e7 ${receivableEnd}% 100%)`,
    items: [
      { color: "bg-black", label: "Cash on hand", value: `${cashPct}%` },
      { color: "bg-zinc-700", label: "Bank balance", value: `${bankPct}%` },
      { color: "bg-zinc-400", label: "Receivables", value: `${receivablePct}%` },
      { color: "bg-zinc-200", label: "Other", value: `${otherPct}%` },
    ],
  };
}

function getHealthLabel(amount: number, threshold: number) {
  if (amount < 0) return "Deficit";
  if (amount === 0) return "No balance";
  if (amount < threshold) return "Low";
  return "Healthy";
}

function getPaymentAccount(method?: string | null) {
  const normalized = String(method ?? "").toLowerCase();
  if (normalized.includes("e-wallet") || normalized.includes("wallet")) {
    return "ewallet";
  }
  if (normalized.includes("cash")) return "cash";
  return "bank";
}

function isWithinDays(value: Date | string, days: number) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const future = new Date(now);
  future.setDate(future.getDate() + days);

  return date.getTime() >= now.getTime() && date.getTime() <= future.getTime();
}

function parseMoney(value: string) {
  const amount = Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(amount) ? amount : 0;
}

function formatPeso(value: string) {
  const amount = parseMoney(value);
  return `\u20b1${amount.toLocaleString("en-PH", { maximumFractionDigits: 2 })}`;
}
