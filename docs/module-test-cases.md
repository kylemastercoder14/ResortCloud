# ResortCloud Module Test Cases

Status rules:
- `Passed` means route exists with `page.tsx`.
- `Coming soon` means nav item is locked or route page does not exist yet.

## Overview

| Module | Route | Status | Test cases |
| --- | --- | --- | --- |
| Dashboard | `/tenant/dashboard` | Passed | Page loads; KPI cards render; dashboard widgets do not throw console errors. |

## Foundation & Access

| Module | Route | Status | Test cases |
| --- | --- | --- | --- |
| Workspace Access | `/tenant/access` | Coming soon | Parent route intentionally has no page yet; sidebar expands children. |
| Users & Roles | `/tenant/access/users-roles` | Passed | List loads from backend; search/status filter works; action dropdown opens; create/update route works; invite user flow opens dialog. |
| Users & Roles Form | `/tenant/access/users-roles/[userRoleId]` | Passed | Create mode loads; update mode loads by id; permissions sheet saves/closes; optional fields allow empty values. |
| Departments | `/tenant/access/departments` | Passed | List loads from backend; filter/search works; action dropdown opens; more actions export options work. |
| Departments Form | `/tenant/access/departments/[departmentId]` | Passed | Create/update form loads; staff group sheet shows tenant staff; department head assignment works. |

## Booking & Sales

| Module | Route | Status | Test cases |
| --- | --- | --- | --- |
| Reservations | `/tenant/reservations` | Coming soon | Parent route intentionally has no page yet; sidebar expands children. |
| Calendar | `/tenant/reservations/calendar` | Passed | Calendar loads reservations from DB; booking data appears on correct dates; empty state renders. |
| Create Booking | `/tenant/reservations/new` | Passed | Room select uses room module; totals update; save creates booking; optional email triggers confirmation email when present. |
| Services | `/tenant/services` | Coming soon | Parent route intentionally has no page yet; sidebar expands children. |
| Services Offered | `/tenant/services/offered` | Passed | Service list loads; create/update route works; payment method select works; backend mutations persist data. |
| Services Offered Form | `/tenant/services/offered/[serviceId]` | Passed | Create/update form loads; rounded inputs render; validation blocks invalid values. |
| Rooms | `/tenant/services/rooms` | Passed | List/grid view toggle works; images render in grid; table actions dropdown opens; peso rate displays. |
| Rooms Form | `/tenant/services/rooms/[roomId]` | Passed | Create/update form loads; creatable selects work; amenities module data appears; UploadThing photos upload and preview. |
| Amenities | `/tenant/services/amenities` | Passed | List loads; fee displays with peso sign; action dropdown opens; drag sort updates order. |
| Amenities Form | `/tenant/services/amenities/[amenityId]` | Passed | Create/update form loads; category creatable select works; emoji picker works; fee uses number input. |
| Guest Experience | `/tenant/guest-experience` | Coming soon | Parent route intentionally has no page yet; sidebar expands children. |
| Inquiries | `/tenant/guest-experience/inquiries` | Coming soon | Route page missing; add page before enabling nav. |
| Guest Profiles | `/tenant/guest-experience/profiles` | Coming soon | Route page missing; add page before enabling nav. |
| Messages | `/tenant/guest-experience/messages` | Coming soon | Route page missing; add page before enabling nav. |
| Leads Pipeline | `/tenant/leads` | Passed | Kanban columns render; lead temperature badges use target-date rule; card actions open; search/filter works when implemented. |
| Invoices | `/tenant/invoices` | Passed | Invoice list loads; invoice numbers auto-generate series; mark paid updates finance records; print invoice saves PDF. |
| Create Invoice | `/tenant/invoices/new` | Passed | Create/update invoice form loads; line items calculate total/balance; payment method select works. |
| Payment Reminders | `/tenant/invoices/reminders` | Passed | Reminder list loads; manual send action works; action dropdown opens; cron endpoint/job can evaluate cadence. |

## Finance, HR & Ops

