export const TENANT_NAVIGATION_DATA = [
  // ===== Overview =====
  {
    label: "Dashboard",
    href: "/tenant/dashboard",
    icon: "House",
    group: "Overview",
  },

  // ===== Foundation & Access =====
  {
    label: "Workspace Access",
    href: "/tenant/access",
    icon: "ShieldCheck",
    group: "Foundation & Access",
    children: [
      { label: "Users & Roles", href: "/tenant/access/users-roles" },
      { label: "Departments", href: "/tenant/access/departments" },
    ],
  },

  // ===== Booking & Sales =====
  {
    label: "Reservations",
    href: "/tenant/reservations",
    icon: "CalendarClock",
    group: "Booking & Sales",
    children: [
      { label: "Calendar", href: "/tenant/reservations/calendar" },
      { label: "Create Booking", href: "/tenant/reservations/new" },
    ],
  },
  {
    label: "Services",
    href: "/tenant/services",
    icon: "Wrench",
    group: "Booking & Sales",
    children: [
      { label: "Services Offered", href: "/tenant/services/offered" },
      { label: "Rooms", href: "/tenant/services/rooms" },
      { label: "Amenities", href: "/tenant/services/amenities" },
    ],
  },
  {
    label: "Guest Experience",
    href: "/tenant/guest-experience",
    icon: "Users",
    group: "Booking & Sales",
    children: [
      { label: "Inquiries", href: "/tenant/guest-experience/inquiries" },
      { label: "Guest Profiles", href: "/tenant/guest-experience/profiles" },
      { label: "Messages", href: "/tenant/guest-experience/messages" },
    ],
  },
  {
    label: "Leads Pipeline",
    href: "/tenant/leads",
    icon: "Flame",
    group: "Booking & Sales",
  },
  {
    label: "Invoices",
    href: "/tenant/invoices",
    icon: "FileText",
    group: "Booking & Sales",
    children: [
      { label: "Create Invoice", href: "/tenant/invoices/new" },
      { label: "Payment Reminders", href: "/tenant/invoices/reminders" },
    ],
  },

  // ===== Finance, HR & Ops =====
  {
    label: "Finance",
    href: "/tenant/finance",
    icon: "CreditCard",
    group: "Finance, HR & Ops",
    children: [
      { label: "Revenue & Expenses", href: "/tenant/finance/revenue-expenses" },
      { label: "Cash Flow", href: "/tenant/finance/cash-flow" },
      { label: "Money Status", href: "/tenant/finance/money-status" },
      { label: "Receipts", href: "/tenant/finance/receipts" },
      { label: "Transaction Export", href: "/tenant/finance/export" },
    ],
  },
  {
    label: "HR",
    href: "/tenant/hr",
    icon: "User",
    group: "Finance, HR & Ops",
    children: [
      { label: "Staff Records", href: "/tenant/hr/staff-records" },
      { label: "Timekeeping", href: "/tenant/hr/timekeeping" },
      { label: "Scheduling", href: "/tenant/hr/scheduling" },
      { label: "Leave Requests", href: "/tenant/hr/leave-requests" },
      { label: "Overtime/Undertime", href: "/tenant/hr/ot-undertime" },
      { label: "Generate Payroll", href: "/tenant/hr/generate-payroll" },
    ],
  },
  {
    label: "Operations",
    href: "/tenant/operations",
    icon: "Wrench",
    group: "Finance, HR & Ops",
    children: [
      { label: "Reception", href: "/tenant/operations/reception" },
      { label: "Housekeeping", href: "/tenant/operations/housekeeping" },
      { label: "Maintenance", href: "/tenant/operations/maintenance" },
      { label: "Laundry", href: "/tenant/operations/laundry" },
      { label: "Inventory", href: "/tenant/operations/inventory" },
    ],
  },

  // ===== Dining =====
  {
    label: "Dining",
    href: "/tenant/dining",
    icon: "UtensilsCrossed",
    group: "Dining",
    children: [
      {
        label: "Kitchen Orders",
        href: "/tenant/dining/kitchen-orders",
        locked: true,
      },
      {
        label: "Waiter Orders",
        href: "/tenant/dining/waiter-orders",
        locked: true,
      },
      {
        label: "Checkout Charges",
        href: "/tenant/dining/checkout-charges",
        locked: true,
      },
    ],
  },

  // ===== Website & Marketing =====
  {
    label: "Website Builder",
    href: "/tenant/website-builder",
    icon: "Globe",
    group: "Website & Marketing",
    locked: true,
  },
  {
    label: "Marketing",
    href: "/tenant/marketing",
    icon: "Megaphone",
    group: "Website & Marketing",
    children: [
      { label: "Campaigns", href: "/tenant/marketing/campaigns", locked: true },
      { label: "Ads", href: "/tenant/marketing/ads", locked: true },
      {
        label: "Email Marketing",
        href: "/tenant/marketing/email",
        locked: true,
      },
      { label: "Social Media", href: "/tenant/marketing/social", locked: true },
    ],
  },

  // ===== Analytics & Growth =====
  {
    label: "Reports & Analytics",
    href: "/tenant/analytics",
    icon: "BarChart3",
    group: "Analytics & Growth",
  },
  {
    label: "AI & Growth",
    href: "/tenant/ai-growth",
    icon: "Sparkles",
    group: "Analytics & Growth",
    locked: true,
  },

  // ===== Settings =====
  {
    label: "Settings",
    href: "/tenant/settings",
    icon: "Settings",
    children: [
      { label: "General", href: "/tenant/settings/general", locked: true },
      {
        label: "Notifications",
        href: "/tenant/settings/notifications",
        locked: true,
      },
      {
        label: "Billing & Subscription",
        href: "/tenant/settings/billing",
        locked: true,
      },
      {
        label: "Integrations",
        href: "/tenant/settings/integrations",
        locked: true,
      },
    ],
  },
] as const;