| Module | Route | Status | Test cases |
| --- | --- | --- | --- |
| Finance | `/tenant/finance` | Coming soon | Parent route intentionally has no page yet; sidebar expands children. |
| Revenue & Expenses | `/tenant/finance/revenue-expenses` | Passed | Backend data loads; revenue from paid invoices appears; expense rows appear; receipt view action opens; filters/search work. |
| Revenue & Expenses Form | `/tenant/finance/revenue-expenses/[revenueExpenseId]` | Passed | Create/update entry loads; category creatable select works; department select uses departments module; receipt upload works. |
| Cash Flow | `/tenant/finance/cash-flow` | Passed | Cash inflow/outflow rows match finance and invoice data; table actions are functional or absent; export more actions open. |
| Money Status | `/tenant/finance/money-status` | Passed | Cash/bank/receivable totals match paid/open invoices and finance entries; account cards retain UI. |
| Receipts | `/tenant/finance/receipts` | Passed | Tabs, filters, sort, grid/list view work; upload receipt works; matched receipts link to finance entries. |
| Transaction Export | `/tenant/finance/export` | Passed | Export jobs load from DB; download icon downloads file; new export supports CSV, PDF, TXT, XLSX. |
| HR | `/tenant/hr` | Coming soon | Parent route intentionally has no page yet; sidebar expands children. |
| Staff Records | `/tenant/hr/staff-records` | Passed | Staff table matches finance table layout; data comes from users/roles staff; actions dropdown icons render. |
| Timekeeping | `/tenant/hr/timekeeping` | Passed | Time logs load; clock in/out button creates/updates current staff log when user is staff; filters/search work. |
| Scheduling | `/tenant/hr/scheduling` | Passed | Weekly view loads shifts; assign shift sheet works; edit/duplicate/delete actions work; delete shows alert dialog. |
| Leave Requests | `/tenant/hr/leave-requests` | Passed | Requests load; new leave dialog saves; leave type creatable select works; approve/reject/edit actions work. |
| Overtime/Undertime | `/tenant/hr/ot-undertime` | Passed | OT/undertime entries load; new request saves; approve/reject actions update status and totals. |
| Operations | `/tenant/operations` | Coming soon | Parent route intentionally has no page yet; sidebar expands children. |
| Reception | `/tenant/operations/reception` | Passed | Guest lookup works; new walk-in sheet saves; send request uses departments; shift notes save; check-in/checkout actions update cards. |
| Housekeeping | `/tenant/operations/housekeeping` | Passed | Room status board loads rooms; date picker filters by date; ready-for-occupancy uses staff; damage report creates maintenance request. |
| Maintenance | `/tenant/operations/maintenance` | Passed | Requests load; housekeeping damage reports appear; status/action controls update records; filters/search work. |
| Laundry | `/tenant/operations/laundry` | Passed | Laundry table loads; intake sheet saves; category creatable select works; due date/time picker works; status actions update jobs. |
| Inventory | `/tenant/operations/inventory` | Passed | Inventory table loads; manual movements update stock; action dropdown opens; add/edit/delete flows work. |
| Inventory Form | `/tenant/operations/inventory/[inventoryId]` | Passed | Create/update item form loads; validation and save work. |

## Dining

| Module | Route | Status | Test cases |
| --- | --- | --- | --- |
| Dining | `/tenant/dining` | Coming soon | Parent route intentionally has no page yet; sidebar expands locked children. |
| Kitchen Orders | `/tenant/dining/kitchen-orders` | Coming soon | Locked in navigation; should show coming soon state or remain inaccessible. |
| Waiter Orders | `/tenant/dining/waiter-orders` | Coming soon | Locked in navigation; should show coming soon state or remain inaccessible. |
| Checkout Charges | `/tenant/dining/checkout-charges` | Coming soon | Locked in navigation; should show coming soon state or remain inaccessible. |

## Website & Marketing

| Module | Route | Status | Test cases |
| --- | --- | --- | --- |
| Website Builder | `/tenant/website-builder` | Coming soon | Locked in navigation; should show coming soon state or remain inaccessible. |
| Marketing | `/tenant/marketing` | Coming soon | Parent route page missing; add page before enabling nav. |
| Ads | `/tenant/marketing/ads` | Coming soon | Route page missing; add page before enabling nav. |
| Leads Pipeline | `/tenant/marketing/leads-pipeline` | Coming soon | Route page missing; decide whether to reuse `/tenant/leads`. |

## Analytics & Growth

| Module | Route | Status | Test cases |
| --- | --- | --- | --- |
| Reports & Analytics | `/tenant/analytics` | Passed | Page loads; reports/analytics shell renders; no console errors. |
| AI & Growth | `/tenant/ai-growth` | Coming soon | Route page missing; add page before enabling nav. |

## Settings

| Module | Route | Status | Test cases |
| --- | --- | --- | --- |
| Settings | `/tenant/settings` | Coming soon | Parent route page missing; sidebar expands children if rendered. |
| General | `/tenant/settings/general` | Coming soon | Route page missing; add page before enabling nav. |
| Notifications | `/tenant/settings/notifications` | Coming soon | Route page missing; add page before enabling nav. |
| Billing & Subscription | `/tenant/settings/billing` | Coming soon | Route page missing; add page before enabling nav. |
| Integrations | `/tenant/settings/integrations` | Coming soon | Route page missing; add page before enabling nav. |

## Regression Smoke Test

Run these after module changes:

1. Navigate every `Passed` route from sidebar.
2. Confirm page renders without 404.
3. Confirm loading state uses skeleton or stable empty state.
4. Confirm table search/filter does not break pagination.
5. Open every row action dropdown.
6. For delete/destructive actions, confirm alert dialog appears.
7. For create/update forms, submit invalid form and valid form.
8. Confirm saved data persists after refresh.
9. Run typecheck and lint:

```bash
npx tsc --noEmit
npx eslint
```
