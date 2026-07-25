import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { generateRandomString, hashPassword } from "better-auth/crypto";
import { Prisma } from "@/generated/prisma/client";
import {
  getAppRedirectPath,
  getTenantOnboardingStatusForAccess,
} from "@/lib/auth-redirect";
import {
  sendReservationConfirmationEmail,
  sendStaffInviteEmail,
} from "@/lib/invite-email";
import { sendInvoiceReminderNow } from "@/lib/invoice-reminders";
import {
  generateInviteToken,
  getInviteExpiresAt,
  hashInviteToken,
} from "@/lib/invite-token";
import {
  extractMessengerTargetDate,
  fetchMessengerProfile,
  inferMessengerLeadStage,
} from "@/lib/messenger-leads";
import { prisma } from "@/lib/prisma";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";

const roleSchema = z.enum(["ADMIN", "ADMIN_STAFF", "TENANT", "TENANT_STAFF", "CUSTOMER"]);
const planSchema = z.enum(["free_trial", "starter", "growth", "enterprise"]);
const billingSchema = z.enum(["monthly", "yearly"]);
const tenantStaffStatusSchema = z.enum(["Active", "Invited", "Suspended"]);
const tenantTimeLogFlagSchema = z.enum(["On time", "Late", "Absent"]);
const tenantScheduleShiftStatusSchema = z.enum(["Assigned", "Open", "Changed"]);
const tenantLeaveRequestStatusSchema = z.enum(["Approved", "Pending", "Rejected"]);
const tenantOtUndertimeTypeSchema = z.enum(["Overtime", "Undertime"]);
const tenantOtUndertimeStatusSchema = z.enum(["Approved", "Pending", "Rejected"]);
const tenantDepartmentStatusSchema = z.enum(["Active", "Paused", "Archived"]);
const tenantAmenityStatusSchema = z.enum(["Active", "Inactive"]);
const tenantAmenityScopeSchema = z.enum(["Room-level", "Property-level"]);
const tenantAmenityFeeUnitSchema = z.enum(["per stay", "per day", "per use"]);
const tenantRoomStatusSchema = z.enum([
  "Available",
  "Occupied",
  "Maintenance",
  "Out of Service",
]);
const tenantHousekeepingStatusSchema = z.enum([
  "Clean",
  "Dirty",
  "Occupied",
  "Vacant",
]);
const tenantRoomSmokingPolicySchema = z.enum(["Non-smoking", "Smoking"]);
const tenantReservationStatusSchema = z.enum([
  "Pending",
  "Confirmed",
  "Checked in",
  "Checked out",
  "Canceled",
]);
const tenantReceptionQueueStatusSchema = z.enum([
  "In-house",
  "Checking out",
  "Completed",
]);
const tenantReceptionRequestPrioritySchema = z.enum(["Normal", "Urgent"]);
const tenantMaintenancePrioritySchema = z.enum(["Normal", "Urgent"]);
const tenantReceptionRequestSchema = z.object({
  department: z.string().trim().min(1, "Department is required."),
  note: z.string().trim().min(1, "Request note is required."),
  priority: tenantReceptionRequestPrioritySchema,
  reservationId: z.string().optional(),
  roomOrArea: z.string().trim().min(1, "Room or area is required."),
});
const tenantReceptionShiftNoteSchema = z.object({
  note: z.string().trim().min(1, "Note is required."),
  title: z.string().trim().min(1, "Title is required."),
});
const tenantMaintenanceRequestSchema = z.object({
  area: z.string().trim().min(1, "Room or area is required."),
  issue: z.string().trim().min(1, "Issue title is required."),
  notes: z.string().optional(),
  priority: tenantMaintenancePrioritySchema,
  roomId: z.string().optional(),
});
const tenantMaintenanceCompleteSchema = z.object({
  id: z.string().trim().min(1, "Request is required."),
  resolution: z.string().trim().min(1, "Resolution is required."),
});
const tenantLaundryStatusSchema = z.enum([
  "Received",
  "Washing",
  "Drying",
  "Ready",
  "Returned",
]);
const tenantLaundryPrioritySchema = z.enum(["Normal", "Urgent"]);
const tenantLaundryJobSchema = z.object({
  category: z.string().trim().min(1, "Category is required."),
  dueTime: z.string().trim().optional(),
  guestOrRoom: z.string().trim().min(1, "Room, guest, or source is required."),
  notes: z.string().optional(),
  pieces: z.coerce.number().int().min(1, "Pieces must be at least 1."),
  priority: tenantLaundryPrioritySchema,
});
const tenantInventoryMovementTypeSchema = z.enum(["IN", "OUT"]);
const tenantInventoryItemSchema = z.object({
  category: z.string().trim().min(1, "Category is required."),
  code: z.string().trim().min(1, "Item code is required."),
  dashboardAlert: z.boolean().default(true),
  description: z.string().optional(),
  id: z.string().optional(),
  name: z.string().trim().min(1, "Item name is required."),
  notes: z.string().optional(),
  quantity: z.coerce.number().int().min(0),
  threshold: z.coerce.number().int().min(0),
  unit: z.string().trim().min(1, "Unit is required."),
});
const tenantInventoryMovementSchema = z.object({
  itemId: z.string().trim().min(1, "Item is required."),
  quantity: z.coerce.number().int().min(1, "Quantity is required."),
  reason: z.string().trim().min(1, "Reason is required."),
  type: tenantInventoryMovementTypeSchema,
});
const tenantHousekeepingPhotoSchema = z.object({
  key: z.string().trim().min(1),
  name: z.string().trim().min(1),
  size: z.number().int().optional(),
  url: z.string().trim().url(),
});
const tenantHousekeepingReadySchema = z.object({
  attendantStaffProfileId: z.string().optional(),
  photo: tenantHousekeepingPhotoSchema.optional(),
  photoNote: z.string().optional(),
  roomId: z.string().trim().min(1, "Room is required."),
});
const tenantHousekeepingDamageSchema = z.object({
  details: z.string().trim().min(1, "Details are required."),
  photo: tenantHousekeepingPhotoSchema.optional(),
  photoNote: z.string().optional(),
  roomId: z.string().trim().min(1, "Room is required."),
  title: z.string().trim().min(1, "Damage title is required."),
});
const tenantServiceStatusSchema = z.enum(["Active", "Inactive"]);
const tenantServiceBillingTypeSchema = z.enum([
  "Fixed price",
  "Per hour",
  "Per guest",
  "Custom quote",
]);
const tenantInvoiceStatusSchema = z.enum([
  "Draft",
  "Sent",
  "Paid",
  "Overdue",
  "Void",
]);
const tenantInvoiceReminderCadenceSchema = z.enum([
  "Standard",
  "Light",
  "Strict",
  "Paused",
]);
const tenantFinanceEntryTypeSchema = z.enum(["Revenue", "Expense"]);
const tenantFinanceEntrySourceSchema = z.enum([
  "Manual entry",
  "Auto booking",
  "Invoice payment",
]);
const tenantFinanceEntryStatusSchema = z.enum(["Cleared", "Pending"]);
const tenantTransactionExportFormatSchema = z.enum(["CSV", "PDF", "TXT", "XLSX"]);
const tenantTransactionExportNameSchema = z.enum([
  "Revenue & expenses",
  "Cash flow",
  "Receipts",
  "Money status",
  "Invoices summary",
]);
const tenantPaymentMethodSchema = z.enum([
  "CREDIT_CARD",
  "BANK_TRANSFER",
  "E_WALLET",
  "CASH_DEPOSIT",
]);
const tenantLeadStageSchema = z.enum([
  "INTAKE",
  "QUALIFIED",
  "PAYMENT_DONE",
  "CONVERTED",
]);
const optionalString = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().optional(),
);
const optionalTrimmedString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().optional(),
);
const optionalRequiredString = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional(),
);
const optionalEmail = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().email().optional(),
);
const optionalUsername = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().min(3, "Username must be at least 3 characters.").optional(),
);
const payrollMoneySchema = z.coerce.number().min(0).default(0);
const tenantPayrollPayTypeSchema = z.enum(["Regular Payroll", "Final Payroll"]);
const tenantPayrollFrequencySchema = z.enum(["Monthly", "Bi-weekly"]);
const tenantPayrollRoundingSchema = z.enum(["Nearest Peso", "None"]);
const tenantPayrollEmployeeOverrideSchema = z.object({
  allowance: payrollMoneySchema.optional(),
  basicSalary: payrollMoneySchema.optional(),
  bonus: payrollMoneySchema.optional(),
  commission: payrollMoneySchema.optional(),
  included: z.boolean().optional(),
  incentives: payrollMoneySchema.optional(),
  otherDeductions: payrollMoneySchema.optional(),
  staffProfileId: z.string(),
});
const tenantPayrollInputSchema = z.object({
  backupPayrollData: z.boolean().default(false),
  createJournalEntry: z.boolean().default(true),
  department: optionalTrimmedString,
  employeeOverrides: z.array(tenantPayrollEmployeeOverrideSchema).default([]),
  frequency: tenantPayrollFrequencySchema.default("Monthly"),
  id: z.string().optional(),
  includeAllowance: z.boolean().default(true),
  includeBasicSalary: z.boolean().default(true),
  includeBonus: z.boolean().default(true),
  includeCommission: z.boolean().default(true),
  includeGovernmentContributions: z.boolean().default(true),
  includeIncentives: z.boolean().default(true),
  includeLeaveDeduction: z.boolean().default(true),
  includeLeaveEncashment: z.boolean().default(false),
  includeOtPay: z.boolean().default(true),
  lockPayrollAfterGeneration: z.boolean().default(true),
  name: z.string().trim().min(1, "Payroll name is required."),
  notes: optionalString,
  payDate: z.coerce.date(),
  payType: tenantPayrollPayTypeSchema.default("Regular Payroll"),
  periodEnd: z.coerce.date(),
  periodStart: z.coerce.date(),
  roundingOption: tenantPayrollRoundingSchema.default("Nearest Peso"),
  sendPayslipNotification: z.boolean().default(false),
});
const tenantLeadSaveSchema = z.object({
  guestName: z.string().trim().min(1, "Guest name is required."),
  id: z.string().optional(),
  inquiry: optionalTrimmedString,
  lastMessage: optionalTrimmedString,
  source: z.string().trim().min(1, "Source is required.").default("Organic"),
  stage: tenantLeadStageSchema.default("INTAKE"),
  targetDate: optionalTrimmedString,
});
const tenantLeadReplySchema = z.object({
  id: z.string().trim().min(1, "Lead is required."),
  text: z.string().trim().min(1, "Reply is required."),
});
const onboardingSchema = z.object({
  resortName: optionalRequiredString,
  propertyType: optionalRequiredString,
  shortDescription: optionalString,
  region: optionalRequiredString,
  province: optionalRequiredString,
  municipality: optionalRequiredString,
  barangay: optionalString,
  fullAddress: optionalRequiredString,
  phoneNumber: optionalRequiredString,
  website: optionalString,
  businessName: optionalString,
  billingEmail: optionalEmail,
  billingPhoneNumber: optionalString,
  billingAddress: optionalString,
  billingCity: optionalString,
  billingStateProvince: optionalString,
  billingPostalCode: optionalString,
  paymentMethod: tenantPaymentMethodSchema.optional(),
  paymentProvider: optionalString,
  paymentAccountName: optionalString,
  paymentAccountNumber: optionalString,
  cardholderName: optionalString,
  cardBrand: optionalString,
  cardLastFour: optionalString,
  cardExpiry: optionalString,
  onboardingCurrentStep: z.number().int().min(0).max(4).optional(),
  complete: z.boolean().optional(),
});
const tenantStaffProfileSchema = z.object({
  id: z.string().optional(),
  firstName: optionalTrimmedString,
  lastName: optionalTrimmedString,
  email: optionalEmail,
  username: optionalUsername,
  password: z.string().min(8, "Password must be at least 8 characters.").optional().or(z.literal("")),
  phoneNumber: optionalString,
  departmentId: optionalString,
  roleName: z.string().trim().min(1, "Role is required."),
  status: tenantStaffStatusSchema,
  permissions: z.array(z.string()).default([]),
  employmentType: optionalString,
  workLocation: optionalString,
  basicSalary: payrollMoneySchema,
  allowance: payrollMoneySchema,
  incentives: payrollMoneySchema,
  commission: payrollMoneySchema,
  bonus: payrollMoneySchema,
  leaveDeduction: payrollMoneySchema,
  sssContribution: payrollMoneySchema,
  philHealthContribution: payrollMoneySchema,
  pagIbigContribution: payrollMoneySchema,
  withholdingTax: payrollMoneySchema,
  otherDeductions: payrollMoneySchema,
  notes: optionalString,
  tags: z.array(z.string()).default([]),
}).refine((value) => value.email || value.username, {
  message: "Email or username is required.",
  path: ["username"],
});
const tenantStaffInviteSchema = z.object({
  email: z.string().trim().email("Valid email is required."),
  message: optionalString,
  roleName: z.string().trim().min(1, "Role is required."),
});
const tenantDepartmentSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Department name is required."),
  code: z.string().trim().min(1, "Department code is required."),
  description: optionalString,
  email: optionalEmail,
  notes: optionalString,
  routing: optionalString,
  status: tenantDepartmentStatusSchema,
  staffProfileIds: z.array(z.string()).default([]),
  headStaffProfileId: optionalString,
});
const tenantAmenitySchema = z.object({
  id: z.string().optional(),
  code: z.string().trim().min(1, "Amenity code is required."),
  name: z.string().trim().min(1, "Amenity name is required."),
  category: z.string().trim().min(1, "Category is required."),
  icon: z.string().trim().min(1, "Icon is required."),
  description: optionalString,
  appliesTo: tenantAmenityScopeSchema,
  chargeable: z.boolean(),
  feeAmount: optionalString,
  feeUnit: tenantAmenityFeeUnitSchema,
  status: tenantAmenityStatusSchema,
  showOnBookingPage: z.boolean(),
  featured: z.boolean(),
  sortOrder: z.coerce.number().int().min(0).default(0),
  internalNotes: optionalString,
});
const tenantRoomPhotoSchema = z.object({
  key: z.string().trim().min(1),
  name: z.string().trim().min(1),
  size: z.number().int().optional(),
  url: z.string().trim().url(),
});
const tenantRoomSchema = z.object({
  id: z.string().optional(),
  code: z.string().trim().min(1, "Room code is required."),
  name: z.string().trim().min(1, "Room name is required."),
  type: z.string().trim().min(1, "Room type is required."),
  building: z.string().trim().min(1, "Building is required."),
  floor: z.string().trim().min(1, "Floor is required."),
  baseRate: z.string().trim().min(1, "Base rate is required."),
  peakRate: optionalString,
  extraPersonCharge: optionalString,
  maxAdults: z.coerce.number().int().min(0),
  childrenOccupancy: z.coerce.number().int().min(0),
  bedConfiguration: z.string().trim().min(1, "Bed configuration is required."),
  roomSize: optionalString,
  viewType: z.string().trim().min(1, "View type is required."),
  smokingPolicy: tenantRoomSmokingPolicySchema,
  status: tenantRoomStatusSchema,
  checkIn: z.string().trim().min(1),
  checkOut: z.string().trim().min(1),
  minNights: z.coerce.number().int().min(1),
  guestNote: optionalString,
  notes: optionalString,
  amenityIds: z.array(z.string()).default([]),
  photos: z.array(tenantRoomPhotoSchema).default([]),
});
const tenantReservationSchema = z.object({
  roomId: z.string().trim().min(1, "Room is required."),
  guestName: z.string().trim().min(1, "Guest name is required."),
  guestEmail: optionalEmail,
  guestPhone: optionalString,
  checkIn: z.string().trim().min(1, "Check-in is required."),
  checkOut: z.string().trim().min(1, "Check-out is required."),
  adults: z.coerce.number().int().min(1),
  children: z.coerce.number().int().min(0),
  rate: z.string().trim().min(1, "Rate is required."),
  deposit: optionalString,
  totalAmount: z.string().trim().min(1, "Total amount is required."),
  paymentMethod: optionalString,
  status: tenantReservationStatusSchema,
  notes: optionalString,
});
const tenantServiceSchema = z.object({
  id: z.string().optional(),
  baseCharge: z.string().trim().min(1, "Base charge is required."),
  billingType: tenantServiceBillingTypeSchema,
  bookingLeadTime: optionalString,
  category: z.string().trim().min(1, "Category is required."),
  code: z.string().trim().min(1, "Service code is required."),
  description: optionalString,
  duration: optionalString,
  feeNote: optionalString,
  internalNotes: optionalString,
  provider: optionalString,
  showOnBookingPage: z.boolean(),
  status: tenantServiceStatusSchema,
  title: z.string().trim().min(1, "Service name is required."),
});
const tenantInvoiceLineItemSchema = z.object({
  amount: z.string().trim().min(1),
  description: z.string().trim().min(1),
  quantity: z.coerce.number().int().min(1),
  rate: z.string().trim().min(1),
});
const tenantInvoiceSchema = z.object({
  id: z.string().optional(),
  balanceDue: z.string().trim().min(1),
  code: z.string().trim().min(1, "Invoice number is required."),
  depositPaid: z.string().trim().default("0"),
  discount: z.string().trim().default("0"),
  dueDate: z.string().trim().min(1, "Due date is required."),
  guestEmail: optionalEmail,
  guestName: z.string().trim().min(1, "Guest name is required."),
  invoiceDate: z.string().trim().min(1, "Invoice date is required."),
  lineItems: z.array(tenantInvoiceLineItemSchema).min(1),
  notes: optionalString,
  paymentInstructions: optionalString,
  paymentMethod: optionalString,
  reminderCadence: tenantInvoiceReminderCadenceSchema,
  reservationId: optionalString,
  status: tenantInvoiceStatusSchema,
  subtotal: z.string().trim().min(1),
  tax: z.string().trim().default("0"),
  totalAmount: z.string().trim().min(1),
});
const tenantFinanceEntrySchema = z.object({
  id: z.string().optional(),
  amount: z.string().trim().min(1, "Amount is required."),
  category: z.string().trim().min(1, "Category is required."),
  code: z.string().trim().optional(),
  department: optionalTrimmedString,
  description: z.string().trim().min(1, "Description is required."),
  entryDate: z.string().trim().min(1, "Entry date is required."),
  notes: optionalTrimmedString,
  receiptKey: optionalTrimmedString,
  receiptName: optionalTrimmedString,
  receiptSize: z.number().int().nonnegative().optional(),
  receiptType: optionalTrimmedString,
  receiptUrl: optionalTrimmedString,
  source: tenantFinanceEntrySourceSchema,
  status: tenantFinanceEntryStatusSchema,
  type: tenantFinanceEntryTypeSchema,
});
const tenantTransactionExportSchema = z.object({
  format: tenantTransactionExportFormatSchema,
  name: tenantTransactionExportNameSchema,
  period: optionalTrimmedString,
});

function toTenantPlan(plan: z.infer<typeof planSchema>) {
  if (plan === "starter") return "STARTER";
  if (plan === "growth") return "GROWTH";
  if (plan === "enterprise") return "ENTERPRISE";
  return "FREE_TRIAL";
}

function toBillingCycle(billing: z.infer<typeof billingSchema>) {
  return billing === "yearly" ? "YEARLY" : "MONTHLY";
}

function getTrialEndDate() {
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 7);
  return trialEndsAt;
}

function toTenantStaffStatus(status: z.infer<typeof tenantStaffStatusSchema>) {
  if (status === "Active") return "ACTIVE";
  if (status === "Suspended") return "SUSPENDED";
  return "INVITED";
}

function fromTenantStaffStatus(status: "ACTIVE" | "INVITED" | "SUSPENDED") {
  if (status === "ACTIVE") return "Active";
  if (status === "SUSPENDED") return "Suspended";
  return "Invited";
}

function toTenantTimeLogFlag(flag: z.infer<typeof tenantTimeLogFlagSchema>) {
  if (flag === "Late") return "LATE";
  if (flag === "Absent") return "ABSENT";
  return "ON_TIME";
}

function fromTenantTimeLogFlag(flag: "ON_TIME" | "LATE" | "ABSENT") {
  if (flag === "LATE") return "Late";
  if (flag === "ABSENT") return "Absent";
  return "On time";
}

function toTenantScheduleShiftStatus(
  status: z.infer<typeof tenantScheduleShiftStatusSchema>,
) {
  if (status === "Open") return "OPEN";
  if (status === "Changed") return "CHANGED";
  return "ASSIGNED";
}

function fromTenantScheduleShiftStatus(status: "ASSIGNED" | "OPEN" | "CHANGED") {
  if (status === "OPEN") return "Open";
  if (status === "CHANGED") return "Changed";
  return "Assigned";
}

function toTenantLeaveRequestStatus(
  status: z.infer<typeof tenantLeaveRequestStatusSchema>,
) {
  if (status === "Approved") return "APPROVED";
  if (status === "Rejected") return "REJECTED";
  return "PENDING";
}

function fromTenantLeaveRequestStatus(
  status: "APPROVED" | "PENDING" | "REJECTED",
) {
  if (status === "APPROVED") return "Approved";
  if (status === "REJECTED") return "Rejected";
  return "Pending";
}

function toTenantOtUndertimeType(
  type: z.infer<typeof tenantOtUndertimeTypeSchema>,
) {
  return type === "Undertime" ? "UNDERTIME" : "OVERTIME";
}

function fromTenantOtUndertimeType(type: "OVERTIME" | "UNDERTIME") {
  return type === "UNDERTIME" ? "Undertime" : "Overtime";
}

function toTenantOtUndertimeStatus(
  status: z.infer<typeof tenantOtUndertimeStatusSchema>,
) {
  if (status === "Approved") return "APPROVED";
  if (status === "Rejected") return "REJECTED";
  return "PENDING";
}

function fromTenantOtUndertimeStatus(
  status: "APPROVED" | "PENDING" | "REJECTED",
) {
  if (status === "APPROVED") return "Approved";
  if (status === "REJECTED") return "Rejected";
  return "Pending";
}

function toTenantDepartmentStatus(status: z.infer<typeof tenantDepartmentStatusSchema>) {
  if (status === "Paused") return "PAUSED";
  if (status === "Archived") return "ARCHIVED";
  return "ACTIVE";
}

function fromTenantDepartmentStatus(status: "ACTIVE" | "PAUSED" | "ARCHIVED") {
  if (status === "PAUSED") return "Paused";
  if (status === "ARCHIVED") return "Archived";
  return "Active";
}

function toTenantAmenityStatus(
  status: z.infer<typeof tenantAmenityStatusSchema>,
): "ACTIVE" | "INACTIVE" {
  return status === "Inactive" ? "INACTIVE" : "ACTIVE";
}

function fromTenantAmenityStatus(status: "ACTIVE" | "INACTIVE") {
  return status === "INACTIVE" ? "Inactive" : "Active";
}

function toTenantAmenityScope(
  scope: z.infer<typeof tenantAmenityScopeSchema>,
): "ROOM_LEVEL" | "PROPERTY_LEVEL" {
  return scope === "Property-level" ? "PROPERTY_LEVEL" : "ROOM_LEVEL";
}

function fromTenantAmenityScope(scope: "ROOM_LEVEL" | "PROPERTY_LEVEL") {
  return scope === "PROPERTY_LEVEL" ? "Property-level" : "Room-level";
}

function toTenantAmenityFeeUnit(
  unit: z.infer<typeof tenantAmenityFeeUnitSchema>,
): "PER_STAY" | "PER_DAY" | "PER_USE" {
  if (unit === "per day") return "PER_DAY";
  if (unit === "per use") return "PER_USE";
  return "PER_STAY";
}

function fromTenantAmenityFeeUnit(unit: "PER_STAY" | "PER_DAY" | "PER_USE") {
  if (unit === "PER_DAY") return "per day";
  if (unit === "PER_USE") return "per use";
  return "per stay";
}

function toTenantRoomStatus(
  status: z.infer<typeof tenantRoomStatusSchema>,
): "AVAILABLE" | "OCCUPIED" | "MAINTENANCE" | "OUT_OF_SERVICE" {
  if (status === "Occupied") return "OCCUPIED";
  if (status === "Maintenance") return "MAINTENANCE";
  if (status === "Out of Service") return "OUT_OF_SERVICE";
  return "AVAILABLE";
}

function fromTenantRoomStatus(
  status: "AVAILABLE" | "OCCUPIED" | "MAINTENANCE" | "OUT_OF_SERVICE",
) {
  if (status === "OCCUPIED") return "Occupied";
  if (status === "MAINTENANCE") return "Maintenance";
  if (status === "OUT_OF_SERVICE") return "Out of Service";
  return "Available";
}

function toTenantHousekeepingStatus(
  status: z.infer<typeof tenantHousekeepingStatusSchema>,
): "CLEAN" | "DIRTY" | "OCCUPIED" | "VACANT" {
  if (status === "Clean") return "CLEAN";
  if (status === "Dirty") return "DIRTY";
  if (status === "Occupied") return "OCCUPIED";
  return "VACANT";
}

function fromTenantHousekeepingStatus(
  status: "CLEAN" | "DIRTY" | "OCCUPIED" | "VACANT",
) {
  if (status === "CLEAN") return "Clean";
  if (status === "DIRTY") return "Dirty";
  if (status === "OCCUPIED") return "Occupied";
  return "Vacant";
}

function getHousekeepingStatusFromRoomStatus(
  status: "AVAILABLE" | "OCCUPIED" | "MAINTENANCE" | "OUT_OF_SERVICE",
): "Clean" | "Dirty" | "Occupied" | "Vacant" {
  if (status === "OCCUPIED") return "Occupied";
  if (status === "MAINTENANCE" || status === "OUT_OF_SERVICE") return "Dirty";
  return "Vacant";
}

function getRoomStatusFromHousekeepingStatus(
  status: z.infer<typeof tenantHousekeepingStatusSchema>,
): "AVAILABLE" | "OCCUPIED" | "MAINTENANCE" {
  if (status === "Occupied") return "OCCUPIED";
  if (status === "Dirty") return "MAINTENANCE";
  return "AVAILABLE";
}

function toTenantRoomSmokingPolicy(
  policy: z.infer<typeof tenantRoomSmokingPolicySchema>,
): "NON_SMOKING" | "SMOKING" {
  return policy === "Smoking" ? "SMOKING" : "NON_SMOKING";
}

function fromTenantRoomSmokingPolicy(policy: "NON_SMOKING" | "SMOKING") {
  return policy === "SMOKING" ? "Smoking" : "Non-smoking";
}

function toTenantReservationStatus(
  status: z.infer<typeof tenantReservationStatusSchema>,
): "PENDING" | "CONFIRMED" | "CHECKED_IN" | "CHECKED_OUT" | "CANCELED" {
  if (status === "Pending") return "PENDING";
  if (status === "Checked in") return "CHECKED_IN";
  if (status === "Checked out") return "CHECKED_OUT";
  if (status === "Canceled") return "CANCELED";
  return "CONFIRMED";
}

function fromTenantReservationStatus(
  status: "PENDING" | "CONFIRMED" | "CHECKED_IN" | "CHECKED_OUT" | "CANCELED",
) {
  if (status === "PENDING") return "Pending";
  if (status === "CHECKED_IN") return "Checked in";
  if (status === "CHECKED_OUT") return "Checked out";
  if (status === "CANCELED") return "Canceled";
  return "Confirmed";
}

function toTenantServiceStatus(
  status: z.infer<typeof tenantServiceStatusSchema>,
): "ACTIVE" | "INACTIVE" {
  return status === "Inactive" ? "INACTIVE" : "ACTIVE";
}

function fromTenantServiceStatus(status: "ACTIVE" | "INACTIVE") {
  return status === "INACTIVE" ? "Inactive" : "Active";
}

function toTenantServiceBillingType(
  billingType: z.infer<typeof tenantServiceBillingTypeSchema>,
): "FIXED_PRICE" | "PER_HOUR" | "PER_GUEST" | "CUSTOM_QUOTE" {
  if (billingType === "Per hour") return "PER_HOUR";
  if (billingType === "Per guest") return "PER_GUEST";
  if (billingType === "Custom quote") return "CUSTOM_QUOTE";
  return "FIXED_PRICE";
}

function fromTenantServiceBillingType(
  billingType: "FIXED_PRICE" | "PER_HOUR" | "PER_GUEST" | "CUSTOM_QUOTE",
) {
  if (billingType === "PER_HOUR") return "Per hour";
  if (billingType === "PER_GUEST") return "Per guest";
  if (billingType === "CUSTOM_QUOTE") return "Custom quote";
  return "Fixed price";
}

function toTenantInvoiceStatus(
  status: z.infer<typeof tenantInvoiceStatusSchema>,
): "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "VOID" {
  if (status === "Sent") return "SENT";
  if (status === "Paid") return "PAID";
  if (status === "Overdue") return "OVERDUE";
  if (status === "Void") return "VOID";
  return "DRAFT";
}

function fromTenantInvoiceStatus(
  status: "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "VOID",
) {
  if (status === "SENT") return "Sent";
  if (status === "PAID") return "Paid";
  if (status === "OVERDUE") return "Overdue";
  if (status === "VOID") return "Void";
  return "Draft";
}

function toTenantInvoiceReminderCadence(
  cadence: z.infer<typeof tenantInvoiceReminderCadenceSchema>,
): "STANDARD" | "LIGHT" | "STRICT" | "PAUSED" {
  if (cadence === "Light") return "LIGHT";
  if (cadence === "Strict") return "STRICT";
  if (cadence === "Paused") return "PAUSED";
  return "STANDARD";
}

function fromTenantInvoiceReminderCadence(
  cadence: "STANDARD" | "LIGHT" | "STRICT" | "PAUSED",
) {
  if (cadence === "LIGHT") return "Light";
  if (cadence === "STRICT") return "Strict";
  if (cadence === "PAUSED") return "Paused";
  return "Standard";
}

function toTenantFinanceEntryType(
  type: z.infer<typeof tenantFinanceEntryTypeSchema>,
): "REVENUE" | "EXPENSE" {
  return type === "Revenue" ? "REVENUE" : "EXPENSE";
}

function fromTenantFinanceEntryType(type: "REVENUE" | "EXPENSE") {
  return type === "REVENUE" ? "Revenue" : "Expense";
}

function toTenantFinanceEntrySource(
  source: z.infer<typeof tenantFinanceEntrySourceSchema>,
): "MANUAL" | "AUTO_BOOKING" | "INVOICE_PAYMENT" {
  if (source === "Auto booking") return "AUTO_BOOKING";
  if (source === "Invoice payment") return "INVOICE_PAYMENT";
  return "MANUAL";
}

function fromTenantFinanceEntrySource(
  source: "MANUAL" | "AUTO_BOOKING" | "INVOICE_PAYMENT",
) {
  if (source === "AUTO_BOOKING") return "Auto booking";
  if (source === "INVOICE_PAYMENT") return "Invoice payment";
  return "Manual entry";
}

function toTenantFinanceEntryStatus(
  status: z.infer<typeof tenantFinanceEntryStatusSchema>,
): "CLEARED" | "PENDING" {
  return status === "Cleared" ? "CLEARED" : "PENDING";
}

function fromTenantFinanceEntryStatus(status: "CLEARED" | "PENDING") {
  return status === "CLEARED" ? "Cleared" : "Pending";
}

function parseReservationDate(value: string, field: string) {
  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `${field} must be a valid date.`,
    });
  }

  return date;
}

function parseDateField(value: string, field: string) {
  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `${field} must be a valid date.`,
    });
  }

  return date;
}

function parseMoneyAmount(value: string) {
  const amount = Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(amount) ? amount : 0;
}

function toMoneyString(value: number) {
  return String(Math.max(value, 0));
}

function getTenantInvoiceSuffix(tenantName?: string | null) {
  const letters = (tenantName ?? "")
    .replace(/[^a-zA-Z]/g, "")
    .slice(0, 2)
    .toUpperCase();

  return letters.padEnd(2, "X") || "RC";
}

async function getNextInvoiceCode(tenantProfile: {
  businessName?: string | null;
  id: string;
  resortName?: string | null;
}) {
  const year = String(new Date().getFullYear()).slice(-2);
  const tenantName =
    tenantProfile.resortName ?? tenantProfile.businessName ?? "ResortCloud";
  const suffix = getTenantInvoiceSuffix(tenantName);
  const prefix = `INV-${year}-`;
  const count = await prisma.tenantInvoice.count({
    where: {
      tenantProfileId: tenantProfile.id,
      code: {
        startsWith: prefix,
      },
    },
  });

  return `${prefix}${String(count + 1).padStart(5, "0")}-${suffix}`;
}

async function getNextFinanceEntryCode(
  tenantProfileId: string,
  type: z.infer<typeof tenantFinanceEntryTypeSchema>,
) {
  const prefix = type === "Revenue" ? "REV" : "EXP";
  const count = await prisma.tenantFinanceEntry.count({
    where: {
      tenantProfileId,
      code: {
        startsWith: `${prefix}-`,
      },
    },
  });

  return `${prefix}-${String(count + 1).padStart(5, "0")}`;
}

async function getNextTransactionExportCode(tenantProfileId: string) {
  const prefix = "EXP-JOB";
  const count = await prisma.tenantTransactionExport.count({
    where: {
      tenantProfileId,
      code: {
        startsWith: `${prefix}-`,
      },
    },
  });

  return `${prefix}-${String(count + 1).padStart(5, "0")}`;
}

function getDefaultExportPeriod(name: z.infer<typeof tenantTransactionExportNameSchema>) {
  const now = new Date();
  const month = now.toLocaleString("en-PH", { month: "short" });
  const year = now.getFullYear();

  if (name === "Cash flow") return "Next 30 days";
  if (name === "Invoices summary") return `${month} ${year}`;
  return `${month} 1 - ${now.getDate()}, ${year}`;
}

function formatExportSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function getAnalyticsRange(period: "week" | "month" | "quarter") {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const start = new Date(now);

  if (period === "week") {
    start.setDate(start.getDate() - 6);
  } else if (period === "quarter") {
    start.setMonth(start.getMonth() - 2, 1);
  } else {
    start.setDate(1);
  }

  start.setHours(0, 0, 0, 0);

  return { end, start };
}

function getAnalyticsDays(start: Date, end: Date) {
  const days: Date[] = [];
  const cursor = new Date(start);

  while (cursor.getTime() <= end.getTime()) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

function getAnalyticsMonthStarts(count = 6) {
  const starts: Date[] = [];
  const now = new Date();

  for (let index = count - 1; index >= 0; index -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    date.setHours(0, 0, 0, 0);
    starts.push(date);
  }

  return starts;
}

function isDateInRange(date: Date, start: Date, end: Date) {
  return date.getTime() >= start.getTime() && date.getTime() <= end.getTime();
}

function formatAnalyticsMoney(value: number) {
  if (Math.abs(value) >= 1000) return `₱${Math.round(value / 1000)}K`;
  return `₱${Math.round(value).toLocaleString("en-PH")}`;
}

function getAnalyticsPercent(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

async function buildTransactionExportPayload(
  tenantProfileId: string,
  name: z.infer<typeof tenantTransactionExportNameSchema>,
) {
  if (name === "Invoices summary") {
    const invoices = await prisma.tenantInvoice.findMany({
      where: { tenantProfileId },
      include: {
        reservation: {
          include: {
            room: true,
          },
        },
      },
      orderBy: { invoiceDate: "desc" },
    });

    return invoices.map((invoice) => ({
      balanceDue: invoice.balanceDue,
      code: invoice.code,
      dueDate: invoice.dueDate.toISOString(),
      guestName: invoice.guestName,
      room: invoice.reservation
        ? `${invoice.reservation.room.code} - ${invoice.reservation.room.name}`
        : "",
      status: fromTenantInvoiceStatus(invoice.status),
      totalAmount: invoice.totalAmount,
    }));
  }

  const entries = await prisma.tenantFinanceEntry.findMany({
    where: {
      tenantProfileId,
      receiptUrl: name === "Receipts"
        ? {
            not: null,
          }
        : undefined,
    },
    orderBy: { entryDate: "desc" },
  });

  if (name === "Money status") {
    const revenue = entries
      .filter((entry) => entry.type === "REVENUE" && entry.status === "CLEARED")
      .reduce((total, entry) => total + parseMoneyAmount(entry.amount), 0);
    const expenses = entries
      .filter((entry) => entry.type === "EXPENSE" && entry.status === "CLEARED")
      .reduce((total, entry) => total + parseMoneyAmount(entry.amount), 0);
    const openInvoices = await prisma.tenantInvoice.findMany({
      where: {
        tenantProfileId,
        status: {
          notIn: ["PAID", "VOID"],
        },
      },
    });
    const receivables = openInvoices.reduce(
      (total, invoice) => total + parseMoneyAmount(invoice.balanceDue),
      0,
    );

    return [
      { account: "Cash on hand", amount: toMoneyString(revenue - expenses) },
      { account: "Receivables", amount: toMoneyString(receivables) },
      { account: "Revenue", amount: toMoneyString(revenue) },
      { account: "Expenses", amount: toMoneyString(expenses) },
    ];
  }

  return entries.map((entry) => ({
    amount: entry.amount,
    category: entry.category,
    code: entry.code,
    date: entry.entryDate.toISOString(),
    department: entry.department ?? "",
    description: entry.description,
    receiptUrl: name === "Receipts" ? entry.receiptUrl : undefined,
    source: fromTenantFinanceEntrySource(entry.source),
    status: fromTenantFinanceEntryStatus(entry.status),
    type: fromTenantFinanceEntryType(entry.type),
  }));
}

function getReservationNights(checkIn: Date, checkOut: Date) {
  const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / 86_400_000);

  if (nights < 1) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Check-out must be after check-in.",
    });
  }

  return nights;
}

async function createInvoiceForReservation(input: {
  tenantProfileId: string;
  reservation: {
    id: string;
    checkIn: Date;
    checkOut: Date;
    deposit: string | null;
    guestEmail: string | null;
    guestName: string;
    nights: number;
    rate: string;
    totalAmount: string;
    room: {
      code: string;
      name: string;
      type: string;
    };
  };
}) {
  const existingInvoice = await prisma.tenantInvoice.findFirst({
    where: {
      reservationId: input.reservation.id,
      tenantProfileId: input.tenantProfileId,
    },
  });

  if (existingInvoice) return existingInvoice;

  const invoiceDate = new Date();
  const dueDate = new Date(invoiceDate);
  dueDate.setDate(invoiceDate.getDate() + 3);

  const depositPaid = input.reservation.deposit ?? "0";
  const subtotal = input.reservation.totalAmount;
  const discount = "0";
  const tax = "0";
  const totalAmount = String(
    parseMoneyAmount(subtotal) - parseMoneyAmount(discount) + parseMoneyAmount(tax),
  );
  const balanceDue = toMoneyString(
    parseMoneyAmount(totalAmount) - parseMoneyAmount(depositPaid),
  );
  const tenantProfile = await prisma.tenantProfile.findUnique({
    where: {
      id: input.tenantProfileId,
    },
    select: {
      businessName: true,
      id: true,
      resortName: true,
    },
  });

  if (!tenantProfile) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Tenant profile not found.",
    });
  }

  const code = await getNextInvoiceCode(tenantProfile);

  return prisma.tenantInvoice.create({
    data: {
      balanceDue,
      code,
      depositPaid,
      discount,
      dueDate,
      guestEmail: input.reservation.guestEmail,
      guestName: input.reservation.guestName,
      invoiceDate,
      paymentMethod: "Reservation payment",
      reminderCadence: "STANDARD",
      reservationId: input.reservation.id,
      status: "SENT",
      subtotal,
      tax,
      tenantProfileId: input.tenantProfileId,
      totalAmount,
      lineItems: {
        create: [
          {
            amount: subtotal,
            description: `${input.reservation.room.code} - ${input.reservation.room.name} (${input.reservation.nights} night${input.reservation.nights === 1 ? "" : "s"})`,
            quantity: input.reservation.nights,
            rate: input.reservation.rate,
            sortOrder: 0,
          },
        ],
      },
    },
  });
}

function makeInternalStaffEmail(authUserId: string) {
  return `${authUserId}@staff.resortcloud.local`;
}

function isInternalStaffEmail(email: string) {
  return email.endsWith("@staff.resortcloud.local");
}

async function getTenantProfileForSession(authUserId: string) {
  const appUser = await prisma.appUser.findUnique({
    where: {
      authUserId,
    },
    include: {
      tenantProfile: true,
      staffProfile: {
        include: {
          tenantProfile: true,
        },
      },
    },
  });

  const tenantProfile =
    appUser?.tenantProfile ?? appUser?.staffProfile?.tenantProfile ?? null;

  if (appUser?.role === "TENANT_STAFF" && appUser.staffProfile?.status === "SUSPENDED") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Staff account suspended.",
    });
  }

  if (!appUser || !tenantProfile || !["TENANT", "TENANT_STAFF"].includes(appUser.role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Tenant workspace access required.",
    });
  }

  return tenantProfile;
}

function toTenantStaffOutput(
  staffProfile: NonNullable<
    Awaited<ReturnType<typeof prisma.tenantStaffProfile.findUnique>>
  > & {
    appUser: {
      authUserId: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
      displayName: string;
    };
    department?: {
      name: string;
    } | null;
  },
) {
  const basicSalary = Number(staffProfile.basicSalary ?? 0);
  const allowance = Number(staffProfile.allowance ?? 0);
  const incentives = Number(staffProfile.incentives ?? 0);
  const commission = Number(staffProfile.commission ?? 0);
  const bonus = Number(staffProfile.bonus ?? 0);
  const leaveDeduction = Number(staffProfile.leaveDeduction ?? 0);
  const sssContribution = Number(staffProfile.sssContribution ?? 0);
  const philHealthContribution = Number(
    staffProfile.philHealthContribution ?? 0,
  );
  const pagIbigContribution = Number(staffProfile.pagIbigContribution ?? 0);
  const withholdingTax = Number(staffProfile.withholdingTax ?? 0);
  const otherDeductions = Number(staffProfile.otherDeductions ?? 0);
  const governmentDeductions =
    sssContribution +
    philHealthContribution +
    pagIbigContribution +
    withholdingTax;
  const totalEarnings =
    basicSalary + allowance + incentives + commission + bonus;
  const totalDeductions =
    leaveDeduction + governmentDeductions + otherDeductions;

  return {
    recordType: "staff" as const,
    id: staffProfile.id,
    authUserId: staffProfile.appUser.authUserId,
    email: isInternalStaffEmail(staffProfile.appUser.email)
      ? ""
      : staffProfile.appUser.email,
    firstName: staffProfile.appUser.firstName ?? "",
    lastName: staffProfile.appUser.lastName ?? "",
    displayName: staffProfile.appUser.displayName,
    username: staffProfile.username ?? "",
    phoneNumber: staffProfile.phoneNumber ?? "",
    departmentId: staffProfile.departmentId ?? "",
    departmentName: staffProfile.department?.name ?? "",
    isDepartmentHead: staffProfile.isDepartmentHead,
    roleName: staffProfile.roleName,
    status: fromTenantStaffStatus(staffProfile.status),
    permissions: staffProfile.permissions,
    employmentType: staffProfile.employmentType,
    workLocation: staffProfile.workLocation,
    basicSalary,
    allowance,
    incentives,
    commission,
    bonus,
    leaveDeduction,
    sssContribution,
    philHealthContribution,
    pagIbigContribution,
    withholdingTax,
    otherDeductions,
    governmentDeductions,
    totalEarnings,
    totalDeductions,
    netPay: totalEarnings - totalDeductions,
    notes: staffProfile.notes ?? "",
    tags: staffProfile.tags,
    createdAt: staffProfile.createdAt,
    updatedAt: staffProfile.updatedAt,
  };
}

function getWorkdayStart(value = new Date()) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getTimeLogFlag(clockIn: Date | null | undefined) {
  if (!clockIn) return "ABSENT" as const;

  const lateThreshold = new Date(clockIn);
  lateThreshold.setHours(9, 0, 0, 0);

  return clockIn > lateThreshold ? ("LATE" as const) : ("ON_TIME" as const);
}

function getTimeLogHours(clockIn: Date | null, clockOut: Date | null) {
  if (!clockIn || !clockOut) return "--";

  const hours = (clockOut.getTime() - clockIn.getTime()) / 1000 / 60 / 60;
  return Math.max(0, hours).toFixed(1);
}

function toTenantTimeLogOutput(timeLog: {
  id: string;
  date: Date;
  clockIn: Date | null;
  clockOut: Date | null;
  flag: "ON_TIME" | "LATE" | "ABSENT";
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  staffProfile: {
    id: string;
    roleName: string;
    department?: {
      name: string;
    } | null;
    appUser: {
      displayName: string;
    };
  };
}) {
  return {
    id: timeLog.id,
    staffProfileId: timeLog.staffProfile.id,
    name: timeLog.staffProfile.appUser.displayName,
    role: timeLog.staffProfile.roleName,
    department: timeLog.staffProfile.department?.name ?? "",
    date: timeLog.date,
    clockIn: timeLog.clockIn,
    clockOut: timeLog.clockOut,
    hours: getTimeLogHours(timeLog.clockIn, timeLog.clockOut),
    flag: fromTenantTimeLogFlag(timeLog.flag),
    notes: timeLog.notes ?? "",
    createdAt: timeLog.createdAt,
    updatedAt: timeLog.updatedAt,
  };
}

function toTenantScheduleShiftOutput(shift: {
  id: string;
  shift: string;
  role: string;
  department: string | null;
  startAt: Date;
  endAt: Date;
  status: "ASSIGNED" | "OPEN" | "CHANGED";
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  staffProfile?: {
    id: string;
    appUser: {
      displayName: string;
    };
  } | null;
}) {
  return {
    id: shift.id,
    staffProfileId: shift.staffProfile?.id ?? "",
    name: shift.staffProfile?.appUser.displayName ?? "--",
    role: shift.role,
    department: shift.department ?? "",
    shift: shift.shift,
    startAt: shift.startAt,
    endAt: shift.endAt,
    status: fromTenantScheduleShiftStatus(shift.status),
    notes: shift.notes ?? "",
    createdAt: shift.createdAt,
    updatedAt: shift.updatedAt,
  };
}

function toTenantLeaveRequestOutput(request: {
  id: string;
  leaveType: string;
  startDate: Date;
  endDate: Date;
  reason: string;
  balanceDays: number;
  status: "APPROVED" | "PENDING" | "REJECTED";
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  staffProfile: {
    id: string;
    roleName: string;
    appUser: {
      displayName: string;
    };
  };
}) {
  return {
    id: request.id,
    staffProfileId: request.staffProfile.id,
    name: request.staffProfile.appUser.displayName,
    role: request.staffProfile.roleName,
    type: request.leaveType,
    startDate: request.startDate,
    endDate: request.endDate,
    reason: request.reason,
    balance: `${request.balanceDays} days`,
    balanceDays: request.balanceDays,
    status: fromTenantLeaveRequestStatus(request.status),
    reviewedAt: request.reviewedAt,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  };
}

function toTenantOtUndertimeOutput(entry: {
  id: string;
  type: "OVERTIME" | "UNDERTIME";
  hours: string;
  payPeriod: string;
  reason: string;
  status: "APPROVED" | "PENDING" | "REJECTED";
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  staffProfile: {
    id: string;
    roleName: string;
    appUser: {
      displayName: string;
    };
  };
}) {
  return {
    id: entry.id,
    staffProfileId: entry.staffProfile.id,
    name: entry.staffProfile.appUser.displayName,
    role: entry.staffProfile.roleName,
    type: fromTenantOtUndertimeType(entry.type),
    hours: entry.hours,
    payPeriod: entry.payPeriod,
    reason: entry.reason,
    status: fromTenantOtUndertimeStatus(entry.status),
    reviewedAt: entry.reviewedAt,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

type TenantPayrollInput = z.infer<typeof tenantPayrollInputSchema>;

function endOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

function formatPayrollPeriod(start: Date, end: Date) {
  return `${start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })} - ${end.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

function normalizePayrollPeriod(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function matchesPayrollPeriod(value: string, payPeriod: string) {
  const normalizedValue = normalizePayrollPeriod(value);
  const normalizedPayPeriod = normalizePayrollPeriod(payPeriod);

  return (
    normalizedValue === normalizedPayPeriod ||
    normalizedValue.includes(normalizedPayPeriod) ||
    normalizedPayPeriod.includes(normalizedValue)
  );
}

function getNumericHours(value: string) {
  const hours = Number.parseFloat(value);
  return Number.isFinite(hours) && hours > 0 ? hours : 0;
}

function getHoursBetween(clockIn: Date | null, clockOut: Date | null) {
  if (!clockIn || !clockOut) return 0;

  return Math.max(0, (clockOut.getTime() - clockIn.getTime()) / 1000 / 60 / 60);
}

function countInclusiveDays(start: Date, end: Date) {
  const startDay = getWorkdayStart(start).getTime();
  const endDay = getWorkdayStart(end).getTime();
  const dayMs = 1000 * 60 * 60 * 24;

  return Math.max(0, Math.floor((endDay - startDay) / dayMs) + 1);
}

function countLeaveDaysInPeriod(
  startDate: Date,
  endDate: Date,
  periodStart: Date,
  periodEnd: Date,
) {
  const start = new Date(Math.max(startDate.getTime(), periodStart.getTime()));
  const end = new Date(Math.min(endDate.getTime(), periodEnd.getTime()));

  if (end < start) return 0;

  return countInclusiveDays(start, end);
}

function roundPayrollAmount(value: number, roundingOption: TenantPayrollInput["roundingOption"]) {
  if (!Number.isFinite(value)) return 0;

  return roundingOption === "Nearest Peso"
    ? Math.round(value)
    : Number(value.toFixed(2));
}

function decimalNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toTenantPayrollPayType(value: TenantPayrollInput["payType"]) {
  return value === "Final Payroll" ? ("FINAL" as const) : ("REGULAR" as const);
}

function fromTenantPayrollPayType(value: "REGULAR" | "FINAL") {
  return value === "FINAL" ? "Final Payroll" : "Regular Payroll";
}

function toTenantPayrollFrequency(value: TenantPayrollInput["frequency"]) {
  return value === "Bi-weekly" ? ("BI_WEEKLY" as const) : ("MONTHLY" as const);
}

function fromTenantPayrollFrequency(value: "MONTHLY" | "BI_WEEKLY") {
  return value === "BI_WEEKLY" ? "Bi-weekly" : "Monthly";
}

async function getNextTenantPayrollCode(tenantProfileId: string, periodStart: Date) {
  const year = periodStart.getFullYear();
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);
  const count = await prisma.tenantPayrollRun.count({
    where: {
      periodStart: {
        gte: yearStart,
        lte: yearEnd,
      },
      tenantProfileId,
    },
  });

  return `PR-${year}-${String(count + 1).padStart(5, "0")}`;
}

async function buildTenantPayrollPreview(
  tenantProfileId: string,
  input: TenantPayrollInput,
) {
  const periodStart = getWorkdayStart(input.periodStart);
  const periodEnd = endOfDay(input.periodEnd);

  if (periodEnd < periodStart) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Payroll period end must be after start.",
    });
  }

  const payPeriod = formatPayrollPeriod(periodStart, periodEnd);
  const staffProfiles = await prisma.tenantStaffProfile.findMany({
    where: {
      tenantProfileId,
      ...(input.department && input.department !== "all"
        ? {
            department: {
              name: input.department,
            },
          }
        : {}),
    },
    include: {
      appUser: true,
      department: true,
      leaveRequests: {
        where: {
          endDate: {
            gte: periodStart,
          },
          startDate: {
            lte: periodEnd,
          },
          status: "APPROVED",
        },
      },
      otUndertimeEntries: {
        where: {
          status: "APPROVED",
        },
      },
      timeLogs: {
        where: {
          date: {
            gte: periodStart,
            lte: periodEnd,
          },
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const employeeOverrides = new Map(
    input.employeeOverrides.map((override) => [
      override.staffProfileId,
      override,
    ]),
  );

  const employees = staffProfiles.map((staffProfile, index) => {
    const override = employeeOverrides.get(staffProfile.id);
    const included = override?.included ?? (staffProfile.status === "ACTIVE");
    const baseHourlyRate = decimalNumber(staffProfile.basicSalary) / 22 / 8;
    const approvedPeriodEntries = staffProfile.otUndertimeEntries.filter((entry) =>
      matchesPayrollPeriod(entry.payPeriod, payPeriod),
    );
    const overtimeHours = approvedPeriodEntries
      .filter((entry) => entry.type === "OVERTIME")
      .reduce((total, entry) => total + getNumericHours(entry.hours), 0);
    const undertimeHours = approvedPeriodEntries
      .filter((entry) => entry.type === "UNDERTIME")
      .reduce((total, entry) => total + getNumericHours(entry.hours), 0);
    const leaveDays = staffProfile.leaveRequests.reduce(
      (total, leave) =>
        total +
        countLeaveDaysInPeriod(
          leave.startDate,
          leave.endDate,
          periodStart,
          periodEnd,
        ),
      0,
    );
    const regularHours = staffProfile.timeLogs.reduce(
      (total, log) => total + getHoursBetween(log.clockIn, log.clockOut),
      0,
    );
    const daysWorked = staffProfile.timeLogs.filter((log) => log.clockIn).length;
    const lateCount = staffProfile.timeLogs.filter((log) => log.flag === "LATE").length;
    const absentCount = staffProfile.timeLogs.filter((log) => log.flag === "ABSENT").length;
    const basicSalary =
      override?.basicSalary ??
      (input.includeBasicSalary ? decimalNumber(staffProfile.basicSalary) : 0);
    const allowance =
      override?.allowance ??
      (input.includeAllowance ? decimalNumber(staffProfile.allowance) : 0);
    const incentives =
      override?.incentives ??
      (input.includeIncentives ? decimalNumber(staffProfile.incentives) : 0);
    const commission =
      override?.commission ??
      (input.includeCommission ? decimalNumber(staffProfile.commission) : 0);
    const bonus =
      override?.bonus ??
      (input.includeBonus ? decimalNumber(staffProfile.bonus) : 0);
    const overtimePay = input.includeOtPay
      ? roundPayrollAmount(overtimeHours * baseHourlyRate * 1.25, input.roundingOption)
      : 0;
    const leaveDeduction = input.includeLeaveDeduction
      ? roundPayrollAmount(
          leaveDays * decimalNumber(staffProfile.leaveDeduction),
          input.roundingOption,
        )
      : 0;
    const undertimeDeduction = input.includeLeaveDeduction
      ? roundPayrollAmount(undertimeHours * baseHourlyRate, input.roundingOption)
      : 0;
    const governmentDeductions = input.includeGovernmentContributions
      ? decimalNumber(staffProfile.sssContribution) +
        decimalNumber(staffProfile.philHealthContribution) +
        decimalNumber(staffProfile.pagIbigContribution) +
        decimalNumber(staffProfile.withholdingTax)
      : 0;
    const otherDeductions =
      override?.otherDeductions ?? decimalNumber(staffProfile.otherDeductions);
    const grossPay =
      basicSalary + allowance + incentives + commission + bonus + overtimePay;
    const totalDeductions =
      leaveDeduction + undertimeDeduction + governmentDeductions + otherDeductions;
    const netPay = grossPay - totalDeductions;

    return {
      absentCount,
      allowances: allowance,
      basicSalary,
      bonus,
      commission,
      deductions: totalDeductions,
      daysWorked,
      department: staffProfile.department?.name ?? "Unassigned",
      employeeId: `STF-${String(index + 1).padStart(4, "0")}`,
      employmentType: staffProfile.employmentType,
      governmentDeductions,
      grossPay,
      id: staffProfile.id,
      included,
      incentives,
      lateCount,
      leaveDays,
      leaveDeduction,
      location: staffProfile.workLocation,
      name:
        staffProfile.appUser.displayName ||
        staffProfile.username ||
        staffProfile.appUser.email ||
        "Staff user",
      netPay,
      otherDeductions,
      overtimeHours,
      overtimePay,
      pagIbigContribution: decimalNumber(staffProfile.pagIbigContribution),
      philHealthContribution: decimalNumber(staffProfile.philHealthContribution),
      position: staffProfile.roleName,
      regularHours,
      sssContribution: decimalNumber(staffProfile.sssContribution),
      staffProfileId: staffProfile.id,
      totalDeductions,
      totalEarnings: grossPay,
      undertimeDeduction,
      undertimeHours,
      withholdingTax: decimalNumber(staffProfile.withholdingTax),
    };
  });
  const includedEmployees = employees.filter((employee) => employee.included);
  const totals = {
    employerContributions: sumPayrollItems(
      includedEmployees,
      (employee) => employee.governmentDeductions,
    ),
    excludedEmployees: employees.length - includedEmployees.length,
    includedEmployees: includedEmployees.length,
    totalAllowances: sumPayrollItems(includedEmployees, (employee) => employee.allowances),
    totalBasicSalary: sumPayrollItems(
      includedEmployees,
      (employee) => employee.basicSalary,
    ),
    totalBonus: sumPayrollItems(includedEmployees, (employee) => employee.bonus),
    totalCommission: sumPayrollItems(
      includedEmployees,
      (employee) => employee.commission,
    ),
    totalDeductions: sumPayrollItems(
      includedEmployees,
      (employee) => employee.totalDeductions,
    ),
    totalEarnings: sumPayrollItems(includedEmployees, (employee) => employee.totalEarnings),
    totalEmployees: employees.length,
    totalGovernmentDeductions: sumPayrollItems(
      includedEmployees,
      (employee) => employee.governmentDeductions,
    ),
    totalIncentives: sumPayrollItems(
      includedEmployees,
      (employee) => employee.incentives,
    ),
    totalLeaveDeductions: sumPayrollItems(
      includedEmployees,
      (employee) => employee.leaveDeduction,
    ),
    totalNetPay: sumPayrollItems(includedEmployees, (employee) => employee.netPay),
    totalOtherDeductions: sumPayrollItems(
      includedEmployees,
      (employee) => employee.otherDeductions,
    ),
    totalOvertimePay: sumPayrollItems(
      includedEmployees,
      (employee) => employee.overtimePay,
    ),
    totalUndertimeDeductions: sumPayrollItems(
      includedEmployees,
      (employee) => employee.undertimeDeduction,
    ),
  };

  return {
    employees,
    payPeriod,
    periodEnd,
    periodStart,
    totals: {
      ...totals,
      employerCost: totals.totalEarnings + totals.employerContributions,
    },
  };
}

function sumPayrollItems<T>(items: T[], selector: (item: T) => number) {
  return items.reduce((total, item) => total + selector(item), 0);
}

function toTenantPayrollOutput(payrollRun: {
  id: string;
  code: string;
  name: string;
  payPeriod: string;
  periodStart: Date;
  periodEnd: Date;
  payDate: Date;
  payType: "REGULAR" | "FINAL";
  frequency: "MONTHLY" | "BI_WEEKLY";
  department: string | null;
  notes: string | null;
  status: "DRAFT" | "COMPLETED" | "VOIDED";
  totalEmployees: number;
  includedEmployees: number;
  excludedEmployees: number;
  totalBasicSalary: Prisma.Decimal | number;
  totalAllowances: Prisma.Decimal | number;
  totalIncentives: Prisma.Decimal | number;
  totalCommission: Prisma.Decimal | number;
  totalBonus: Prisma.Decimal | number;
  totalOvertimePay: Prisma.Decimal | number;
  totalGrossPay: Prisma.Decimal | number;
  totalLeaveDeductions: Prisma.Decimal | number;
  totalUndertimeDeductions: Prisma.Decimal | number;
  totalGovernmentDeductions: Prisma.Decimal | number;
  totalOtherDeductions: Prisma.Decimal | number;
  totalDeductions: Prisma.Decimal | number;
  totalNetPay: Prisma.Decimal | number;
  employerContributions: Prisma.Decimal | number;
  employerCost: Prisma.Decimal | number;
  options: Prisma.JsonValue | null;
  generatedBy: string | null;
  generatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  items?: Array<{
    id: string;
    staffProfileId: string;
    employeeName: string;
    employeeCode: string;
    roleName: string | null;
    departmentName: string | null;
    employmentType: string | null;
    workLocation: string | null;
    daysWorked: number;
    lateCount: number;
    absentCount: number;
    leaveDays: number;
    regularHours: Prisma.Decimal | number;
    overtimeHours: Prisma.Decimal | number;
    undertimeHours: Prisma.Decimal | number;
    basicSalary: Prisma.Decimal | number;
    allowance: Prisma.Decimal | number;
    incentives: Prisma.Decimal | number;
    commission: Prisma.Decimal | number;
    bonus: Prisma.Decimal | number;
    overtimePay: Prisma.Decimal | number;
    grossPay: Prisma.Decimal | number;
    leaveDeduction: Prisma.Decimal | number;
    undertimeDeduction: Prisma.Decimal | number;
    governmentDeductions: Prisma.Decimal | number;
    otherDeductions: Prisma.Decimal | number;
    totalDeductions: Prisma.Decimal | number;
    netPay: Prisma.Decimal | number;
    included: boolean;
  }>;
}) {
  return {
    code: payrollRun.code,
    createdAt: payrollRun.createdAt,
    department: payrollRun.department ?? "all",
    frequency: fromTenantPayrollFrequency(payrollRun.frequency),
    generatedAt: payrollRun.generatedAt,
    generatedBy: payrollRun.generatedBy ?? "",
    id: payrollRun.id,
    items: (payrollRun.items ?? []).map((item) => ({
      absentCount: item.absentCount,
      allowances: decimalNumber(item.allowance),
      basicSalary: decimalNumber(item.basicSalary),
      bonus: decimalNumber(item.bonus),
      commission: decimalNumber(item.commission),
      deductions: decimalNumber(item.totalDeductions),
      daysWorked: item.daysWorked,
      department: item.departmentName ?? "Unassigned",
      employeeId: item.employeeCode,
      employmentType: item.employmentType ?? "Regular",
      governmentDeductions: decimalNumber(item.governmentDeductions),
      grossPay: decimalNumber(item.grossPay),
      id: item.staffProfileId,
      included: item.included,
      incentives: decimalNumber(item.incentives),
      lateCount: item.lateCount,
      leaveDays: item.leaveDays,
      leaveDeduction: decimalNumber(item.leaveDeduction),
      location: item.workLocation ?? "Resort Office",
      name: item.employeeName,
      netPay: decimalNumber(item.netPay),
      otherDeductions: decimalNumber(item.otherDeductions),
      overtimeHours: decimalNumber(item.overtimeHours),
      overtimePay: decimalNumber(item.overtimePay),
      pagIbigContribution: 0,
      philHealthContribution: 0,
      position: item.roleName ?? "Staff",
      regularHours: decimalNumber(item.regularHours),
      sssContribution: 0,
      staffProfileId: item.staffProfileId,
      totalDeductions: decimalNumber(item.totalDeductions),
      totalEarnings: decimalNumber(item.grossPay),
      undertimeDeduction: decimalNumber(item.undertimeDeduction),
      undertimeHours: decimalNumber(item.undertimeHours),
      withholdingTax: 0,
    })),
    name: payrollRun.name,
    notes: payrollRun.notes ?? "",
    options: payrollRun.options,
    payDate: payrollRun.payDate,
    payPeriod: payrollRun.payPeriod,
    payType: fromTenantPayrollPayType(payrollRun.payType),
    periodEnd: payrollRun.periodEnd,
    periodStart: payrollRun.periodStart,
    status:
      payrollRun.status === "COMPLETED"
        ? "Completed"
        : payrollRun.status === "VOIDED"
          ? "Voided"
          : "Draft",
    totals: {
      employerContributions: decimalNumber(payrollRun.employerContributions),
      employerCost: decimalNumber(payrollRun.employerCost),
      excludedEmployees: payrollRun.excludedEmployees,
      includedEmployees: payrollRun.includedEmployees,
      totalAllowances: decimalNumber(payrollRun.totalAllowances),
      totalBasicSalary: decimalNumber(payrollRun.totalBasicSalary),
      totalBonus: decimalNumber(payrollRun.totalBonus),
      totalCommission: decimalNumber(payrollRun.totalCommission),
      totalDeductions: decimalNumber(payrollRun.totalDeductions),
      totalEarnings: decimalNumber(payrollRun.totalGrossPay),
      totalEmployees: payrollRun.totalEmployees,
      totalGovernmentDeductions: decimalNumber(
        payrollRun.totalGovernmentDeductions,
      ),
      totalIncentives: decimalNumber(payrollRun.totalIncentives),
      totalLeaveDeductions: decimalNumber(payrollRun.totalLeaveDeductions),
      totalNetPay: decimalNumber(payrollRun.totalNetPay),
      totalOtherDeductions: decimalNumber(payrollRun.totalOtherDeductions),
      totalOvertimePay: decimalNumber(payrollRun.totalOvertimePay),
      totalUndertimeDeductions: decimalNumber(
        payrollRun.totalUndertimeDeductions,
      ),
    },
    updatedAt: payrollRun.updatedAt,
  };
}

function toTenantDepartmentOutput(department: {
  id: string;
  name: string;
  code: string;
  description: string | null;
  email: string | null;
  notes: string | null;
  routing: string | null;
  status: "ACTIVE" | "PAUSED" | "ARCHIVED";
  headStaffProfileId: string | null;
  createdAt: Date;
  updatedAt: Date;
  headStaffProfile: {
    appUser: {
      displayName: string;
    };
  } | null;
  staffProfiles: Array<{
    id: string;
  }>;
}) {
  return {
    id: department.id,
    name: department.name,
    code: department.code,
    description: department.description ?? "",
    email: department.email ?? "",
    notes: department.notes ?? "",
    routing: department.routing ?? "",
    status: fromTenantDepartmentStatus(department.status),
    head: department.headStaffProfile?.appUser.displayName ?? "",
    headStaffProfileId: department.headStaffProfileId ?? "",
    staffProfileIds: department.staffProfiles.map((staff) => staff.id),
    members: department.staffProfiles.length,
    openTasks: 0,
    createdAt: department.createdAt,
    updatedAt: department.updatedAt,
  };
}

function toTenantAmenityOutput(amenity: {
  id: string;
  code: string;
  name: string;
  category: string;
  icon: string;
  description: string | null;
  appliesTo: "ROOM_LEVEL" | "PROPERTY_LEVEL";
  chargeable: boolean;
  feeAmount: string | null;
  feeUnit: "PER_STAY" | "PER_DAY" | "PER_USE";
  status: "ACTIVE" | "INACTIVE";
  showOnBookingPage: boolean;
  featured: boolean;
  sortOrder: number;
  internalNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: amenity.id,
    code: amenity.code,
    name: amenity.name,
    category: amenity.category,
    icon: amenity.icon,
    description: amenity.description ?? "",
    appliesTo: fromTenantAmenityScope(amenity.appliesTo),
    chargeable: amenity.chargeable,
    feeAmount: amenity.feeAmount ?? "",
    feeUnit: fromTenantAmenityFeeUnit(amenity.feeUnit),
    status: fromTenantAmenityStatus(amenity.status),
    showOnBookingPage: amenity.showOnBookingPage,
    featured: amenity.featured,
    sortOrder: amenity.sortOrder,
    internalNotes: amenity.internalNotes ?? "",
    createdAt: amenity.createdAt,
    updatedAt: amenity.updatedAt,
  };
}

function toTenantRoomOutput(room: {
  id: string;
  code: string;
  name: string;
  type: string;
  building: string;
  floor: string;
  baseRate: string;
  peakRate: string | null;
  extraPersonCharge: string | null;
  maxAdults: number;
  childrenOccupancy: number;
  bedConfiguration: string;
  roomSize: string | null;
  viewType: string;
  smokingPolicy: "NON_SMOKING" | "SMOKING";
  status: "AVAILABLE" | "OCCUPIED" | "MAINTENANCE" | "OUT_OF_SERVICE";
  checkIn: string;
  checkOut: string;
  minNights: number;
  guestNote: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  amenities: Array<{
    id: string;
    name: string;
  }>;
  photos: Array<{
    id: string;
    key: string;
    name: string;
    size: number | null;
    sortOrder: number;
    url: string;
  }>;
}) {
  return {
    id: room.id,
    code: room.code,
    name: room.name,
    type: room.type,
    building: room.building,
    floor: room.floor,
    baseRate: room.baseRate,
    peakRate: room.peakRate ?? "",
    extraPersonCharge: room.extraPersonCharge ?? "",
    maxAdults: room.maxAdults,
    childrenOccupancy: room.childrenOccupancy,
    bedConfiguration: room.bedConfiguration,
    roomSize: room.roomSize ?? "",
    viewType: room.viewType,
    smokingPolicy: fromTenantRoomSmokingPolicy(room.smokingPolicy),
    status: fromTenantRoomStatus(room.status),
    checkIn: room.checkIn,
    checkOut: room.checkOut,
    minNights: room.minNights,
    guestNote: room.guestNote ?? "",
    notes: room.notes ?? "",
    amenityIds: room.amenities.map((amenity) => amenity.id),
    amenities: room.amenities.map((amenity) => amenity.name),
    photos: room.photos
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((photo) => ({
        id: photo.id,
        key: photo.key,
        name: photo.name,
        size: photo.size ?? undefined,
        url: photo.url,
      })),
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
  };
}

function toTenantReservationOutput(reservation: {
  id: string;
  roomId: string;
  guestName: string;
  guestEmail: string | null;
  guestPhone: string | null;
  checkIn: Date;
  checkOut: Date;
  adults: number;
  children: number;
  nights: number;
  rate: string;
  deposit: string | null;
  totalAmount: string;
  paymentMethod: string | null;
  status: "PENDING" | "CONFIRMED" | "CHECKED_IN" | "CHECKED_OUT" | "CANCELED";
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  room: {
    code: string;
    name: string;
    type: string;
  };
}) {
  return {
    id: reservation.id,
    roomId: reservation.roomId,
    roomCode: reservation.room.code,
    roomName: reservation.room.name,
    roomType: reservation.room.type,
    guestName: reservation.guestName,
    guestEmail: reservation.guestEmail ?? "",
    guestPhone: reservation.guestPhone ?? "",
    checkIn: reservation.checkIn,
    checkOut: reservation.checkOut,
    adults: reservation.adults,
    children: reservation.children,
    nights: reservation.nights,
    rate: reservation.rate,
    deposit: reservation.deposit ?? "",
    totalAmount: reservation.totalAmount,
    paymentMethod: reservation.paymentMethod ?? "",
    status: fromTenantReservationStatus(reservation.status),
    notes: reservation.notes ?? "",
    createdAt: reservation.createdAt,
    updatedAt: reservation.updatedAt,
  };
}

function fromTenantReceptionRequestPriority(
  priority: "NORMAL" | "URGENT",
): "Normal" | "Urgent" {
  return priority === "URGENT" ? "Urgent" : "Normal";
}

function toTenantReceptionRequestPriority(
  priority: z.infer<typeof tenantReceptionRequestPrioritySchema>,
): "NORMAL" | "URGENT" {
  return priority === "Urgent" ? "URGENT" : "NORMAL";
}

function fromTenantMaintenancePriority(priority: "NORMAL" | "URGENT") {
  return priority === "URGENT" ? "Urgent" : "Normal";
}

function toTenantMaintenancePriority(
  priority: z.infer<typeof tenantMaintenancePrioritySchema>,
): "NORMAL" | "URGENT" {
  return priority === "Urgent" ? "URGENT" : "NORMAL";
}

function fromTenantMaintenanceStatus(status: "PENDING" | "COMPLETED") {
  return status === "COMPLETED" ? "Completed" : "Pending";
}

function fromTenantLaundryStatus(
  status: "RECEIVED" | "WASHING" | "DRYING" | "READY" | "RETURNED",
) {
  const labels = {
    DRYING: "Drying",
    READY: "Ready",
    RECEIVED: "Received",
    RETURNED: "Returned",
    WASHING: "Washing",
  } as const;

  return labels[status];
}

function toTenantLaundryStatus(
  status: z.infer<typeof tenantLaundryStatusSchema>,
): "RECEIVED" | "WASHING" | "DRYING" | "READY" | "RETURNED" {
  const values = {
    Drying: "DRYING",
    Ready: "READY",
    Received: "RECEIVED",
    Returned: "RETURNED",
    Washing: "WASHING",
  } as const;

  return values[status];
}

function fromTenantLaundryPriority(priority: "NORMAL" | "URGENT") {
  return priority === "URGENT" ? "Urgent" : "Normal";
}

function toTenantLaundryPriority(
  priority: z.infer<typeof tenantLaundryPrioritySchema>,
): "NORMAL" | "URGENT" {
  return priority === "Urgent" ? "URGENT" : "NORMAL";
}

function formatReceptionTime(time: string) {
  const [hourValue = "0", minuteValue = "0"] = time.split(":");
  const hour = Number(hourValue);
  const minute = Number(minuteValue);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return time;
  }

  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;

  return `${displayHour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function getReceptionQueueStatus(input: {
  checkOut: Date;
  frontDeskStatus: "ARRIVING" | "IN_HOUSE" | "CHECKING_OUT" | "COMPLETED" | null;
  reservationStatus: "PENDING" | "CONFIRMED" | "CHECKED_IN" | "CHECKED_OUT" | "CANCELED";
  todayEnd: Date;
}): "Arriving" | "In-house" | "Checking out" | "Completed" {
  if (input.frontDeskStatus === "ARRIVING") return "Arriving";
  if (input.frontDeskStatus === "IN_HOUSE") return "In-house";
  if (input.frontDeskStatus === "CHECKING_OUT") return "Checking out";
  if (input.frontDeskStatus === "COMPLETED") return "Completed";
  if (input.reservationStatus === "CHECKED_OUT") return "Completed";

  if (
    input.reservationStatus === "CHECKED_IN" &&
    input.checkOut.getTime() <= input.todayEnd.getTime()
  ) {
    return "Checking out";
  }

  if (input.reservationStatus === "CHECKED_IN") return "In-house";

  return "Arriving";
}

function toTenantReceptionGuestOutput(reservation: {
  adults: number;
  checkIn: Date;
  checkOut: Date;
  children: number;
  createdAt: Date;
  frontDeskStatus: "ARRIVING" | "IN_HOUSE" | "CHECKING_OUT" | "COMPLETED" | null;
  guestName: string;
  guestPhone: string | null;
  id: string;
  notes: string | null;
  paymentMethod: string | null;
  status: "PENDING" | "CONFIRMED" | "CHECKED_IN" | "CHECKED_OUT" | "CANCELED";
  totalAmount: string;
  updatedAt: Date;
  invoices: Array<{
    balanceDue: string;
    status: "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "VOID";
  }>;
  room: {
    checkIn: string;
    checkOut: string;
    code: string;
    name: string;
    type: string;
  };
}, todayEnd: Date) {
  const activeInvoice = reservation.invoices.find(
    (invoice) => invoice.status !== "VOID",
  );
  const balance =
    activeInvoice && activeInvoice.status !== "PAID"
      ? parseMoneyAmount(activeInvoice.balanceDue)
      : 0;
  const status = getReceptionQueueStatus({
    checkOut: reservation.checkOut,
    frontDeskStatus: reservation.frontDeskStatus,
    reservationStatus: reservation.status,
    todayEnd,
  });
  const priority = balance > 0 || reservation.notes ? "Attention" : "Normal";
  const time =
    status === "Arriving"
      ? formatReceptionTime(reservation.room.checkIn)
      : status === "Checking out"
        ? formatReceptionTime(reservation.room.checkOut)
        : status === "In-house"
          ? "Checked in"
          : "Completed";

  return {
    balance,
    checkIn: reservation.checkIn,
    checkOut: reservation.checkOut,
    createdAt: reservation.createdAt,
    guest: reservation.guestName,
    guestPhone: reservation.guestPhone ?? "",
    id: reservation.id,
    note:
      reservation.notes ??
      (balance > 0 ? "Review balance before guest handoff." : "No open notes."),
    pax: `${reservation.adults} adult${reservation.adults === 1 ? "" : "s"}${
      reservation.children > 0
        ? `, ${reservation.children} child${reservation.children === 1 ? "" : "ren"}`
        : ""
    }`,
    priority,
    room: `${reservation.room.code} - ${reservation.room.name}`,
    roomCode: reservation.room.code,
    roomName: reservation.room.name,
    roomType: reservation.room.type,
    source: reservation.paymentMethod || "Reservation",
    status,
    time,
    totalAmount: reservation.totalAmount,
    updatedAt: reservation.updatedAt,
  };
}

function toTenantReceptionRequestOutput(request: {
  createdAt: Date;
  department: string;
  id: string;
  note: string;
  priority: "NORMAL" | "URGENT";
  roomOrArea: string;
  status: "OPEN" | "SENT" | "RESOLVED";
  updatedAt: Date;
}) {
  return {
    createdAt: request.createdAt,
    department: request.department,
    id: request.id,
    note: request.note,
    priority: fromTenantReceptionRequestPriority(request.priority),
    roomOrArea: request.roomOrArea,
    status:
      request.status === "RESOLVED"
        ? "Resolved"
        : request.status === "OPEN"
          ? "Open"
          : "Sent",
    updatedAt: request.updatedAt,
  };
}

function toTenantReceptionShiftNoteOutput(note: {
  createdAt: Date;
  id: string;
  note: string;
  title: string;
  updatedAt: Date;
}) {
  return {
    createdAt: note.createdAt,
    id: note.id,
    note: note.note,
    title: note.title,
    updatedAt: note.updatedAt,
  };
}

function toTenantMaintenanceRequestOutput(request: {
  area: string;
  code: string;
  completedAt: Date | null;
  createdAt: Date;
  forwardedBy: string;
  id: string;
  issue: string;
  notes: string | null;
  priority: "NORMAL" | "URGENT";
  resolution: string | null;
  roomId: string | null;
  status: "PENDING" | "COMPLETED";
  updatedAt: Date;
}) {
  return {
    area: request.area,
    code: request.code,
    completedAt: request.completedAt,
    createdAt: request.createdAt,
    forwardedBy: request.forwardedBy,
    id: request.id,
    issue: request.issue,
    notes: request.notes ?? "",
    priority: fromTenantMaintenancePriority(request.priority),
    requestedAt: request.createdAt.toLocaleDateString("en-US", {
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      month: "short",
    }),
    resolution: request.resolution ?? "",
    roomId: request.roomId ?? "",
    status: fromTenantMaintenanceStatus(request.status),
    updatedAt: request.updatedAt,
  };
}

function toTenantLaundryJobOutput(job: {
  category: string;
  code: string;
  createdAt: Date;
  dueTime: string;
  guestOrRoom: string;
  id: string;
  notes: string | null;
  pieces: number;
  priority: "NORMAL" | "URGENT";
  receivedAt: Date;
  status: "RECEIVED" | "WASHING" | "DRYING" | "READY" | "RETURNED";
  updatedAt: Date;
}) {
  return {
    category: job.category,
    code: job.code,
    createdAt: job.createdAt,
    dueTime: job.dueTime,
    guestOrRoom: job.guestOrRoom,
    id: job.id,
    notes: job.notes ?? "",
    pieces: job.pieces,
    priority: fromTenantLaundryPriority(job.priority),
    receivedAt: job.receivedAt,
    status: fromTenantLaundryStatus(job.status),
    updatedAt: job.updatedAt,
  };
}

function toTenantInventoryItemOutput(item: {
  category: string;
  code: string;
  createdAt: Date;
  dashboardAlert: boolean;
  description: string | null;
  id: string;
  movements: Array<{
    quantity: number;
    reason: string;
    type: "IN" | "OUT";
  }>;
  name: string;
  notes: string | null;
  quantity: number;
  threshold: number;
  unit: string;
  updatedAt: Date;
}) {
  const lastMovement = item.movements[0];

  return {
    category: item.category,
    code: item.code,
    createdAt: item.createdAt,
    dashboardAlert: item.dashboardAlert,
    description: item.description ?? "",
    id: item.id,
    lastMovement: lastMovement
      ? `${lastMovement.type === "IN" ? "Stock in" : "Stock out"} · ${lastMovement.quantity} ${item.unit} · ${lastMovement.reason}`
      : "No movement yet",
    name: item.name,
    notes: item.notes ?? "",
    quantity: item.quantity,
    threshold: item.threshold,
    unit: item.unit,
    updatedAt: item.updatedAt,
  };
}

function toTenantInventoryMovementOutput(movement: {
  code: string;
  createdAt: Date;
  id: string;
  item: {
    name: string;
  };
  quantity: number;
  reason: string;
  type: "IN" | "OUT";
}) {
  return {
    createdAt: movement.createdAt,
    id: movement.id,
    itemName: movement.item.name,
    code: movement.code,
    quantity: movement.quantity,
    reason: movement.reason,
    type: movement.type,
  };
}

function toTenantHousekeepingRoomOutput(room: {
  id: string;
  code: string;
  name: string;
  status: "AVAILABLE" | "OCCUPIED" | "MAINTENANCE" | "OUT_OF_SERVICE";
  housekeepingState: {
    attendantStaffProfileId: string | null;
    lastPhotoAt: Date | null;
    lastPhotoKey: string | null;
    lastPhotoName: string | null;
    lastPhotoNote: string | null;
    lastPhotoSize: number | null;
    lastPhotoUrl: string | null;
    status: "CLEAN" | "DIRTY" | "OCCUPIED" | "VACANT";
    attendantStaffProfile: {
      appUser: {
        displayName: string;
      };
    } | null;
  } | null;
  reservations: Array<{
    checkIn: Date;
    checkOut: Date;
    guestName: string;
    status: "PENDING" | "CONFIRMED" | "CHECKED_IN" | "CHECKED_OUT" | "CANCELED";
  }>;
}) {
  const activeReservation =
    room.reservations.find((reservation) => reservation.status === "CHECKED_IN") ??
    room.reservations[0] ??
    null;
  const nextGuest =
    activeReservation?.status === "CHECKED_IN"
      ? "Checkout today"
      : activeReservation
        ? `${activeReservation.guestName}, ${activeReservation.checkIn.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}`
        : "No arrival";
  const housekeepingStatus = room.housekeepingState
    ? fromTenantHousekeepingStatus(room.housekeepingState.status)
    : getHousekeepingStatusFromRoomStatus(room.status);

  return {
    attendant:
      room.housekeepingState?.attendantStaffProfile?.appUser.displayName ??
      "Unassigned",
    attendantStaffProfileId:
      room.housekeepingState?.attendantStaffProfileId ?? "",
    id: room.id,
    lastPhoto: room.housekeepingState?.lastPhotoAt
      ? room.housekeepingState.lastPhotoAt.toLocaleDateString("en-US", {
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
          month: "short",
        })
      : "Needs new photo",
    lastPhotoFile: room.housekeepingState?.lastPhotoUrl
      ? {
          key: room.housekeepingState.lastPhotoKey ?? "",
          name: room.housekeepingState.lastPhotoName ?? "Room photo",
          size: room.housekeepingState.lastPhotoSize ?? undefined,
          url: room.housekeepingState.lastPhotoUrl,
        }
      : null,
    lastPhotoNote: room.housekeepingState?.lastPhotoNote ?? "",
    name: room.name,
    nextGuest,
    roomLabel: `${room.code} - ${room.name}`,
    status: housekeepingStatus,
  };
}

function toTenantHousekeepingDamageOutput(report: {
  createdAt: Date;
  details: string;
  id: string;
  photoKey: string | null;
  photoName: string | null;
  photoNote: string | null;
  photoSize: number | null;
  photoUrl: string | null;
  status: "OPEN" | "RESOLVED";
  title: string;
  updatedAt: Date;
  room: {
    code: string;
    name: string;
  };
}) {
  return {
    createdAt: report.createdAt,
    details: report.details,
    id: report.id,
    photo: report.photoUrl
      ? {
          key: report.photoKey ?? "",
          name: report.photoName ?? "Damage photo",
          size: report.photoSize ?? undefined,
          url: report.photoUrl,
        }
      : null,
    photoNote: report.photoNote ?? "",
    roomLabel: `${report.room.code} - ${report.room.name}`,
    status: report.status === "RESOLVED" ? "Resolved" : "Open",
    title: report.title,
    updatedAt: report.updatedAt,
  };
}

function toTenantServiceOutput(service: {
  id: string;
  baseCharge: string;
  billingType: "FIXED_PRICE" | "PER_HOUR" | "PER_GUEST" | "CUSTOM_QUOTE";
  bookingLeadTime: string | null;
  category: string;
  code: string;
  createdAt: Date;
  description: string | null;
  duration: string | null;
  feeNote: string | null;
  internalNotes: string | null;
  provider: string | null;
  showOnBookingPage: boolean;
  status: "ACTIVE" | "INACTIVE";
  title: string;
  updatedAt: Date;
}) {
  return {
    id: service.id,
    baseCharge: service.baseCharge,
    billingType: fromTenantServiceBillingType(service.billingType),
    bookingLeadTime: service.bookingLeadTime ?? "",
    category: service.category,
    code: service.code,
    createdAt: service.createdAt,
    description: service.description ?? "",
    duration: service.duration ?? "",
    feeNote: service.feeNote ?? "",
    internalNotes: service.internalNotes ?? "",
    provider: service.provider ?? "",
    showOnBookingPage: service.showOnBookingPage,
    status: fromTenantServiceStatus(service.status),
    title: service.title,
    updatedAt: service.updatedAt,
  };
}

function toTenantFinanceEntryOutput(entry: {
  id: string;
  amount: string;
  category: string;
  code: string;
  createdAt: Date;
  department: string | null;
  description: string;
  entryDate: Date;
  notes: string | null;
  receiptKey: string | null;
  receiptName: string | null;
  receiptSize: number | null;
  receiptType: string | null;
  receiptUrl: string | null;
  source: "MANUAL" | "AUTO_BOOKING" | "INVOICE_PAYMENT";
  status: "CLEARED" | "PENDING";
  type: "REVENUE" | "EXPENSE";
  updatedAt: Date;
}) {
  return {
    id: entry.id,
    amount: entry.amount,
    category: entry.category,
    code: entry.code,
    createdAt: entry.createdAt,
    department: entry.department ?? "",
    description: entry.description,
    entryDate: entry.entryDate,
    notes: entry.notes ?? "",
    receiptKey: entry.receiptKey ?? "",
    receiptName: entry.receiptName ?? "",
    receiptSize: entry.receiptSize ?? 0,
    receiptType: entry.receiptType ?? "",
    receiptUrl: entry.receiptUrl ?? "",
    source: fromTenantFinanceEntrySource(entry.source),
    status: fromTenantFinanceEntryStatus(entry.status),
    type: fromTenantFinanceEntryType(entry.type),
    updatedAt: entry.updatedAt,
  };
}

function toTenantTransactionExportOutput(exportJob: {
  code: string;
  createdAt: Date;
  format: "CSV" | "PDF" | "TXT" | "XLSX";
  id: string;
  name: string;
  period: string;
  rowCount: number;
  size: string;
  status: "READY" | "SCHEDULED" | "FAILED";
  updatedAt: Date;
}) {
  return {
    createdAt: exportJob.createdAt,
    format: exportJob.format,
    id: exportJob.id,
    name: exportJob.name,
    period: exportJob.period,
    rowCount: exportJob.rowCount,
    size: exportJob.size,
    status: exportJob.status === "READY"
      ? "Ready"
      : exportJob.status === "SCHEDULED"
        ? "Scheduled"
        : "Failed",
    updatedAt: exportJob.updatedAt,
    code: exportJob.code,
  };
}

function toTenantInvoiceOutput(invoice: {
  id: string;
  balanceDue: string;
  code: string;
  createdAt: Date;
  depositPaid: string;
  discount: string;
  dueDate: Date;
  guestEmail: string | null;
  guestName: string;
  invoiceDate: Date;
  lastReminderSentAt: Date | null;
  notes: string | null;
  nextReminderAt: Date | null;
  paymentInstructions: string | null;
  paymentMethod: string | null;
  reminderCadence: "STANDARD" | "LIGHT" | "STRICT" | "PAUSED";
  reservationId: string | null;
  status: "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "VOID";
  subtotal: string;
  tax: string;
  totalAmount: string;
  updatedAt: Date;
  lineItems: Array<{
    amount: string;
    description: string;
    id: string;
    quantity: number;
    rate: string;
    sortOrder: number;
  }>;
  reservation?: {
    id: string;
    room: {
      code: string;
      name: string;
    };
  } | null;
}) {
  return {
    id: invoice.id,
    balanceDue: invoice.balanceDue,
    bookingReference: invoice.reservation?.id ?? "",
    code: invoice.code,
    createdAt: invoice.createdAt,
    depositPaid: invoice.depositPaid,
    discount: invoice.discount,
    dueDate: invoice.dueDate,
    guestEmail: invoice.guestEmail ?? "",
    guestName: invoice.guestName,
    invoiceDate: invoice.invoiceDate,
    lastReminderSentAt: invoice.lastReminderSentAt,
    lineItems: invoice.lineItems
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((item) => ({
        amount: item.amount,
        description: item.description,
        id: item.id,
        quantity: item.quantity,
        rate: item.rate,
      })),
    notes: invoice.notes ?? "",
    nextReminderAt: invoice.nextReminderAt,
    paymentInstructions: invoice.paymentInstructions ?? "",
    paymentMethod: invoice.paymentMethod ?? "",
    reminderCadence: fromTenantInvoiceReminderCadence(invoice.reminderCadence),
    reservationId: invoice.reservationId ?? "",
    roomLabel: invoice.reservation
      ? `${invoice.reservation.room.code} - ${invoice.reservation.room.name}`
      : "",
    status: fromTenantInvoiceStatus(invoice.status),
    subtotal: invoice.subtotal,
    tax: invoice.tax,
    totalAmount: invoice.totalAmount,
    updatedAt: invoice.updatedAt,
  };
}

function toTenantStaffInvitationOutput(invitation: {
  id: string;
  email: string;
  roleName: string;
  message: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  const displayName = invitation.email.split("@")[0] || invitation.email;

  return {
    recordType: "invitation" as const,
    id: invitation.id,
    authUserId: "",
    email: invitation.email,
    firstName: "",
    lastName: "",
    displayName,
    username: "",
    phoneNumber: "",
    roleName: invitation.roleName,
    status: "Invited" as const,
    permissions: [],
    notes: invitation.message ?? "",
    tags: [],
    createdAt: invitation.createdAt,
    updatedAt: invitation.updatedAt,
  };
}

export const appRouter = createTRPCRouter({
  hello: baseProcedure
    .input(
      z.object({
        text: z.string(),
      }),
    )
    .query(({ input }) => {
      return {
        greeting: `hello ${input.text}`,
      };
    }),
  auth: createTRPCRouter({
    validateInvitation: baseProcedure
      .input(
        z.object({
          token: z.string().trim().min(1, "Invitation token is required."),
        }),
      )
      .query(async ({ input }) => {
        const invitation = await prisma.tenantStaffInvitation.findUnique({
          where: {
            tokenHash: hashInviteToken(input.token),
          },
          include: {
            tenantProfile: true,
          },
        });

        if (!invitation) {
          return {
            valid: false as const,
            reason: "invalid" as const,
          };
        }

        if (invitation.status !== "PENDING") {
          return {
            valid: false as const,
            reason: invitation.status.toLowerCase(),
          };
        }

        if (invitation.expiresAt <= new Date()) {
          await prisma.tenantStaffInvitation.update({
            where: {
              id: invitation.id,
            },
            data: {
              status: "EXPIRED",
            },
          });

          return {
            valid: false as const,
            reason: "expired" as const,
          };
        }

        return {
          valid: true as const,
          email: invitation.email,
          expiresAt: invitation.expiresAt,
          message: invitation.message,
          roleName: invitation.roleName,
          workspaceName:
            invitation.tenantProfile.resortName ??
            invitation.tenantProfile.businessName ??
            "ResortCloud workspace",
        };
      }),
    resolveSignInIdentifier: baseProcedure
      .input(
        z.object({
          identifier: z.string().trim().min(1),
        }),
      )
      .mutation(async ({ input }) => {
        const identifier = input.identifier.toLowerCase();

        if (identifier.includes("@")) {
          return {
            email: identifier,
          };
        }

        const staffProfile = await prisma.tenantStaffProfile.findFirst({
          where: {
            username: identifier,
          },
          include: {
            appUser: true,
            department: true,
          },
        });

        if (!staffProfile) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Username not found.",
          });
        }

        return {
          email: staffProfile.appUser.email,
        };
      }),
    resolveRedirect: baseProcedure.mutation(async ({ ctx }) => {
      const authUser = ctx.session?.user;

      if (!authUser?.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Sign in required.",
        });
      }

      const appUser = await prisma.appUser.findUnique({
        where: {
          authUserId: authUser.id,
        },
        include: {
          staffProfile: {
            include: {
              tenantProfile: true,
            },
          },
          tenantProfile: true,
        },
      });

      if (!appUser) {
        return {
          redirectTo: "/auth/sign-up",
        };
      }

      if (appUser.role === "TENANT_STAFF" && appUser.staffProfile?.status === "SUSPENDED") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Staff account suspended.",
        });
      }

      return {
        redirectTo: getAppRedirectPath({
          role: appUser.role,
          tenantOnboardingStatus: getTenantOnboardingStatusForAccess(appUser),
        }),
      };
    }),
    finalizeSignUp: baseProcedure
      .input(
        z.object({
          firstName: z.string().optional(),
          lastName: z.string().optional(),
          role: roleSchema,
          plan: planSchema.default("free_trial"),
          billing: billingSchema.default("monthly"),
          checkout: z.string().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const authUser = ctx.session?.user;

        if (!authUser?.id || !authUser.email) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Sign-up session missing.",
          });
        }

        const [fallbackFirstName = "User", ...fallbackLastNameParts] = (
          authUser.name ||
          authUser.email.split("@")[0] ||
          "User"
        )
          .trim()
          .split(/\s+/);
        const firstName = input.firstName?.trim() || fallbackFirstName;
        const lastName =
          input.lastName?.trim() || fallbackLastNameParts.join(" ") || "";
        const displayName =
          `${firstName} ${lastName}`.trim() || authUser.name || authUser.email;
        const isTenant = input.role === "TENANT";
        const isPolarCheckout =
          isTenant && input.checkout === "polar" && input.plan !== "free_trial";
        const now = new Date();
        const trialEndsAt = getTrialEndDate();

        const appUser = await prisma.appUser.upsert({
          where: {
            authUserId: authUser.id,
          },
          create: {
            authUserId: authUser.id,
            email: authUser.email,
            firstName,
            lastName,
            displayName,
            role: input.role,
            tenantProfile: isTenant
              ? {
                  create: {
                    subscriptionPlan: toTenantPlan(input.plan),
                    subscriptionStatus: isPolarCheckout ? "PENDING" : "TRIALING",
                    billingCycle: toBillingCycle(input.billing),
                    trialStartedAt: isPolarCheckout ? null : now,
                    trialEndsAt: isPolarCheckout ? null : trialEndsAt,
                    billingEmail: authUser.email,
                    onboardingStatus: "PENDING",
                  },
                }
              : undefined,
          },
          update: {
            email: authUser.email,
            firstName,
            lastName,
            displayName,
            role: input.role,
            tenantProfile: isTenant
              ? {
                  upsert: {
                    create: {
                      subscriptionPlan: toTenantPlan(input.plan),
                      subscriptionStatus: isPolarCheckout
                        ? "PENDING"
                        : "TRIALING",
                      billingCycle: toBillingCycle(input.billing),
                      trialStartedAt: isPolarCheckout ? null : now,
                      trialEndsAt: isPolarCheckout ? null : trialEndsAt,
                      billingEmail: authUser.email,
                      onboardingStatus: "PENDING",
                    },
                    update: {
                      subscriptionPlan: toTenantPlan(input.plan),
                      subscriptionStatus: isPolarCheckout
                        ? "PENDING"
                        : "TRIALING",
                      billingCycle: toBillingCycle(input.billing),
                      trialStartedAt: isPolarCheckout ? null : now,
                      trialEndsAt: isPolarCheckout ? null : trialEndsAt,
                      billingEmail: authUser.email,
                    },
                  },
                }
              : undefined,
          },
          include: {
            tenantProfile: true,
          },
        });

        if (isPolarCheckout) {
          const checkoutUrl = new URL(
            "/api/polar/checkout-plan",
            process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
          );
          checkoutUrl.searchParams.set("plan", input.plan);
          checkoutUrl.searchParams.set("billing", input.billing);

          return {
            redirectTo: checkoutUrl.pathname + checkoutUrl.search,
          };
        }

        return {
          redirectTo: getAppRedirectPath({
            role: appUser.role,
            tenantOnboardingStatus: getTenantOnboardingStatusForAccess(appUser),
          }),
        };
      }),
  }),
  tenant: createTRPCRouter({
    notifications: createTRPCRouter({
      list: baseProcedure.query(async ({ ctx }) => {
        const authUser = ctx.session?.user;

        if (!authUser?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Sign in required.",
          });
        }

        const tenantProfile = await getTenantProfileForSession(authUser.id);
        const now = new Date();
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        const nextWeek = new Date(todayStart);
        nextWeek.setDate(nextWeek.getDate() + 7);

        const [
          reservations,
          invoices,
          housekeepingRooms,
          damageReports,
          maintenanceRequests,
          leads,
          leaveRequests,
          inventoryItems,
        ] = await Promise.all([
          prisma.tenantReservation.findMany({
            where: {
              tenantProfileId: tenantProfile.id,
              OR: [
                { status: "PENDING" },
                {
                  checkIn: {
                    gte: todayStart,
                    lt: nextWeek,
                  },
                  status: {
                    in: ["CONFIRMED", "CHECKED_IN"],
                  },
                },
              ],
            },
            include: {
              room: {
                select: {
                  code: true,
                  name: true,
                },
              },
            },
            orderBy: {
              updatedAt: "desc",
            },
            take: 4,
          }),
          prisma.tenantInvoice.findMany({
            where: {
              tenantProfileId: tenantProfile.id,
              status: {
                in: ["SENT", "OVERDUE"],
              },
            },
            orderBy: {
              updatedAt: "desc",
            },
            take: 4,
          }),
          prisma.tenantHousekeepingRoom.findMany({
            where: {
              tenantProfileId: tenantProfile.id,
              status: "DIRTY",
            },
            include: {
              room: {
                select: {
                  code: true,
                  name: true,
                },
              },
            },
            orderBy: {
              updatedAt: "desc",
            },
            take: 3,
          }),
          prisma.tenantHousekeepingDamageReport.findMany({
            where: {
              tenantProfileId: tenantProfile.id,
              status: "OPEN",
            },
            include: {
              room: {
                select: {
                  code: true,
                  name: true,
                },
              },
            },
            orderBy: {
              updatedAt: "desc",
            },
            take: 3,
          }),
          prisma.tenantMaintenanceRequest.findMany({
            where: {
              tenantProfileId: tenantProfile.id,
              status: "PENDING",
            },
            orderBy: {
              updatedAt: "desc",
            },
            take: 4,
          }),
          prisma.tenantLead.findMany({
            where: {
              tenantProfileId: tenantProfile.id,
              stage: {
                in: ["INTAKE", "QUALIFIED"],
              },
            },
            orderBy: {
              lastMessageAt: "desc",
            },
            take: 3,
          }),
          prisma.tenantLeaveRequest.findMany({
            where: {
              tenantProfileId: tenantProfile.id,
              status: "PENDING",
            },
            include: {
              staffProfile: {
                include: {
                  appUser: {
                    select: {
                      displayName: true,
                    },
                  },
                },
              },
            },
            orderBy: {
              updatedAt: "desc",
            },
            take: 3,
          }),
          prisma.tenantInventoryItem.findMany({
            where: {
              tenantProfileId: tenantProfile.id,
              dashboardAlert: true,
            },
            orderBy: {
              updatedAt: "desc",
            },
            take: 20,
          }),
        ]);

        const inventoryAlerts = inventoryItems
          .filter((item) => item.quantity <= item.threshold)
          .slice(0, 3);

        const alerts = [
          ...reservations.map((reservation) => ({
            id: `reservation-${reservation.id}`,
            kind: "reservation" as const,
            title:
              reservation.status === "PENDING"
                ? "Booking needs confirmation"
                : "Upcoming check-in",
            description: `${reservation.guestName} - ${
              reservation.room?.code ?? reservation.room?.name ?? "room"
            }`,
            href: "/tenant/reservations/calendar",
            createdAt: reservation.updatedAt,
            unread: reservation.status === "PENDING",
          })),
          ...invoices.map((invoice) => ({
            id: `invoice-${invoice.id}`,
            kind: "invoice" as const,
            title:
              invoice.status === "OVERDUE"
                ? "Invoice overdue"
                : "Payment pending",
            description: `${invoice.code} - ${invoice.guestName} has balance ${invoice.balanceDue}.`,
            href: "/tenant/finance/money-status",
            createdAt: invoice.updatedAt,
            unread: true,
          })),
          ...housekeepingRooms.map((roomState) => ({
            id: `housekeeping-${roomState.id}`,
            kind: "housekeeping" as const,
            title: "Room needs housekeeping",
            description: `${
              roomState.room.code || roomState.room.name
            } is marked dirty.`,
            href: "/tenant/operations/housekeeping",
            createdAt: roomState.updatedAt,
            unread: true,
          })),
          ...damageReports.map((report) => ({
            id: `damage-${report.id}`,
            kind: "housekeeping" as const,
            title: "Damage report open",
            description: `${report.title} - ${
              report.room.code || report.room.name
            }`,
            href: "/tenant/operations/housekeeping",
            createdAt: report.updatedAt,
            unread: true,
          })),
          ...maintenanceRequests.map((request) => ({
            id: `maintenance-${request.id}`,
            kind: "maintenance" as const,
            title: "Maintenance request open",
            description: `${request.code} - ${request.area}: ${request.issue}`,
            href: "/tenant/operations/maintenance",
            createdAt: request.updatedAt,
            unread: true,
          })),
          ...leads.map((lead) => ({
            id: `lead-${lead.id}`,
            kind: "lead" as const,
            title: "Guest message waiting",
            description: `${lead.guestName}: ${
              lead.lastMessage ?? lead.inquiry ?? "New lead inquiry"
            }`,
            href: "/tenant/leads",
            createdAt: lead.lastMessageAt ?? lead.updatedAt,
            unread: true,
          })),
          ...leaveRequests.map((leaveRequest) => ({
            id: `leave-${leaveRequest.id}`,
            kind: "hr" as const,
            title: "Leave request pending",
            description: `${leaveRequest.staffProfile.appUser.displayName} requested ${leaveRequest.leaveType}.`,
            href: "/tenant/hr/leave-requests",
            createdAt: leaveRequest.updatedAt,
            unread: true,
          })),
          ...inventoryAlerts.map((item) => ({
            id: `inventory-${item.id}`,
            kind: "inventory" as const,
            title: "Inventory below threshold",
            description: `${item.name} has ${item.quantity} ${item.unit} left.`,
            href: "/tenant/operations/inventory",
            createdAt: item.updatedAt,
            unread: true,
          })),
        ]
          .sort((first, second) => second.createdAt.getTime() - first.createdAt.getTime())
          .slice(0, 8);

        return {
          alerts,
          unreadCount: alerts.filter((alert) => alert.unread).length,
        };
      }),
    }),
    analytics: createTRPCRouter({
      summary: baseProcedure
        .input(
          z
            .object({
              period: z.enum(["week", "month", "quarter"]).default("month"),
            })
            .optional(),
        )
        .query(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const tenantProfile = await getTenantProfileForSession(authUser.id);
          const period = input?.period ?? "month";
          const { end, start } = getAnalyticsRange(period);
          const days = getAnalyticsDays(start, end);
          const monthStarts = getAnalyticsMonthStarts();
          const trendStart = monthStarts[0] ?? start;
          const trendEnd = new Date();
          trendEnd.setHours(23, 59, 59, 999);

          const [
            rooms,
            reservations,
            financeEntries,
            invoices,
            housekeepingRooms,
            maintenanceRequests,
            receptionRequests,
            laundryJobs,
            inventoryItems,
          ] = await Promise.all([
            prisma.tenantRoom.findMany({
              where: { tenantProfileId: tenantProfile.id },
              select: { id: true },
            }),
            prisma.tenantReservation.findMany({
              where: {
                checkIn: { lte: end },
                checkOut: { gte: start },
                status: { not: "CANCELED" },
                tenantProfileId: tenantProfile.id,
              },
              select: {
                checkIn: true,
                checkOut: true,
                roomId: true,
              },
            }),
            prisma.tenantFinanceEntry.findMany({
              where: {
                entryDate: { gte: trendStart, lte: trendEnd },
                status: "CLEARED",
                tenantProfileId: tenantProfile.id,
              },
              select: {
                amount: true,
                entryDate: true,
                type: true,
              },
            }),
            prisma.tenantInvoice.findMany({
              where: {
                tenantProfileId: tenantProfile.id,
              },
              select: {
                balanceDue: true,
                status: true,
              },
            }),
            prisma.tenantHousekeepingRoom.findMany({
              where: { tenantProfileId: tenantProfile.id },
              select: { status: true },
            }),
            prisma.tenantMaintenanceRequest.findMany({
              where: {
                createdAt: { gte: start, lte: end },
                tenantProfileId: tenantProfile.id,
              },
              select: { status: true },
            }),
            prisma.tenantReceptionRequest.findMany({
              where: {
                createdAt: { gte: start, lte: end },
                tenantProfileId: tenantProfile.id,
              },
              select: { status: true },
            }),
            prisma.tenantLaundryJob.findMany({
              where: {
                receivedAt: { gte: start, lte: end },
                tenantProfileId: tenantProfile.id,
              },
              select: { status: true },
            }),
            prisma.tenantInventoryItem.findMany({
              where: { tenantProfileId: tenantProfile.id },
              select: {
                quantity: true,
                threshold: true,
              },
            }),
          ]);

          const roomCount = Math.max(rooms.length, 1);
          const occupancyData = days.map((day) => {
            const dayStart = new Date(day);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(day);
            dayEnd.setHours(23, 59, 59, 999);
            const occupiedRooms = new Set(
              reservations
                .filter(
                  (reservation) =>
                    reservation.checkIn.getTime() <= dayEnd.getTime() &&
                    reservation.checkOut.getTime() >= dayStart.getTime(),
                )
                .map((reservation) => reservation.roomId),
            ).size;
            const occupied = getAnalyticsPercent(occupiedRooms, roomCount);

            return {
              available: Math.max(0, 100 - occupied),
              day: day.toLocaleDateString("en-US", { weekday: "short" }),
              occupied,
            };
          });

          const periodEntries = financeEntries.filter((entry) =>
            isDateInRange(entry.entryDate, start, end),
          );
          const revenueTotal = periodEntries
            .filter((entry) => entry.type === "REVENUE")
            .reduce((total, entry) => total + parseMoneyAmount(entry.amount), 0);
          const expenseTotal = periodEntries
            .filter((entry) => entry.type === "EXPENSE")
            .reduce((total, entry) => total + parseMoneyAmount(entry.amount), 0);
          const receivables = invoices
            .filter(
              (invoice) => invoice.status !== "PAID" && invoice.status !== "VOID",
            )
            .reduce(
              (total, invoice) => total + parseMoneyAmount(invoice.balanceDue),
              0,
            );

          const revenueData = monthStarts.map((monthStart) => {
            const monthEnd = new Date(
              monthStart.getFullYear(),
              monthStart.getMonth() + 1,
              0,
              23,
              59,
              59,
              999,
            );
            const monthEntries = financeEntries.filter((entry) =>
              isDateInRange(entry.entryDate, monthStart, monthEnd),
            );

            return {
              expenses: monthEntries
                .filter((entry) => entry.type === "EXPENSE")
                .reduce(
                  (total, entry) => total + parseMoneyAmount(entry.amount),
                  0,
                ),
              month: monthStart.toLocaleDateString("en-US", {
                month: "short",
              }),
              revenue: monthEntries
                .filter((entry) => entry.type === "REVENUE")
                .reduce(
                  (total, entry) => total + parseMoneyAmount(entry.amount),
                  0,
                ),
            };
          });

          const housekeepingCompleted = housekeepingRooms.filter(
            (room) => room.status === "CLEAN" || room.status === "VACANT",
          ).length;
          const maintenanceCompleted = maintenanceRequests.filter(
            (request) => request.status === "COMPLETED",
          ).length;
          const receptionCompleted = receptionRequests.filter(
            (request) => request.status === "RESOLVED",
          ).length;
          const laundryCompleted = laundryJobs.filter(
            (job) => job.status === "RETURNED",
          ).length;
          const inventoryCompleted = inventoryItems.filter(
            (item) => item.quantity > item.threshold,
          ).length;

          const taskData = [
            {
              completed: getAnalyticsPercent(
                housekeepingCompleted,
                housekeepingRooms.length,
              ),
              department: "Housekeeping",
            },
            {
              completed: getAnalyticsPercent(
                maintenanceCompleted,
                maintenanceRequests.length,
              ),
              department: "Maintenance",
            },
            {
              completed: getAnalyticsPercent(
                receptionCompleted,
                receptionRequests.length,
              ),
              department: "Reception",
            },
            {
              completed: getAnalyticsPercent(laundryCompleted, laundryJobs.length),
              department: "Laundry",
            },
            {
              completed: getAnalyticsPercent(
                inventoryCompleted,
                inventoryItems.length,
              ),
              department: "Inventory",
            },
          ];
          const taskTotal =
            housekeepingRooms.length +
            maintenanceRequests.length +
            receptionRequests.length +
            laundryJobs.length +
            inventoryItems.length;
          const taskCompleted =
            housekeepingCompleted +
            maintenanceCompleted +
            receptionCompleted +
            laundryCompleted +
            inventoryCompleted;
          const taskCompletion = getAnalyticsPercent(taskCompleted, taskTotal);
          const openTasks = Math.max(taskTotal - taskCompleted, 0);
          const blockedTasks =
            maintenanceRequests.filter((request) => request.status === "PENDING")
              .length +
            inventoryItems.filter((item) => item.quantity <= item.threshold).length;
          const blockedPercent = getAnalyticsPercent(blockedTasks, taskTotal);
          const completedPercent = taskCompletion;
          const openPercent = Math.max(0, 100 - completedPercent - blockedPercent);
          const averageOccupancy = Math.round(
            occupancyData.reduce((total, item) => total + item.occupied, 0) /
              Math.max(occupancyData.length, 1),
          );
          const peakDay = occupancyData.reduce(
            (peak, item) => (item.occupied > peak.occupied ? item : peak),
            occupancyData[0] ?? { day: "--", occupied: 0 },
          );
          const availableRoomNights = days.length * rooms.length;
          const soldRoomNights = Math.round(
            (availableRoomNights * averageOccupancy) / 100,
          );
          const updated = new Date().toLocaleString("en-US", {
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
            month: "short",
            year: "numeric",
          });

          return {
            kpi: [
              {
                note: `${period === "week" ? "7-day" : period === "quarter" ? "Quarter" : "Month"} average`,
                title: "Occupancy",
                value: `${averageOccupancy}%`,
              },
              {
                note: "Selected period",
                title: "Revenue",
                value: formatAnalyticsMoney(revenueTotal),
              },
              {
                note: "Across departments",
                title: "Task completion",
                value: `${taskCompletion}%`,
              },
              {
                note: "Occupancy, revenue, tasks",
                title: "Exportable reports",
                value: "3",
              },
            ],
            occupancyData,
            reportRows: {
              occupancy: [
                ["Average occupancy", `${averageOccupancy}%`],
                ["Peak day", `${peakDay.day} · ${peakDay.occupied}%`],
                ["Available room nights", String(availableRoomNights)],
                ["Sold room nights", String(soldRoomNights)],
              ],
              revenue: [
                ["Period revenue", formatAnalyticsMoney(revenueTotal)],
                ["Expenses", formatAnalyticsMoney(expenseTotal)],
                ["Net", formatAnalyticsMoney(revenueTotal - expenseTotal)],
                ["Open receivables", formatAnalyticsMoney(receivables)],
              ],
              tasks: taskData.map((item) => [
                item.department,
                `${item.completed}% complete`,
              ]),
            },
            reports: [
              {
                format: "XLSX",
                scope: "Daily occupancy, arrivals, departures, room utilization",
                title: "Occupancy report",
                updated: `${updated}`,
              },
              {
                format: "PDF",
                scope: "Room revenue, invoice payments, expenses, net result",
                title: "Revenue report",
                updated: `${updated}`,
              },
              {
                format: "CSV",
                scope: "Housekeeping, maintenance, reception, laundry completion rate",
                title: "Department task completion",
                updated: `${updated}`,
              },
            ],
            revenueData,
            taskData,
            taskPieData: [
              { fill: "#000000", name: "Completed", value: completedPercent },
              { fill: "#71717a", name: "Open", value: openPercent },
              { fill: "#d4d4d8", name: "Blocked", value: blockedPercent },
            ],
            totals: {
              openTasks,
              receivables,
              revenue: revenueTotal,
              taskTotal,
            },
          };
        }),
    }),
    staffRecords: createTRPCRouter({
      list: baseProcedure.query(async ({ ctx }) => {
        const authUser = ctx.session?.user;

        if (!authUser?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Sign in required.",
          });
        }

        const tenantProfile = await getTenantProfileForSession(authUser.id);

        const staffProfiles = await prisma.tenantStaffProfile.findMany({
          where: {
            tenantProfileId: tenantProfile.id,
          },
          include: {
            appUser: true,
            department: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        });

        return staffProfiles.map((staffProfile) => ({
          ...toTenantStaffOutput(staffProfile),
          startDate: staffProfile.createdAt,
        }));
      }),
    }),
    timekeeping: createTRPCRouter({
      me: baseProcedure.query(async ({ ctx }) => {
        const authUser = ctx.session?.user;

        if (!authUser?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Sign in required.",
          });
        }

        const tenantProfile = await getTenantProfileForSession(authUser.id);
        const appUser = await prisma.appUser.findUnique({
          where: {
            authUserId: authUser.id,
          },
          include: {
            staffProfile: {
              include: {
                appUser: true,
                department: true,
              },
            },
          },
        });
        const isStaff = appUser?.role === "TENANT_STAFF" && !!appUser.staffProfile;
        const today = getWorkdayStart();
        const activeLog = isStaff
          ? await prisma.tenantTimeLog.findUnique({
              where: {
                staffProfileId_date: {
                  staffProfileId: appUser.staffProfile!.id,
                  date: today,
                },
              },
              include: {
                staffProfile: {
                  include: {
                    appUser: true,
                    department: true,
                  },
                },
              },
            })
          : null;

        return {
          isStaff,
          tenantProfileId: tenantProfile.id,
          staffProfile: appUser?.staffProfile
            ? toTenantStaffOutput(appUser.staffProfile)
            : null,
          todayLog: activeLog ? toTenantTimeLogOutput(activeLog) : null,
        };
      }),
      list: baseProcedure.query(async ({ ctx }) => {
        const authUser = ctx.session?.user;

        if (!authUser?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Sign in required.",
          });
        }

        const tenantProfile = await getTenantProfileForSession(authUser.id);
        const appUser = await prisma.appUser.findUnique({
          where: {
            authUserId: authUser.id,
          },
          include: {
            staffProfile: true,
          },
        });

        const logs = await prisma.tenantTimeLog.findMany({
          where: {
            tenantProfileId: tenantProfile.id,
            ...(appUser?.role === "TENANT_STAFF" && appUser.staffProfile
              ? { staffProfileId: appUser.staffProfile.id }
              : {}),
          },
          include: {
            staffProfile: {
              include: {
                appUser: true,
                department: true,
              },
            },
          },
          orderBy: [
            {
              date: "desc",
            },
            {
              createdAt: "desc",
            },
          ],
        });

        return logs.map(toTenantTimeLogOutput);
      }),
      clockIn: baseProcedure.mutation(async ({ ctx }) => {
        const authUser = ctx.session?.user;

        if (!authUser?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Sign in required.",
          });
        }

        const tenantProfile = await getTenantProfileForSession(authUser.id);
        const appUser = await prisma.appUser.findUnique({
          where: {
            authUserId: authUser.id,
          },
          include: {
            staffProfile: true,
          },
        });

        if (appUser?.role !== "TENANT_STAFF" || !appUser.staffProfile) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only staff can clock in.",
          });
        }

        const now = new Date();
        const today = getWorkdayStart(now);
        const existingLog = await prisma.tenantTimeLog.findUnique({
          where: {
            staffProfileId_date: {
              staffProfileId: appUser.staffProfile.id,
              date: today,
            },
          },
        });

        if (existingLog?.clockIn) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Already clocked in today.",
          });
        }

        const timeLog = await prisma.tenantTimeLog.upsert({
          where: {
            staffProfileId_date: {
              staffProfileId: appUser.staffProfile.id,
              date: today,
            },
          },
          create: {
            tenantProfileId: tenantProfile.id,
            staffProfileId: appUser.staffProfile.id,
            date: today,
            clockIn: now,
            flag: getTimeLogFlag(now),
          },
          update: {
            clockIn: now,
            flag: getTimeLogFlag(now),
          },
          include: {
            staffProfile: {
              include: {
                appUser: true,
                department: true,
              },
            },
          },
        });

        return toTenantTimeLogOutput(timeLog);
      }),
      clockOut: baseProcedure.mutation(async ({ ctx }) => {
        const authUser = ctx.session?.user;

        if (!authUser?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Sign in required.",
          });
        }

        await getTenantProfileForSession(authUser.id);
        const appUser = await prisma.appUser.findUnique({
          where: {
            authUserId: authUser.id,
          },
          include: {
            staffProfile: true,
          },
        });

        if (appUser?.role !== "TENANT_STAFF" || !appUser.staffProfile) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only staff can clock out.",
          });
        }

        const today = getWorkdayStart();
        const existingLog = await prisma.tenantTimeLog.findUnique({
          where: {
            staffProfileId_date: {
              staffProfileId: appUser.staffProfile.id,
              date: today,
            },
          },
        });

        if (!existingLog?.clockIn) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Clock in before clocking out.",
          });
        }

        if (existingLog.clockOut) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Already clocked out today.",
          });
        }

        const timeLog = await prisma.tenantTimeLog.update({
          where: {
            id: existingLog.id,
          },
          data: {
            clockOut: new Date(),
          },
          include: {
            staffProfile: {
              include: {
                appUser: true,
                department: true,
              },
            },
          },
        });

        return toTenantTimeLogOutput(timeLog);
      }),
      updateFlag: baseProcedure
        .input(
          z.object({
            id: z.string(),
            flag: tenantTimeLogFlagSchema,
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const tenantProfile = await getTenantProfileForSession(authUser.id);
          const appUser = await prisma.appUser.findUnique({
            where: {
              authUserId: authUser.id,
            },
          });

          if (appUser?.role === "TENANT_STAFF") {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Only tenant admin can edit time log flags.",
            });
          }

          const existingLog = await prisma.tenantTimeLog.findFirst({
            where: {
              id: input.id,
              tenantProfileId: tenantProfile.id,
            },
          });

          if (!existingLog) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Time log not found.",
            });
          }

          const timeLog = await prisma.tenantTimeLog.update({
            where: {
              id: existingLog.id,
            },
            data: {
              flag: toTenantTimeLogFlag(input.flag),
            },
            include: {
              staffProfile: {
                include: {
                  appUser: true,
                  department: true,
                },
              },
            },
          });

          return toTenantTimeLogOutput(timeLog);
        }),
    }),
    scheduling: createTRPCRouter({
      list: baseProcedure.query(async ({ ctx }) => {
        const authUser = ctx.session?.user;

        if (!authUser?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Sign in required.",
          });
        }

        const tenantProfile = await getTenantProfileForSession(authUser.id);
        const appUser = await prisma.appUser.findUnique({
          where: {
            authUserId: authUser.id,
          },
          include: {
            staffProfile: true,
          },
        });

        const shifts = await prisma.tenantScheduleShift.findMany({
          where: {
            tenantProfileId: tenantProfile.id,
            ...(appUser?.role === "TENANT_STAFF" && appUser.staffProfile
              ? { staffProfileId: appUser.staffProfile.id }
              : {}),
          },
          include: {
            staffProfile: {
              include: {
                appUser: true,
              },
            },
          },
          orderBy: [
            {
              startAt: "asc",
            },
            {
              createdAt: "desc",
            },
          ],
        });

        return shifts.map(toTenantScheduleShiftOutput);
      }),
      save: baseProcedure
        .input(
          z.object({
            id: z.string().optional(),
            staffProfileId: optionalTrimmedString,
            shift: z.string().trim().min(1, "Shift name is required."),
            role: z.string().trim().min(1, "Role is required."),
            department: optionalTrimmedString,
            startAt: z.coerce.date(),
            endAt: z.coerce.date(),
            status: tenantScheduleShiftStatusSchema.default("Assigned"),
            notes: optionalTrimmedString,
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const tenantProfile = await getTenantProfileForSession(authUser.id);
          const appUser = await prisma.appUser.findUnique({
            where: {
              authUserId: authUser.id,
            },
          });

          if (appUser?.role === "TENANT_STAFF") {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Only tenant admin can manage schedules.",
            });
          }

          if (input.endAt <= input.startAt) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Shift end must be after shift start.",
            });
          }

          const staffProfile = input.staffProfileId
            ? await prisma.tenantStaffProfile.findFirst({
                where: {
                  id: input.staffProfileId,
                  tenantProfileId: tenantProfile.id,
                },
                include: {
                  department: true,
                },
              })
            : null;

          if (input.staffProfileId && !staffProfile) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Staff profile not found.",
            });
          }

          if (input.id) {
            const existingShift = await prisma.tenantScheduleShift.findFirst({
              where: {
                id: input.id,
                tenantProfileId: tenantProfile.id,
              },
            });

            if (!existingShift) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Shift not found.",
              });
            }
          }

          const status =
            input.status === "Assigned" && !input.staffProfileId
              ? "OPEN"
              : toTenantScheduleShiftStatus(input.status);
          const shift = await prisma.tenantScheduleShift.upsert({
            where: {
              id: input.id ?? "",
            },
            create: {
              tenantProfileId: tenantProfile.id,
              staffProfileId: staffProfile?.id,
              shift: input.shift,
              role: input.role,
              department: input.department ?? staffProfile?.department?.name,
              startAt: input.startAt,
              endAt: input.endAt,
              status,
              notes: input.notes,
            },
            update: {
              staffProfileId: staffProfile?.id,
              shift: input.shift,
              role: input.role,
              department: input.department ?? staffProfile?.department?.name,
              startAt: input.startAt,
              endAt: input.endAt,
              status,
              notes: input.notes,
            },
            include: {
              staffProfile: {
                include: {
                  appUser: true,
                },
              },
            },
          });

          return toTenantScheduleShiftOutput(shift);
        }),
      delete: baseProcedure
        .input(
          z.object({
            id: z.string(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const tenantProfile = await getTenantProfileForSession(authUser.id);
          const appUser = await prisma.appUser.findUnique({
            where: {
              authUserId: authUser.id,
            },
          });

          if (appUser?.role === "TENANT_STAFF") {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Only tenant admin can delete schedules.",
            });
          }

          const existingShift = await prisma.tenantScheduleShift.findFirst({
            where: {
              id: input.id,
              tenantProfileId: tenantProfile.id,
            },
          });

          if (!existingShift) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Shift not found.",
            });
          }

          await prisma.tenantScheduleShift.delete({
            where: {
              id: existingShift.id,
            },
          });

          return {
            id: existingShift.id,
          };
        }),
    }),
    leaveRequests: createTRPCRouter({
      list: baseProcedure.query(async ({ ctx }) => {
        const authUser = ctx.session?.user;

        if (!authUser?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Sign in required.",
          });
        }

        const tenantProfile = await getTenantProfileForSession(authUser.id);
        const appUser = await prisma.appUser.findUnique({
          where: {
            authUserId: authUser.id,
          },
          include: {
            staffProfile: true,
          },
        });

        const requests = await prisma.tenantLeaveRequest.findMany({
          where: {
            tenantProfileId: tenantProfile.id,
            ...(appUser?.role === "TENANT_STAFF" && appUser.staffProfile
              ? { staffProfileId: appUser.staffProfile.id }
              : {}),
          },
          include: {
            staffProfile: {
              include: {
                appUser: true,
              },
            },
          },
          orderBy: [
            {
              createdAt: "desc",
            },
          ],
        });

        return requests.map(toTenantLeaveRequestOutput);
      }),
      save: baseProcedure
        .input(
          z.object({
            id: z.string().optional(),
            staffProfileId: optionalTrimmedString,
            type: z.string().trim().min(1, "Leave type is required."),
            startDate: z.coerce.date(),
            endDate: z.coerce.date(),
            reason: z.string().trim().min(1, "Reason is required."),
            balanceDays: z.coerce.number().int().min(0).default(0),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const tenantProfile = await getTenantProfileForSession(authUser.id);
          const appUser = await prisma.appUser.findUnique({
            where: {
              authUserId: authUser.id,
            },
            include: {
              staffProfile: true,
            },
          });

          if (input.endDate < input.startDate) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Leave end date must be after start date.",
            });
          }

          const staffProfileId =
            appUser?.role === "TENANT_STAFF"
              ? appUser.staffProfile?.id
              : input.staffProfileId;

          if (!staffProfileId) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Staff is required.",
            });
          }

          const staffProfile = await prisma.tenantStaffProfile.findFirst({
            where: {
              id: staffProfileId,
              tenantProfileId: tenantProfile.id,
            },
          });

          if (!staffProfile) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Staff profile not found.",
            });
          }

          if (input.id) {
            const existingRequest = await prisma.tenantLeaveRequest.findFirst({
              where: {
                id: input.id,
                tenantProfileId: tenantProfile.id,
              },
            });

            if (!existingRequest) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Leave request not found.",
              });
            }
          }

          const request = await prisma.tenantLeaveRequest.upsert({
            where: {
              id: input.id ?? "",
            },
            create: {
              tenantProfileId: tenantProfile.id,
              staffProfileId: staffProfile.id,
              leaveType: input.type,
              startDate: input.startDate,
              endDate: input.endDate,
              reason: input.reason,
              balanceDays: input.balanceDays,
            },
            update: {
              staffProfileId: staffProfile.id,
              leaveType: input.type,
              startDate: input.startDate,
              endDate: input.endDate,
              reason: input.reason,
              balanceDays: input.balanceDays,
            },
            include: {
              staffProfile: {
                include: {
                  appUser: true,
                },
              },
            },
          });

          return toTenantLeaveRequestOutput(request);
        }),
      updateStatus: baseProcedure
        .input(
          z.object({
            id: z.string(),
            status: tenantLeaveRequestStatusSchema,
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const tenantProfile = await getTenantProfileForSession(authUser.id);
          const appUser = await prisma.appUser.findUnique({
            where: {
              authUserId: authUser.id,
            },
          });

          if (appUser?.role === "TENANT_STAFF") {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Only tenant admin can approve or reject leave.",
            });
          }

          const existingRequest = await prisma.tenantLeaveRequest.findFirst({
            where: {
              id: input.id,
              tenantProfileId: tenantProfile.id,
            },
          });

          if (!existingRequest) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Leave request not found.",
            });
          }

          const request = await prisma.tenantLeaveRequest.update({
            where: {
              id: existingRequest.id,
            },
            data: {
              reviewedAt: new Date(),
              status: toTenantLeaveRequestStatus(input.status),
            },
            include: {
              staffProfile: {
                include: {
                  appUser: true,
                },
              },
            },
          });

          return toTenantLeaveRequestOutput(request);
        }),
      delete: baseProcedure
        .input(
          z.object({
            id: z.string(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const tenantProfile = await getTenantProfileForSession(authUser.id);
          const existingRequest = await prisma.tenantLeaveRequest.findFirst({
            where: {
              id: input.id,
              tenantProfileId: tenantProfile.id,
            },
          });

          if (!existingRequest) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Leave request not found.",
            });
          }

          await prisma.tenantLeaveRequest.delete({
            where: {
              id: existingRequest.id,
            },
          });

          return {
            id: existingRequest.id,
          };
        }),
    }),
    otUndertime: createTRPCRouter({
      list: baseProcedure.query(async ({ ctx }) => {
        const authUser = ctx.session?.user;

        if (!authUser?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Sign in required.",
          });
        }

        const tenantProfile = await getTenantProfileForSession(authUser.id);
        const appUser = await prisma.appUser.findUnique({
          where: {
            authUserId: authUser.id,
          },
          include: {
            staffProfile: true,
          },
        });

        const entries = await prisma.tenantOtUndertimeEntry.findMany({
          where: {
            tenantProfileId: tenantProfile.id,
            ...(appUser?.role === "TENANT_STAFF" && appUser.staffProfile
              ? { staffProfileId: appUser.staffProfile.id }
              : {}),
          },
          include: {
            staffProfile: {
              include: {
                appUser: true,
              },
            },
          },
          orderBy: [
            {
              createdAt: "desc",
            },
          ],
        });

        return entries.map(toTenantOtUndertimeOutput);
      }),
      save: baseProcedure
        .input(
          z.object({
            id: z.string().optional(),
            staffProfileId: optionalTrimmedString,
            type: tenantOtUndertimeTypeSchema,
            hours: z.string().trim().min(1, "Hours are required."),
            payPeriod: z.string().trim().min(1, "Pay period is required."),
            reason: z.string().trim().min(1, "Reason is required."),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const tenantProfile = await getTenantProfileForSession(authUser.id);
          const appUser = await prisma.appUser.findUnique({
            where: {
              authUserId: authUser.id,
            },
            include: {
              staffProfile: true,
            },
          });
          const hoursValue = Number.parseFloat(input.hours);

          if (!Number.isFinite(hoursValue) || hoursValue <= 0) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Hours must be greater than zero.",
            });
          }

          const staffProfileId =
            appUser?.role === "TENANT_STAFF"
              ? appUser.staffProfile?.id
              : input.staffProfileId;

          if (!staffProfileId) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Staff is required.",
            });
          }

          const staffProfile = await prisma.tenantStaffProfile.findFirst({
            where: {
              id: staffProfileId,
              tenantProfileId: tenantProfile.id,
            },
          });

          if (!staffProfile) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Staff profile not found.",
            });
          }

          if (input.id) {
            const existingEntry = await prisma.tenantOtUndertimeEntry.findFirst({
              where: {
                id: input.id,
                tenantProfileId: tenantProfile.id,
              },
            });

            if (!existingEntry) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "OT/undertime entry not found.",
              });
            }
          }

          const entry = await prisma.tenantOtUndertimeEntry.upsert({
            where: {
              id: input.id ?? "",
            },
            create: {
              tenantProfileId: tenantProfile.id,
              staffProfileId: staffProfile.id,
              type: toTenantOtUndertimeType(input.type),
              hours: input.hours,
              payPeriod: input.payPeriod,
              reason: input.reason,
            },
            update: {
              staffProfileId: staffProfile.id,
              type: toTenantOtUndertimeType(input.type),
              hours: input.hours,
              payPeriod: input.payPeriod,
              reason: input.reason,
            },
            include: {
              staffProfile: {
                include: {
                  appUser: true,
                },
              },
            },
          });

          return toTenantOtUndertimeOutput(entry);
        }),
      updateStatus: baseProcedure
        .input(
          z.object({
            id: z.string(),
            status: tenantOtUndertimeStatusSchema,
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const tenantProfile = await getTenantProfileForSession(authUser.id);
          const appUser = await prisma.appUser.findUnique({
            where: {
              authUserId: authUser.id,
            },
          });

          if (appUser?.role === "TENANT_STAFF") {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Only tenant admin can approve or reject OT/undertime.",
            });
          }

          const existingEntry = await prisma.tenantOtUndertimeEntry.findFirst({
            where: {
              id: input.id,
              tenantProfileId: tenantProfile.id,
            },
          });

          if (!existingEntry) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "OT/undertime entry not found.",
            });
          }

          const entry = await prisma.tenantOtUndertimeEntry.update({
            where: {
              id: existingEntry.id,
            },
            data: {
              reviewedAt: new Date(),
              status: toTenantOtUndertimeStatus(input.status),
            },
            include: {
              staffProfile: {
                include: {
                  appUser: true,
                },
              },
            },
          });

          return toTenantOtUndertimeOutput(entry);
        }),
      delete: baseProcedure
        .input(
          z.object({
            id: z.string(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const tenantProfile = await getTenantProfileForSession(authUser.id);
          const existingEntry = await prisma.tenantOtUndertimeEntry.findFirst({
            where: {
              id: input.id,
              tenantProfileId: tenantProfile.id,
            },
          });

          if (!existingEntry) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "OT/undertime entry not found.",
            });
          }

          await prisma.tenantOtUndertimeEntry.delete({
            where: {
              id: existingEntry.id,
            },
          });

          return {
            id: existingEntry.id,
          };
        }),
    }),
    payroll: createTRPCRouter({
      preview: baseProcedure
        .input(tenantPayrollInputSchema)
        .query(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const tenantProfile = await getTenantProfileForSession(authUser.id);

          return buildTenantPayrollPreview(tenantProfile.id, input);
        }),
      get: baseProcedure
        .input(
          z.object({
            id: z.string(),
          }),
        )
        .query(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          if (input.id === "create") return null;

          const tenantProfile = await getTenantProfileForSession(authUser.id);
          const payrollRun = await prisma.tenantPayrollRun.findFirst({
            where: {
              id: input.id,
              tenantProfileId: tenantProfile.id,
            },
            include: {
              items: {
                orderBy: {
                  employeeName: "asc",
                },
              },
            },
          });

          if (!payrollRun) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Payroll run not found.",
            });
          }

          return toTenantPayrollOutput(payrollRun);
        }),
      list: baseProcedure.query(async ({ ctx }) => {
        const authUser = ctx.session?.user;

        if (!authUser?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Sign in required.",
          });
        }

        const tenantProfile = await getTenantProfileForSession(authUser.id);
        const payrollRuns = await prisma.tenantPayrollRun.findMany({
          where: {
            tenantProfileId: tenantProfile.id,
          },
          include: {
            items: {
              orderBy: {
                employeeName: "asc",
              },
            },
          },
          orderBy: [
            {
              generatedAt: "desc",
            },
            {
              createdAt: "desc",
            },
          ],
        });

        return payrollRuns.map(toTenantPayrollOutput);
      }),
      save: baseProcedure
        .input(tenantPayrollInputSchema)
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const tenantProfile = await getTenantProfileForSession(authUser.id);
          const appUser = await prisma.appUser.findUnique({
            where: {
              authUserId: authUser.id,
            },
          });

          if (appUser?.role === "TENANT_STAFF") {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Only tenant admin can generate payroll.",
            });
          }

          const existingPayrollRun = input.id
            ? await prisma.tenantPayrollRun.findFirst({
                where: {
                  id: input.id,
                  tenantProfileId: tenantProfile.id,
                },
              })
            : null;

          if (input.id && !existingPayrollRun) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Payroll run not found.",
            });
          }

          const preview = await buildTenantPayrollPreview(tenantProfile.id, input);
          const code =
            existingPayrollRun?.code ??
            (await getNextTenantPayrollCode(
              tenantProfile.id,
              preview.periodStart,
            ));
          const generatedBy =
            appUser?.displayName || appUser?.email || authUser.email || "Admin";
          const options = {
            backupPayrollData: input.backupPayrollData,
            createJournalEntry: input.createJournalEntry,
            includeAllowance: input.includeAllowance,
            includeBasicSalary: input.includeBasicSalary,
            includeBonus: input.includeBonus,
            includeCommission: input.includeCommission,
            includeGovernmentContributions: input.includeGovernmentContributions,
            includeIncentives: input.includeIncentives,
            includeLeaveDeduction: input.includeLeaveDeduction,
            includeLeaveEncashment: input.includeLeaveEncashment,
            includeOtPay: input.includeOtPay,
            lockPayrollAfterGeneration: input.lockPayrollAfterGeneration,
            roundingOption: input.roundingOption,
            sendPayslipNotification: input.sendPayslipNotification,
          };

          const payrollRun = await prisma.$transaction(async (tx) => {
            const savedRun = existingPayrollRun
              ? await tx.tenantPayrollRun.update({
                  where: {
                    id: existingPayrollRun.id,
                  },
                  data: {
                    department:
                      input.department && input.department !== "all"
                        ? input.department
                        : null,
                    employerContributions: preview.totals.employerContributions,
                    employerCost: preview.totals.employerCost,
                    excludedEmployees: preview.totals.excludedEmployees,
                    frequency: toTenantPayrollFrequency(input.frequency),
                    generatedAt: new Date(),
                    generatedBy,
                    includedEmployees: preview.totals.includedEmployees,
                    name: input.name,
                    notes: input.notes,
                    options,
                    payDate: input.payDate,
                    payPeriod: preview.payPeriod,
                    payType: toTenantPayrollPayType(input.payType),
                    periodEnd: preview.periodEnd,
                    periodStart: preview.periodStart,
                    status: "COMPLETED",
                    totalAllowances: preview.totals.totalAllowances,
                    totalBasicSalary: preview.totals.totalBasicSalary,
                    totalBonus: preview.totals.totalBonus,
                    totalCommission: preview.totals.totalCommission,
                    totalDeductions: preview.totals.totalDeductions,
                    totalEmployees: preview.totals.totalEmployees,
                    totalGovernmentDeductions:
                      preview.totals.totalGovernmentDeductions,
                    totalGrossPay: preview.totals.totalEarnings,
                    totalIncentives: preview.totals.totalIncentives,
                    totalLeaveDeductions: preview.totals.totalLeaveDeductions,
                    totalNetPay: preview.totals.totalNetPay,
                    totalOtherDeductions: preview.totals.totalOtherDeductions,
                    totalOvertimePay: preview.totals.totalOvertimePay,
                    totalUndertimeDeductions:
                      preview.totals.totalUndertimeDeductions,
                  },
                })
              : await tx.tenantPayrollRun.create({
                  data: {
                    code,
                    department:
                      input.department && input.department !== "all"
                        ? input.department
                        : null,
                    employerContributions: preview.totals.employerContributions,
                    employerCost: preview.totals.employerCost,
                    excludedEmployees: preview.totals.excludedEmployees,
                    frequency: toTenantPayrollFrequency(input.frequency),
                    generatedAt: new Date(),
                    generatedBy,
                    includedEmployees: preview.totals.includedEmployees,
                    name: input.name,
                    notes: input.notes,
                    options,
                    payDate: input.payDate,
                    payPeriod: preview.payPeriod,
                    payType: toTenantPayrollPayType(input.payType),
                    periodEnd: preview.periodEnd,
                    periodStart: preview.periodStart,
                    status: "COMPLETED",
                    tenantProfileId: tenantProfile.id,
                    totalAllowances: preview.totals.totalAllowances,
                    totalBasicSalary: preview.totals.totalBasicSalary,
                    totalBonus: preview.totals.totalBonus,
                    totalCommission: preview.totals.totalCommission,
                    totalDeductions: preview.totals.totalDeductions,
                    totalEmployees: preview.totals.totalEmployees,
                    totalGovernmentDeductions:
                      preview.totals.totalGovernmentDeductions,
                    totalGrossPay: preview.totals.totalEarnings,
                    totalIncentives: preview.totals.totalIncentives,
                    totalLeaveDeductions: preview.totals.totalLeaveDeductions,
                    totalNetPay: preview.totals.totalNetPay,
                    totalOtherDeductions: preview.totals.totalOtherDeductions,
                    totalOvertimePay: preview.totals.totalOvertimePay,
                    totalUndertimeDeductions:
                      preview.totals.totalUndertimeDeductions,
                  },
                });

            await tx.tenantPayrollItem.deleteMany({
              where: {
                payrollRunId: savedRun.id,
              },
            });

            if (preview.employees.length > 0) {
              await tx.tenantPayrollItem.createMany({
                data: preview.employees.map((employee) => ({
                  absentCount: employee.absentCount,
                  allowance: employee.allowances,
                  basicSalary: employee.basicSalary,
                  bonus: employee.bonus,
                  commission: employee.commission,
                  daysWorked: employee.daysWorked,
                  departmentName: employee.department,
                  employeeCode: employee.employeeId,
                  employeeName: employee.name,
                  employmentType: employee.employmentType,
                  governmentDeductions: employee.governmentDeductions,
                  grossPay: employee.grossPay,
                  incentives: employee.incentives,
                  included: employee.included,
                  lateCount: employee.lateCount,
                  leaveDays: employee.leaveDays,
                  leaveDeduction: employee.leaveDeduction,
                  netPay: employee.netPay,
                  otherDeductions: employee.otherDeductions,
                  overtimeHours: employee.overtimeHours,
                  overtimePay: employee.overtimePay,
                  payrollRunId: savedRun.id,
                  regularHours: employee.regularHours,
                  roleName: employee.position,
                  staffProfileId: employee.staffProfileId,
                  tenantProfileId: tenantProfile.id,
                  totalDeductions: employee.totalDeductions,
                  undertimeDeduction: employee.undertimeDeduction,
                  undertimeHours: employee.undertimeHours,
                  workLocation: employee.location,
                })),
              });
            }

            return tx.tenantPayrollRun.findUniqueOrThrow({
              where: {
                id: savedRun.id,
              },
              include: {
                items: {
                  orderBy: {
                    employeeName: "asc",
                  },
                },
              },
            });
          });

          return toTenantPayrollOutput(payrollRun);
        }),
    }),
    usersRoles: createTRPCRouter({
      list: baseProcedure.query(async ({ ctx }) => {
        const authUser = ctx.session?.user;

        if (!authUser?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Sign in required.",
          });
        }

        const tenantProfile = await getTenantProfileForSession(authUser.id);
        const now = new Date();

        await prisma.tenantStaffInvitation.updateMany({
          where: {
            tenantProfileId: tenantProfile.id,
            status: "PENDING",
            expiresAt: {
              lte: now,
            },
          },
          data: {
            status: "EXPIRED",
          },
        });

        const staffProfiles = await prisma.tenantStaffProfile.findMany({
          where: {
            tenantProfileId: tenantProfile.id,
          },
          include: {
            appUser: true,
            department: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        });
        const invitations = await prisma.tenantStaffInvitation.findMany({
          where: {
            tenantProfileId: tenantProfile.id,
            status: "PENDING",
            expiresAt: {
              gt: now,
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        });

        return [
          ...staffProfiles.map(toTenantStaffOutput),
          ...invitations.map(toTenantStaffInvitationOutput),
        ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      }),
      get: baseProcedure
        .input(
          z.object({
            id: z.string(),
          }),
        )
        .query(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const tenantProfile = await getTenantProfileForSession(authUser.id);
          const staffProfile = await prisma.tenantStaffProfile.findFirst({
            where: {
              id: input.id,
              tenantProfileId: tenantProfile.id,
            },
            include: {
              appUser: true,
            },
          });

          if (!staffProfile) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Staff user not found.",
            });
          }

          return toTenantStaffOutput(staffProfile);
        }),
      save: baseProcedure
        .input(tenantStaffProfileSchema)
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const tenantProfile = await getTenantProfileForSession(authUser.id);
          const firstName = input.firstName ?? "";
          const lastName = input.lastName ?? "";
          const username = input.username?.toLowerCase() ?? null;
          const departmentId = input.departmentId || null;
          const status = toTenantStaffStatus(input.status);
          const payrollData = {
            employmentType: input.employmentType || "Regular",
            workLocation: input.workLocation || "Resort Office",
            basicSalary: input.basicSalary,
            allowance: input.allowance,
            incentives: input.incentives,
            commission: input.commission,
            bonus: input.bonus,
            leaveDeduction: input.leaveDeduction,
            sssContribution: input.sssContribution,
            philHealthContribution: input.philHealthContribution,
            pagIbigContribution: input.pagIbigContribution,
            withholdingTax: input.withholdingTax,
            otherDeductions: input.otherDeductions,
          };

          if (departmentId) {
            const department = await prisma.tenantDepartment.findFirst({
              where: {
                id: departmentId,
                tenantProfileId: tenantProfile.id,
              },
            });

            if (!department) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Department not found.",
              });
            }
          }

          if (input.id) {
            const existingStaff = await prisma.tenantStaffProfile.findFirst({
              where: {
                id: input.id,
                tenantProfileId: tenantProfile.id,
              },
            });

            if (!existingStaff) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Staff user not found.",
              });
            }

            const duplicateUsername = await prisma.tenantStaffProfile.findFirst({
              where: {
                username: username ?? undefined,
                id: {
                  not: input.id,
                },
              },
            });

            if (username && duplicateUsername) {
              throw new TRPCError({
                code: "CONFLICT",
                message: "Username already exists in this workspace.",
              });
            }

            const duplicateEmail = input.email
              ? await prisma.appUser.findFirst({
                  where: {
                    email: input.email.toLowerCase(),
                    authUserId: {
                      not: existingStaff.appUserId,
                    },
                  },
                })
              : null;

            if (duplicateEmail) {
              throw new TRPCError({
                code: "CONFLICT",
                message: "Email already belongs to another user.",
              });
            }

            const email = input.email?.toLowerCase() ?? makeInternalStaffEmail(existingStaff.appUserId);
            const displayName =
              `${firstName} ${lastName}`.trim() ||
              username ||
              input.email ||
              "Staff user";

            const staffProfile = await prisma.$transaction(async (tx) => {
              await tx.user.update({
                where: {
                  id: existingStaff.appUserId,
                },
                data: {
                  email,
                  name: displayName,
                },
              });
              await tx.appUser.update({
                where: {
                  authUserId: existingStaff.appUserId,
                },
                data: {
                  email,
                  firstName,
                  lastName,
                  displayName,
                  role: "TENANT_STAFF",
                },
              });

              if (input.password) {
                const hashedPassword = await hashPassword(input.password);

                await tx.account.upsert({
                  where: {
                    id: `${existingStaff.appUserId}:credential`,
                  },
                  create: {
                    id: `${existingStaff.appUserId}:credential`,
                    accountId: existingStaff.appUserId,
                    providerId: "credential",
                    userId: existingStaff.appUserId,
                    password: hashedPassword,
                  },
                  update: {
                    password: hashedPassword,
                  },
                });
              }

              return tx.tenantStaffProfile.update({
                where: {
                  id: input.id,
                },
                data: {
                  username,
                  phoneNumber: input.phoneNumber,
                  departmentId,
                  roleName: input.roleName,
                  status,
                  permissions: input.permissions,
                  ...payrollData,
                  notes: input.notes,
                  tags: input.tags,
                },
                include: {
                  appUser: true,
                  department: true,
                },
              });
            });

            return toTenantStaffOutput(staffProfile);
          }

          const authUserId = generateRandomString(32);
          const email = input.email?.toLowerCase() ?? makeInternalStaffEmail(authUserId);
          const displayName =
            `${firstName} ${lastName}`.trim() ||
            username ||
            input.email ||
            "Staff user";
          const [duplicateEmail, duplicateUsername] = await Promise.all([
            input.email
              ? prisma.appUser.findUnique({
                  where: {
                    email,
                  },
                })
              : null,
            username
              ? prisma.tenantStaffProfile.findFirst({
                  where: {
                    username,
                  },
                })
              : null,
          ]);

          if (duplicateEmail) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "Email already belongs to another user.",
            });
          }

          if (duplicateUsername) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "Username already exists in this workspace.",
            });
          }

          if (!input.password) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Password is required for new staff users.",
            });
          }

          const hashedPassword = await hashPassword(input.password);
          const staffProfile = await prisma.$transaction(async (tx) => {
            await tx.user.create({
              data: {
                id: authUserId,
                email,
                name: displayName,
                emailVerified: false,
              },
            });
            await tx.account.create({
              data: {
                id: `${authUserId}:credential`,
                accountId: authUserId,
                providerId: "credential",
                userId: authUserId,
                password: hashedPassword,
              },
            });
            await tx.appUser.create({
              data: {
                authUserId,
                email,
                firstName,
                lastName,
                displayName,
                role: "TENANT_STAFF",
              },
            });

            return tx.tenantStaffProfile.create({
              data: {
                tenantProfileId: tenantProfile.id,
                appUserId: authUserId,
                username,
                phoneNumber: input.phoneNumber,
                departmentId,
                roleName: input.roleName,
                status,
                permissions: input.permissions,
                ...payrollData,
                notes: input.notes,
                tags: input.tags,
              },
              include: {
                appUser: true,
                department: true,
              },
            });
          });

          return toTenantStaffOutput(staffProfile);
        }),
      suspend: baseProcedure
        .input(
          z.object({
            id: z.string(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const tenantProfile = await getTenantProfileForSession(authUser.id);
          const staffProfile = await prisma.tenantStaffProfile.findFirst({
            where: {
              id: input.id,
              tenantProfileId: tenantProfile.id,
            },
            include: {
              appUser: true,
              department: true,
            },
          });

          if (!staffProfile) {
            const invitation = await prisma.tenantStaffInvitation.findFirst({
              where: {
                id: input.id,
                tenantProfileId: tenantProfile.id,
                status: "PENDING",
              },
            });

            if (invitation) {
              await prisma.tenantStaffInvitation.update({
                where: {
                  id: invitation.id,
                },
                data: {
                  status: "REVOKED",
                },
              });

              return {
                id: input.id,
              };
            }

            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Staff user not found.",
            });
          }

          const suspendedStaff = await prisma.tenantStaffProfile.update({
            where: {
              id: input.id,
            },
            data: {
              status: "SUSPENDED",
            },
            include: {
              appUser: true,
              department: true,
            },
          });

          return toTenantStaffOutput(suspendedStaff);
        }),
      delete: baseProcedure
        .input(
          z.object({
            id: z.string(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const tenantProfile = await getTenantProfileForSession(authUser.id);
          const staffProfile = await prisma.tenantStaffProfile.findFirst({
            where: {
              id: input.id,
              tenantProfileId: tenantProfile.id,
            },
          });

          if (!staffProfile) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Staff user not found.",
            });
          }

          await prisma.user.delete({
            where: {
              id: staffProfile.appUserId,
            },
          });

          return {
            id: input.id,
          };
        }),
      invite: baseProcedure
        .input(tenantStaffInviteSchema)
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const tenantProfile = await getTenantProfileForSession(authUser.id);
          const appUrl =
            process.env.NEXT_PUBLIC_APP_URL ??
            process.env.BETTER_AUTH_URL ??
            "http://localhost:3000";
          const workspaceName =
            tenantProfile.resortName ??
            tenantProfile.businessName ??
            "ResortCloud workspace";
          const token = generateInviteToken();
          const invitation = await prisma.tenantStaffInvitation.create({
            data: {
              email: input.email,
              expiresAt: getInviteExpiresAt(),
              message: input.message,
              roleName: input.roleName,
              tenantProfileId: tenantProfile.id,
              tokenHash: hashInviteToken(token),
            },
          });

          try {
            await sendStaffInviteEmail({
              appUrl,
              email: input.email,
              message: input.message,
              role: input.roleName,
              token,
              workspaceName,
            });
          } catch (error) {
            await prisma.tenantStaffInvitation.delete({
              where: {
                id: invitation.id,
              },
            });

            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message:
                error instanceof Error
                  ? error.message
                  : "Unable to send invitation email.",
            });
          }

          return {
            invitationId: invitation.id,
            sent: true,
          };
        }),
    }),
    departments: createTRPCRouter({
      list: baseProcedure.query(async ({ ctx }) => {
        const authUser = ctx.session?.user;

        if (!authUser?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Sign in required.",
          });
        }

        const tenantProfile = await getTenantProfileForSession(authUser.id);
        const departments = await prisma.tenantDepartment.findMany({
          where: {
            tenantProfileId: tenantProfile.id,
          },
          include: {
            headStaffProfile: {
              include: {
                appUser: true,
              },
            },
            staffProfiles: {
              select: {
                id: true,
              },
            },
          },
          orderBy: {
            updatedAt: "desc",
          },
        });

        return departments.map(toTenantDepartmentOutput);
      }),
      get: baseProcedure
        .input(
          z.object({
            id: z.string(),
          }),
        )
        .query(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const tenantProfile = await getTenantProfileForSession(authUser.id);
          const department = await prisma.tenantDepartment.findFirst({
            where: {
              id: input.id,
              tenantProfileId: tenantProfile.id,
            },
            include: {
              headStaffProfile: {
                include: {
                  appUser: true,
                },
              },
              staffProfiles: {
                select: {
                  id: true,
                },
              },
            },
          });

          if (!department) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Department not found.",
            });
          }

          return toTenantDepartmentOutput(department);
        }),
      save: baseProcedure
        .input(tenantDepartmentSchema)
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const tenantProfile = await getTenantProfileForSession(authUser.id);
          const code = input.code.toUpperCase();
          const selectedStaffIds = Array.from(new Set(input.staffProfileIds));
          const headStaffProfileId =
            input.headStaffProfileId &&
            selectedStaffIds.includes(input.headStaffProfileId)
              ? input.headStaffProfileId
              : null;

          if (selectedStaffIds.length) {
            const staffCount = await prisma.tenantStaffProfile.count({
              where: {
                id: {
                  in: selectedStaffIds,
                },
                tenantProfileId: tenantProfile.id,
              },
            });

            if (staffCount !== selectedStaffIds.length) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: "One or more staff users are invalid.",
              });
            }
          }

          if (input.id) {
            const existingDepartment = await prisma.tenantDepartment.findFirst({
              where: {
                id: input.id,
                tenantProfileId: tenantProfile.id,
              },
            });

            if (!existingDepartment) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Department not found.",
              });
            }
          }

          const duplicateCode = await prisma.tenantDepartment.findFirst({
            where: {
              tenantProfileId: tenantProfile.id,
              code,
              id: input.id
                ? {
                    not: input.id,
                  }
                : undefined,
            },
          });

          if (duplicateCode) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "Department code already exists.",
            });
          }

          const department = await prisma.$transaction(async (tx) => {
            const savedDepartment = input.id
              ? await tx.tenantDepartment.update({
                  where: {
                    id: input.id,
                  },
                  data: {
                    name: input.name,
                    code,
                    description: input.description,
                    email: input.email,
                    notes: input.notes,
                    routing: input.routing,
                    status: toTenantDepartmentStatus(input.status),
                    headStaffProfileId: null,
                  },
                })
              : await tx.tenantDepartment.create({
                  data: {
                    tenantProfileId: tenantProfile.id,
                    name: input.name,
                    code,
                    description: input.description,
                    email: input.email,
                    notes: input.notes,
                    routing: input.routing,
                    status: toTenantDepartmentStatus(input.status),
                    headStaffProfileId: null,
                  },
                });

            if (selectedStaffIds.length) {
              await tx.tenantDepartment.updateMany({
                where: {
                  tenantProfileId: tenantProfile.id,
                  headStaffProfileId: {
                    in: selectedStaffIds,
                  },
                  id: {
                    not: savedDepartment.id,
                  },
                },
                data: {
                  headStaffProfileId: null,
                },
              });
            }

            if (headStaffProfileId) {
              await tx.tenantDepartment.updateMany({
                where: {
                  tenantProfileId: tenantProfile.id,
                  headStaffProfileId,
                  id: {
                    not: savedDepartment.id,
                  },
                },
                data: {
                  headStaffProfileId: null,
                },
              });

              await tx.tenantDepartment.update({
                where: {
                  id: savedDepartment.id,
                },
                data: {
                  headStaffProfileId,
                },
              });
            }

            await tx.tenantStaffProfile.updateMany({
              where: {
                tenantProfileId: tenantProfile.id,
                departmentId: savedDepartment.id,
                id: {
                  notIn: selectedStaffIds,
                },
              },
              data: {
                departmentId: null,
                isDepartmentHead: false,
              },
            });

            if (selectedStaffIds.length) {
              await tx.tenantStaffProfile.updateMany({
                where: {
                  tenantProfileId: tenantProfile.id,
                  id: {
                    in: selectedStaffIds,
                  },
                },
                data: {
                  departmentId: savedDepartment.id,
                  isDepartmentHead: false,
                },
              });
            }

            if (headStaffProfileId) {
              await tx.tenantStaffProfile.update({
                where: {
                  id: headStaffProfileId,
                },
                data: {
                  isDepartmentHead: true,
                },
              });
            }

            return tx.tenantDepartment.findUniqueOrThrow({
              where: {
                id: savedDepartment.id,
              },
              include: {
                headStaffProfile: {
                  include: {
                    appUser: true,
                  },
                },
                staffProfiles: {
                  select: {
                    id: true,
                  },
                },
              },
            });
          });

          return toTenantDepartmentOutput(department);
        }),
      updateStatus: baseProcedure
        .input(
          z.object({
            id: z.string(),
            status: tenantDepartmentStatusSchema,
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const tenantProfile = await getTenantProfileForSession(authUser.id);
          const department = await prisma.tenantDepartment.findFirst({
            where: {
              id: input.id,
              tenantProfileId: tenantProfile.id,
            },
          });

          if (!department) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Department not found.",
            });
          }

          await prisma.tenantDepartment.update({
            where: {
              id: input.id,
            },
            data: {
              status: toTenantDepartmentStatus(input.status),
            },
          });

          return {
            id: input.id,
          };
        }),
      delete: baseProcedure
        .input(
          z.object({
            id: z.string(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const tenantProfile = await getTenantProfileForSession(authUser.id);
          const department = await prisma.tenantDepartment.findFirst({
            where: {
              id: input.id,
              tenantProfileId: tenantProfile.id,
            },
          });

          if (!department) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Department not found.",
            });
          }

          await prisma.tenantDepartment.delete({
            where: {
              id: input.id,
            },
          });

          return {
            id: input.id,
          };
        }),
    }),
    rooms: createTRPCRouter({
      list: baseProcedure.query(async ({ ctx }) => {
        const authUser = ctx.session?.user;

        if (!authUser?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Sign in required.",
          });
        }

        const tenantProfile = await getTenantProfileForSession(authUser.id);
        const rooms = await prisma.tenantRoom.findMany({
          where: {
            tenantProfileId: tenantProfile.id,
          },
          include: {
            amenities: {
              select: {
                id: true,
                name: true,
              },
              orderBy: {
                sortOrder: "asc",
              },
            },
            photos: {
              orderBy: {
                sortOrder: "asc",
              },
            },
          },
          orderBy: {
            updatedAt: "desc",
          },
        });

        return rooms.map(toTenantRoomOutput);
      }),
      get: baseProcedure
        .input(
          z.object({
            id: z.string(),
          }),
        )
        .query(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const tenantProfile = await getTenantProfileForSession(authUser.id);
          const room = await prisma.tenantRoom.findFirst({
            where: {
              id: input.id,
              tenantProfileId: tenantProfile.id,
            },
            include: {
              amenities: {
                select: {
                  id: true,
                  name: true,
                },
                orderBy: {
                  sortOrder: "asc",
                },
              },
              photos: {
                orderBy: {
                  sortOrder: "asc",
                },
              },
            },
          });

          if (!room) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Room not found.",
            });
          }

          return toTenantRoomOutput(room);
        }),
      save: baseProcedure
        .input(tenantRoomSchema)
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const tenantProfile = await getTenantProfileForSession(authUser.id);
          const code = input.code.toUpperCase();
          const amenityIds = Array.from(new Set(input.amenityIds));

          if (amenityIds.length) {
            const amenityCount = await prisma.tenantAmenity.count({
              where: {
                id: {
                  in: amenityIds,
                },
                tenantProfileId: tenantProfile.id,
                status: "ACTIVE",
              },
            });

            if (amenityCount !== amenityIds.length) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: "One or more amenities are invalid.",
              });
            }
          }

          if (input.id) {
            const existingRoom = await prisma.tenantRoom.findFirst({
              where: {
                id: input.id,
                tenantProfileId: tenantProfile.id,
              },
            });

            if (!existingRoom) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Room not found.",
              });
            }
          }

          const duplicateCode = await prisma.tenantRoom.findFirst({
            where: {
              tenantProfileId: tenantProfile.id,
              code,
              id: input.id
                ? {
                    not: input.id,
                  }
                : undefined,
            },
          });

          if (duplicateCode) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "Room code already exists.",
            });
          }

          const data = {
            code,
            name: input.name,
            type: input.type,
            building: input.building,
            floor: input.floor,
            baseRate: input.baseRate,
            peakRate: input.peakRate ?? null,
            extraPersonCharge: input.extraPersonCharge ?? null,
            maxAdults: input.maxAdults,
            childrenOccupancy: input.childrenOccupancy,
            bedConfiguration: input.bedConfiguration,
            roomSize: input.roomSize ?? null,
            viewType: input.viewType,
            smokingPolicy: toTenantRoomSmokingPolicy(input.smokingPolicy),
            status: toTenantRoomStatus(input.status),
            checkIn: input.checkIn,
            checkOut: input.checkOut,
            minNights: input.minNights,
            guestNote: input.guestNote ?? null,
            notes: input.notes ?? null,
          };

          const room = await prisma.$transaction(async (tx) => {
            const savedRoom = input.id
              ? await tx.tenantRoom.update({
                  where: {
                    id: input.id,
                  },
                  data: {
                    ...data,
                    amenities: {
                      set: amenityIds.map((id) => ({ id })),
                    },
                  },
                })
              : await tx.tenantRoom.create({
                  data: {
                    ...data,
                    tenantProfileId: tenantProfile.id,
                    amenities: {
                      connect: amenityIds.map((id) => ({ id })),
                    },
                  },
                });

            await tx.tenantRoomPhoto.deleteMany({
              where: {
                roomId: savedRoom.id,
                key: {
                  notIn: input.photos.map((photo) => photo.key),
                },
              },
            });

            await Promise.all(
              input.photos.map((photo, index) =>
                tx.tenantRoomPhoto.upsert({
                  where: {
                    key: photo.key,
                  },
                  create: {
                    key: photo.key,
                    name: photo.name,
                    roomId: savedRoom.id,
                    size: photo.size,
                    sortOrder: index,
                    url: photo.url,
                  },
                  update: {
                    name: photo.name,
                    roomId: savedRoom.id,
                    size: photo.size,
                    sortOrder: index,
                    url: photo.url,
                  },
                }),
              ),
            );

            return tx.tenantRoom.findUniqueOrThrow({
              where: {
                id: savedRoom.id,
              },
              include: {
                amenities: {
                  select: {
                    id: true,
                    name: true,
                  },
                  orderBy: {
                    sortOrder: "asc",
                  },
                },
                photos: {
                  orderBy: {
                    sortOrder: "asc",
                  },
                },
              },
            });
          });

          return toTenantRoomOutput(room);
        }),
      updateStatus: baseProcedure
        .input(
          z.object({
            id: z.string(),
            status: tenantRoomStatusSchema,
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const tenantProfile = await getTenantProfileForSession(authUser.id);
          const room = await prisma.tenantRoom.findFirst({
            where: {
              id: input.id,
              tenantProfileId: tenantProfile.id,
            },
          });

          if (!room) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Room not found.",
            });
          }

          await prisma.tenantRoom.update({
            where: {
              id: input.id,
            },
            data: {
              status: toTenantRoomStatus(input.status),
            },
          });

          return {
            id: input.id,
          };
        }),
      delete: baseProcedure
        .input(
          z.object({
            id: z.string(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const tenantProfile = await getTenantProfileForSession(authUser.id);
          const room = await prisma.tenantRoom.findFirst({
            where: {
              id: input.id,
              tenantProfileId: tenantProfile.id,
            },
          });

          if (!room) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Room not found.",
            });
          }

          await prisma.tenantRoom.delete({
            where: {
              id: input.id,
            },
          });

          return {
            id: input.id,
          };
        }),
    }),
    invoices: createTRPCRouter({
      list: baseProcedure.query(async ({ ctx }) => {
        const authUser = ctx.session?.user;

        if (!authUser?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Sign in required.",
          });
        }

        const tenantProfile = await getTenantProfileForSession(authUser.id);
        const invoices = await prisma.tenantInvoice.findMany({
          where: {
            tenantProfileId: tenantProfile.id,
          },
          include: {
            lineItems: {
              orderBy: {
                sortOrder: "asc",
              },
            },
            reservation: {
              select: {
                id: true,
                room: {
                  select: {
                    code: true,
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: {
            updatedAt: "desc",
          },
        });

        return invoices.map(toTenantInvoiceOutput);
      }),
      nextCode: baseProcedure.query(async ({ ctx }) => {
        const authUser = ctx.session?.user;

        if (!authUser?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Sign in required.",
          });
        }

        const tenantProfile = await getTenantProfileForSession(authUser.id);
        return getNextInvoiceCode(tenantProfile);
      }),
      get: baseProcedure
        .input(
          z.object({
            id: z.string(),
          }),
        )
        .query(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const tenantProfile = await getTenantProfileForSession(authUser.id);
          const invoice = await prisma.tenantInvoice.findFirst({
            where: {
              id: input.id,
              tenantProfileId: tenantProfile.id,
            },
            include: {
              lineItems: {
                orderBy: {
                  sortOrder: "asc",
                },
              },
              reservation: {
                select: {
                  id: true,
                  room: {
                    select: {
                      code: true,
                      name: true,
                    },
                  },
                },
              },
            },
          });

          if (!invoice) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Invoice not found.",
            });
          }

          return toTenantInvoiceOutput(invoice);
        }),
      save: baseProcedure
        .input(tenantInvoiceSchema)
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const tenantProfile = await getTenantProfileForSession(authUser.id);
          const code = input.code.toUpperCase();

          if (input.reservationId) {
            const reservation = await prisma.tenantReservation.findFirst({
              where: {
                id: input.reservationId,
                tenantProfileId: tenantProfile.id,
              },
            });

            if (!reservation) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: "Reservation not found.",
              });
            }
          }

          if (input.id) {
            const existingInvoice = await prisma.tenantInvoice.findFirst({
              where: {
                id: input.id,
                tenantProfileId: tenantProfile.id,
              },
            });

            if (!existingInvoice) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Invoice not found.",
              });
            }
          }

          const duplicateCode = await prisma.tenantInvoice.findFirst({
            where: {
              tenantProfileId: tenantProfile.id,
              code,
              id: input.id
                ? {
                    not: input.id,
                  }
                : undefined,
            },
          });

          if (duplicateCode) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "Invoice number already exists.",
            });
          }

          const invoiceDate = parseDateField(input.invoiceDate, "Invoice date");
          const dueDate = parseDateField(input.dueDate, "Due date");
          const data = {
            balanceDue: input.balanceDue,
            code,
            depositPaid: input.depositPaid,
            discount: input.discount,
            dueDate,
            guestEmail: input.guestEmail ?? null,
            guestName: input.guestName,
            invoiceDate,
            notes: input.notes ?? null,
            paymentInstructions: input.paymentInstructions ?? null,
            paymentMethod: input.paymentMethod ?? null,
            reminderCadence: toTenantInvoiceReminderCadence(input.reminderCadence),
            reservationId: input.reservationId ?? null,
            status: toTenantInvoiceStatus(input.status),
            subtotal: input.subtotal,
            tax: input.tax,
            totalAmount: input.totalAmount,
          };
          const invoice = await prisma.$transaction(async (tx) => {
            const savedInvoice = input.id
              ? await tx.tenantInvoice.update({
                  where: {
                    id: input.id,
                  },
                  data,
                })
              : await tx.tenantInvoice.create({
                  data: {
                    ...data,
                    tenantProfileId: tenantProfile.id,
                  },
                });

            await tx.tenantInvoiceLineItem.deleteMany({
              where: {
                invoiceId: savedInvoice.id,
              },
            });
            await tx.tenantInvoiceLineItem.createMany({
              data: input.lineItems.map((item, index) => ({
                amount: item.amount,
                description: item.description,
                invoiceId: savedInvoice.id,
                quantity: item.quantity,
                rate: item.rate,
                sortOrder: index,
              })),
            });

            return tx.tenantInvoice.findUniqueOrThrow({
              where: {
                id: savedInvoice.id,
              },
              include: {
                lineItems: {
                  orderBy: {
                    sortOrder: "asc",
                  },
                },
                reservation: {
                  select: {
                    id: true,
                    room: {
                      select: {
                        code: true,
                        name: true,
                      },
                    },
                  },
                },
              },
            });
          });

          return toTenantInvoiceOutput(invoice);
        }),
      updateStatus: baseProcedure
        .input(
          z.object({
            id: z.string(),
            status: tenantInvoiceStatusSchema,
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const tenantProfile = await getTenantProfileForSession(authUser.id);
          const invoice = await prisma.tenantInvoice.findFirst({
            where: {
              id: input.id,
              tenantProfileId: tenantProfile.id,
            },
          });

          if (!invoice) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Invoice not found.",
            });
          }

          await prisma.tenantInvoice.update({
            where: {
              id: input.id,
            },
            data: {
              paidAt: input.status === "Paid" ? new Date() : undefined,
              sentAt: input.status === "Sent" ? new Date() : undefined,
              status: toTenantInvoiceStatus(input.status),
            },
          });

          return {
            id: input.id,
          };
        }),
      updateReminderCadence: baseProcedure
        .input(
          z.object({
            id: z.string(),
            reminderCadence: tenantInvoiceReminderCadenceSchema,
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const tenantProfile = await getTenantProfileForSession(authUser.id);
          const invoice = await prisma.tenantInvoice.findFirst({
            where: {
              id: input.id,
              tenantProfileId: tenantProfile.id,
            },
          });

          if (!invoice) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Invoice not found.",
            });
          }

          await prisma.tenantInvoice.update({
            where: {
              id: input.id,
            },
            data: {
              nextReminderAt: input.reminderCadence === "Paused" ? null : invoice.nextReminderAt,
              reminderCadence: toTenantInvoiceReminderCadence(input.reminderCadence),
            },
          });

          return {
            id: input.id,
          };
        }),
      sendReminder: baseProcedure
        .input(
          z.object({
            id: z.string(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const tenantProfile = await getTenantProfileForSession(authUser.id);
          const invoice = await prisma.tenantInvoice.findFirst({
            where: {
              id: input.id,
              tenantProfileId: tenantProfile.id,
            },
          });

          if (!invoice) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Invoice not found.",
            });
          }

          try {
            return await sendInvoiceReminderNow(input.id);
          } catch (error) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: error instanceof Error ? error.message : "Unable to send invoice reminder.",
            });
          }
        }),
      delete: baseProcedure
        .input(
          z.object({
            id: z.string(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const tenantProfile = await getTenantProfileForSession(authUser.id);
          const invoice = await prisma.tenantInvoice.findFirst({
            where: {
              id: input.id,
              tenantProfileId: tenantProfile.id,
            },
          });

          if (!invoice) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Invoice not found.",
            });
          }

          await prisma.tenantInvoice.delete({
            where: {
              id: input.id,
            },
          });

          return {
            id: input.id,
          };
        }),
    }),
    financeEntries: createTRPCRouter({
      list: baseProcedure.query(async ({ ctx }) => {
        const authUser = ctx.session?.user;

        if (!authUser?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Sign in required.",
          });
        }

        const tenantProfile = await getTenantProfileForSession(authUser.id);
        const entries = await prisma.tenantFinanceEntry.findMany({
          where: {
            tenantProfileId: tenantProfile.id,
          },
          orderBy: {
            entryDate: "desc",
          },
        });

        return entries.map(toTenantFinanceEntryOutput);
      }),
      get: baseProcedure
        .input(
          z.object({
            id: z.string(),
          }),
        )
        .query(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const tenantProfile = await getTenantProfileForSession(authUser.id);
          const entry = await prisma.tenantFinanceEntry.findFirst({
            where: {
              id: input.id,
              tenantProfileId: tenantProfile.id,
            },
          });

          if (!entry) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Finance entry not found.",
            });
          }

          return toTenantFinanceEntryOutput(entry);
        }),
      save: baseProcedure
        .input(tenantFinanceEntrySchema)
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const tenantProfile = await getTenantProfileForSession(authUser.id);
          const code = input.code?.trim()
            ? input.code.trim().toUpperCase()
            : await getNextFinanceEntryCode(tenantProfile.id, input.type);

          if (input.id) {
            const existingEntry = await prisma.tenantFinanceEntry.findFirst({
              where: {
                id: input.id,
                tenantProfileId: tenantProfile.id,
              },
            });

            if (!existingEntry) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Finance entry not found.",
              });
            }
          }

          const duplicateCode = await prisma.tenantFinanceEntry.findFirst({
            where: {
              tenantProfileId: tenantProfile.id,
              code,
              id: input.id
                ? {
                    not: input.id,
                  }
                : undefined,
            },
          });

          if (duplicateCode) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "Finance entry code already exists.",
            });
          }

          const data = {
            amount: input.amount,
            category: input.category,
            code,
            department: input.department ?? null,
            description: input.description,
            entryDate: parseDateField(input.entryDate, "Entry date"),
            notes: input.notes ?? null,
            receiptKey: input.receiptKey ?? null,
            receiptName: input.receiptName ?? null,
            receiptSize: input.receiptSize ?? null,
            receiptType: input.receiptType ?? null,
            receiptUrl: input.receiptUrl ?? null,
            source: toTenantFinanceEntrySource(input.source),
            status: toTenantFinanceEntryStatus(input.status),
            type: toTenantFinanceEntryType(input.type),
          };
          const entry = input.id
            ? await prisma.tenantFinanceEntry.update({
                where: {
                  id: input.id,
                },
                data,
              })
            : await prisma.tenantFinanceEntry.create({
                data: {
                  ...data,
                  tenantProfileId: tenantProfile.id,
                },
              });

          return toTenantFinanceEntryOutput(entry);
        }),
      updateStatus: baseProcedure
        .input(
          z.object({
            id: z.string(),
            status: tenantFinanceEntryStatusSchema,
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const tenantProfile = await getTenantProfileForSession(authUser.id);
          const entry = await prisma.tenantFinanceEntry.findFirst({
            where: {
              id: input.id,
              tenantProfileId: tenantProfile.id,
            },
          });

          if (!entry) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Finance entry not found.",
            });
          }

          await prisma.tenantFinanceEntry.update({
            where: {
              id: input.id,
            },
            data: {
              status: toTenantFinanceEntryStatus(input.status),
            },
          });

          return {
            id: input.id,
          };
        }),
      delete: baseProcedure
        .input(
          z.object({
            id: z.string(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const tenantProfile = await getTenantProfileForSession(authUser.id);
          const entry = await prisma.tenantFinanceEntry.findFirst({
            where: {
              id: input.id,
              tenantProfileId: tenantProfile.id,
            },
          });

          if (!entry) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Finance entry not found.",
            });
          }

          await prisma.tenantFinanceEntry.delete({
            where: {
              id: input.id,
            },
          });

          return {
            id: input.id,
          };
        }),
    }),
    transactionExports: createTRPCRouter({
      list: baseProcedure.query(async ({ ctx }) => {
        const authUser = ctx.session?.user;

        if (!authUser?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Sign in required.",
          });
        }

        const tenantProfile = await getTenantProfileForSession(authUser.id);
        const exportJobs = await prisma.tenantTransactionExport.findMany({
          where: {
            tenantProfileId: tenantProfile.id,
          },
          orderBy: {
            createdAt: "desc",
          },
        });

        return exportJobs.map(toTenantTransactionExportOutput);
      }),
      download: baseProcedure
        .input(
          z.object({
            id: z.string(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const tenantProfile = await getTenantProfileForSession(authUser.id);
          const exportJob = await prisma.tenantTransactionExport.findFirst({
            where: {
              id: input.id,
              tenantProfileId: tenantProfile.id,
            },
          });

          if (!exportJob) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Export job not found.",
            });
          }

          if (exportJob.status !== "READY") {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Export file is not ready.",
            });
          }

          return {
            code: exportJob.code,
            createdAt: exportJob.createdAt,
            format: exportJob.format,
            name: exportJob.name,
            payload: exportJob.payload ?? [],
            period: exportJob.period,
          };
        }),
      create: baseProcedure
        .input(tenantTransactionExportSchema)
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const tenantProfile = await getTenantProfileForSession(authUser.id);
          const payload = await buildTransactionExportPayload(tenantProfile.id, input.name);
          const payloadJson = JSON.stringify(payload);
          const code = await getNextTransactionExportCode(tenantProfile.id);
          const exportJob = await prisma.tenantTransactionExport.create({
            data: {
              code,
              format: input.format,
              name: input.name,
              payload,
              period: input.period ?? getDefaultExportPeriod(input.name),
              rowCount: payload.length,
              size: formatExportSize(Buffer.byteLength(payloadJson, "utf8")),
              status: "READY",
              tenantProfileId: tenantProfile.id,
            },
          });

          return toTenantTransactionExportOutput(exportJob);
        }),
      retry: baseProcedure
        .input(
          z.object({
            id: z.string(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const tenantProfile = await getTenantProfileForSession(authUser.id);
          const exportJob = await prisma.tenantTransactionExport.findFirst({
            where: {
              id: input.id,
              tenantProfileId: tenantProfile.id,
            },
          });

          if (!exportJob) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Export job not found.",
            });
          }

          const payload = await buildTransactionExportPayload(
            tenantProfile.id,
            exportJob.name as z.infer<typeof tenantTransactionExportNameSchema>,
          );
          const payloadJson = JSON.stringify(payload);
          const updatedExport = await prisma.tenantTransactionExport.update({
            where: {
              id: input.id,
            },
            data: {
              payload,
              rowCount: payload.length,
              size: formatExportSize(Buffer.byteLength(payloadJson, "utf8")),
              status: "READY",
            },
          });

          return toTenantTransactionExportOutput(updatedExport);
        }),
    }),
    services: createTRPCRouter({
      list: baseProcedure.query(async ({ ctx }) => {
        const authUser = ctx.session?.user;

        if (!authUser?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Sign in required.",
          });
        }

        const tenantProfile = await getTenantProfileForSession(authUser.id);
        const services = await prisma.tenantService.findMany({
          where: {
            tenantProfileId: tenantProfile.id,
          },
          orderBy: {
            updatedAt: "desc",
          },
        });

        return services.map(toTenantServiceOutput);
      }),
      get: baseProcedure
        .input(
          z.object({
            id: z.string(),
          }),
        )
        .query(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const tenantProfile = await getTenantProfileForSession(authUser.id);
          const service = await prisma.tenantService.findFirst({
            where: {
              id: input.id,
              tenantProfileId: tenantProfile.id,
            },
          });

          if (!service) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Service not found.",
            });
          }

          return toTenantServiceOutput(service);
        }),
      save: baseProcedure
        .input(tenantServiceSchema)
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const tenantProfile = await getTenantProfileForSession(authUser.id);
          const code = input.code.toUpperCase();

          if (input.id) {
            const existingService = await prisma.tenantService.findFirst({
              where: {
                id: input.id,
                tenantProfileId: tenantProfile.id,
              },
            });

            if (!existingService) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Service not found.",
              });
            }
          }

          const duplicateCode = await prisma.tenantService.findFirst({
            where: {
              tenantProfileId: tenantProfile.id,
              code,
              id: input.id
                ? {
                    not: input.id,
                  }
                : undefined,
            },
          });

          if (duplicateCode) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "Service code already exists.",
            });
          }

          const data = {
            baseCharge: input.baseCharge,
            billingType: toTenantServiceBillingType(input.billingType),
            bookingLeadTime: input.bookingLeadTime ?? null,
            category: input.category,
            code,
            description: input.description ?? null,
            duration: input.duration ?? null,
            feeNote: input.feeNote ?? null,
            internalNotes: input.internalNotes ?? null,
            provider: input.provider ?? null,
            showOnBookingPage: input.showOnBookingPage,
            status: toTenantServiceStatus(input.status),
            title: input.title,
          };
          const service = input.id
            ? await prisma.tenantService.update({
                where: {
                  id: input.id,
                },
                data,
              })
            : await prisma.tenantService.create({
                data: {
                  ...data,
                  tenantProfileId: tenantProfile.id,
                },
              });

          return toTenantServiceOutput(service);
        }),
      updateStatus: baseProcedure
        .input(
          z.object({
            id: z.string(),
            status: tenantServiceStatusSchema,
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const tenantProfile = await getTenantProfileForSession(authUser.id);
          const service = await prisma.tenantService.findFirst({
            where: {
              id: input.id,
              tenantProfileId: tenantProfile.id,
            },
          });

          if (!service) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Service not found.",
            });
          }

          await prisma.tenantService.update({
            where: {
              id: input.id,
            },
            data: {
              status: toTenantServiceStatus(input.status),
            },
          });

          return {
            id: input.id,
          };
        }),
      delete: baseProcedure
        .input(
          z.object({
            id: z.string(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const tenantProfile = await getTenantProfileForSession(authUser.id);
          const service = await prisma.tenantService.findFirst({
            where: {
              id: input.id,
              tenantProfileId: tenantProfile.id,
            },
          });

          if (!service) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Service not found.",
            });
          }

          await prisma.tenantService.delete({
            where: {
              id: input.id,
            },
          });

          return {
            id: input.id,
          };
        }),
    }),
    reservations: createTRPCRouter({
      list: baseProcedure.query(async ({ ctx }) => {
        const authUser = ctx.session?.user;

        if (!authUser?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Sign in required.",
          });
        }

        const tenantProfile = await getTenantProfileForSession(authUser.id);
        const reservations = await prisma.tenantReservation.findMany({
          where: {
            tenantProfileId: tenantProfile.id,
          },
          include: {
            room: {
              select: {
                code: true,
                name: true,
                type: true,
              },
            },
          },
          orderBy: {
            checkIn: "asc",
          },
        });

        return reservations.map(toTenantReservationOutput);
      }),
      create: baseProcedure
        .input(tenantReservationSchema)
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const tenantProfile = await getTenantProfileForSession(authUser.id);
          const room = await prisma.tenantRoom.findFirst({
            where: {
              id: input.roomId,
              tenantProfileId: tenantProfile.id,
            },
          });

          if (!room) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Room not found.",
            });
          }

          if (room.status === "OUT_OF_SERVICE") {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Room is out of service.",
            });
          }

          if (input.adults > room.maxAdults || input.children > room.childrenOccupancy) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Guest count exceeds room capacity.",
            });
          }

          const checkIn = parseReservationDate(input.checkIn, "Check-in");
          const checkOut = parseReservationDate(input.checkOut, "Check-out");
          const nights = getReservationNights(checkIn, checkOut);

          if (nights < room.minNights) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Minimum stay is ${room.minNights} night${room.minNights === 1 ? "" : "s"}.`,
            });
          }

          const overlappingReservation = await prisma.tenantReservation.findFirst({
            where: {
              tenantProfileId: tenantProfile.id,
              roomId: input.roomId,
              status: {
                notIn: ["CANCELED", "CHECKED_OUT"],
              },
              checkIn: {
                lt: checkOut,
              },
              checkOut: {
                gt: checkIn,
              },
            },
          });

          if (overlappingReservation) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "Room already has a booking for selected dates.",
            });
          }

          const appUrl =
            process.env.NEXT_PUBLIC_APP_URL ??
            process.env.BETTER_AUTH_URL ??
            "http://localhost:3000";
          const workspaceName =
            tenantProfile.resortName ??
            tenantProfile.businessName ??
            "ResortCloud workspace";
          const reservation = await prisma.tenantReservation.create({
            data: {
              tenantProfileId: tenantProfile.id,
              roomId: input.roomId,
              guestName: input.guestName,
              guestEmail: input.guestEmail ?? null,
              guestPhone: input.guestPhone ?? null,
              checkIn,
              checkOut,
              adults: input.adults,
              children: input.children,
              nights,
              rate: input.rate,
              deposit: input.deposit ?? null,
              totalAmount: input.totalAmount,
              paymentMethod: input.paymentMethod ?? null,
              status: toTenantReservationStatus(input.status),
              notes: input.notes ?? null,
            },
            include: {
              room: {
                select: {
                  code: true,
                  name: true,
                  type: true,
                },
              },
            },
          });

          if (input.status === "Checked in") {
            await prisma.tenantRoom.update({
              where: {
                id: input.roomId,
              },
              data: {
                status: "OCCUPIED",
              },
            });
          }

          await createInvoiceForReservation({
            tenantProfileId: tenantProfile.id,
            reservation,
          });

          let emailNotificationSent = false;
          let emailNotificationError = "";

          if (input.guestEmail) {
            try {
              await sendReservationConfirmationEmail({
                appUrl,
                checkIn,
                checkOut,
                deposit: input.deposit,
                email: input.guestEmail,
                guestName: input.guestName,
                nights,
                reservationId: reservation.id,
                roomName: reservation.room.name,
                roomType: reservation.room.type,
                totalAmount: input.totalAmount,
                workspaceName,
              });
              emailNotificationSent = true;
            } catch (error) {
              emailNotificationError =
                error instanceof Error
                  ? error.message
                  : "Confirmation email failed.";
              console.error("Booking confirmation email failed.", error);
            }
          }

          return {
            ...toTenantReservationOutput(reservation),
            emailNotificationError,
            emailNotificationSent,
          };
        }),
    }),
    reception: createTRPCRouter({
      list: baseProcedure.query(async ({ ctx }) => {
        const authUser = ctx.session?.user;

        if (!authUser?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Sign in required.",
          });
        }

        const tenantProfile = await getTenantProfileForSession(authUser.id);
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(todayStart);
        todayEnd.setDate(todayEnd.getDate() + 1);
        const upcomingEnd = new Date(todayStart);
        upcomingEnd.setDate(upcomingEnd.getDate() + 7);

        const [reservations, requests, shiftNotes] = await Promise.all([
          prisma.tenantReservation.findMany({
            where: {
              tenantProfileId: tenantProfile.id,
              status: {
                notIn: ["CANCELED", "CHECKED_OUT"],
              },
              OR: [
                {
                  status: "CHECKED_IN",
                },
                {
                  checkIn: {
                    gte: todayStart,
                    lt: upcomingEnd,
                  },
                  status: {
                    in: ["PENDING", "CONFIRMED"],
                  },
                },
              ],
            },
            include: {
              invoices: {
                orderBy: {
                  createdAt: "desc",
                },
                select: {
                  balanceDue: true,
                  status: true,
                },
              },
              room: {
                select: {
                  checkIn: true,
                  checkOut: true,
                  code: true,
                  name: true,
                  type: true,
                },
              },
            },
            orderBy: [
              {
                checkIn: "asc",
              },
              {
                updatedAt: "desc",
              },
            ],
          }),
          prisma.tenantReceptionRequest.findMany({
            where: {
              tenantProfileId: tenantProfile.id,
            },
            orderBy: {
              createdAt: "desc",
            },
            take: 8,
          }),
          prisma.tenantReceptionShiftNote.findMany({
            where: {
              tenantProfileId: tenantProfile.id,
            },
            orderBy: {
              createdAt: "desc",
            },
            take: 6,
          }),
        ]);

        const guests = reservations.map((reservation) =>
          toTenantReceptionGuestOutput(reservation, todayEnd),
        );

        return {
          guests,
          requests: requests.map(toTenantReceptionRequestOutput),
          shiftNotes: shiftNotes.map(toTenantReceptionShiftNoteOutput),
        };
      }),
      updateReservationStatus: baseProcedure
        .input(
          z.object({
            id: z.string(),
            status: tenantReceptionQueueStatusSchema,
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const tenantProfile = await getTenantProfileForSession(authUser.id);
          const reservation = await prisma.tenantReservation.findFirst({
            where: {
              id: input.id,
              tenantProfileId: tenantProfile.id,
            },
            include: {
              room: true,
            },
          });

          if (!reservation) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Reservation not found.",
            });
          }

          const status =
            input.status === "Completed"
              ? "CHECKED_OUT"
              : input.status === "Checking out"
                ? "CHECKED_IN"
                : "CHECKED_IN";
          const roomStatus = input.status === "Completed" ? "AVAILABLE" : "OCCUPIED";

          await prisma.$transaction([
            prisma.tenantReservation.update({
              where: {
                id: input.id,
              },
            data: {
                frontDeskStatus:
                  input.status === "Completed"
                    ? "COMPLETED"
                    : input.status === "Checking out"
                      ? "CHECKING_OUT"
                      : "IN_HOUSE",
                status,
              },
            }),
            prisma.tenantRoom.update({
              where: {
                id: reservation.roomId,
              },
              data: {
                status: roomStatus,
              },
            }),
          ]);

          return {
            id: input.id,
            status: fromTenantReservationStatus(status),
          };
        }),
      createRequest: baseProcedure
        .input(tenantReceptionRequestSchema)
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const tenantProfile = await getTenantProfileForSession(authUser.id);

          if (input.reservationId) {
            const reservation = await prisma.tenantReservation.findFirst({
              where: {
                id: input.reservationId,
                tenantProfileId: tenantProfile.id,
              },
            });

            if (!reservation) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Reservation not found.",
              });
            }
          }

          const request = await prisma.tenantReceptionRequest.create({
            data: {
              department: input.department,
              note: input.note,
              priority: toTenantReceptionRequestPriority(input.priority),
              reservationId: input.reservationId ?? null,
              roomOrArea: input.roomOrArea,
              status: "SENT",
              tenantProfileId: tenantProfile.id,
            },
          });

          if (input.department.toLowerCase().includes("maintenance")) {
            const maintenanceCount = await prisma.tenantMaintenanceRequest.count({
              where: {
                tenantProfileId: tenantProfile.id,
              },
            });

            await prisma.tenantMaintenanceRequest.create({
              data: {
                area: input.roomOrArea,
                code: `MNT-${String(maintenanceCount + 1).padStart(4, "0")}`,
                forwardedBy: "Reception",
                issue: input.note.slice(0, 120),
                notes: input.note,
                priority: toTenantMaintenancePriority(input.priority),
                tenantProfileId: tenantProfile.id,
              },
            });
          }

          return toTenantReceptionRequestOutput(request);
        }),
      createShiftNote: baseProcedure
        .input(tenantReceptionShiftNoteSchema)
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const tenantProfile = await getTenantProfileForSession(authUser.id);
          const note = await prisma.tenantReceptionShiftNote.create({
            data: {
              note: input.note,
              tenantProfileId: tenantProfile.id,
              title: input.title,
            },
          });

          return toTenantReceptionShiftNoteOutput(note);
        }),
      resolveRequest: baseProcedure
        .input(
          z.object({
            id: z.string(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const tenantProfile = await getTenantProfileForSession(authUser.id);
          const request = await prisma.tenantReceptionRequest.findFirst({
            where: {
              id: input.id,
              tenantProfileId: tenantProfile.id,
            },
          });

          if (!request) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Request not found.",
            });
          }

          await prisma.tenantReceptionRequest.update({
            where: {
              id: input.id,
            },
            data: {
              status: "RESOLVED",
            },
          });

          return {
            id: input.id,
          };
        }),
    }),
    maintenance: createTRPCRouter({
      list: baseProcedure.query(async ({ ctx }) => {
        const authUser = ctx.session?.user;

        if (!authUser?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Sign in required.",
          });
        }

        const tenantProfile = await getTenantProfileForSession(authUser.id);
        const requests = await prisma.tenantMaintenanceRequest.findMany({
          where: {
            tenantProfileId: tenantProfile.id,
          },
          orderBy: [
            {
              status: "desc",
            },
            {
              createdAt: "desc",
            },
          ],
        });

        return requests.map(toTenantMaintenanceRequestOutput);
      }),
      create: baseProcedure
        .input(tenantMaintenanceRequestSchema)
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const tenantProfile = await getTenantProfileForSession(authUser.id);
          const roomId = input.roomId?.trim() || null;

          if (roomId) {
            const room = await prisma.tenantRoom.findFirst({
              where: {
                id: roomId,
                tenantProfileId: tenantProfile.id,
              },
            });

            if (!room) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Room not found.",
              });
            }
          }

          const requestCount = await prisma.tenantMaintenanceRequest.count({
            where: {
              tenantProfileId: tenantProfile.id,
            },
          });
          const request = await prisma.tenantMaintenanceRequest.create({
            data: {
              area: input.area,
              code: `MNT-${String(requestCount + 1).padStart(4, "0")}`,
              forwardedBy: "Reception",
              issue: input.issue,
              notes: input.notes?.trim() || null,
              priority: toTenantMaintenancePriority(input.priority),
              roomId,
              tenantProfileId: tenantProfile.id,
            },
          });

          return toTenantMaintenanceRequestOutput(request);
        }),
      complete: baseProcedure
        .input(tenantMaintenanceCompleteSchema)
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const tenantProfile = await getTenantProfileForSession(authUser.id);
          const request = await prisma.tenantMaintenanceRequest.findFirst({
            where: {
              id: input.id,
              tenantProfileId: tenantProfile.id,
            },
          });

          if (!request) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Maintenance request not found.",
            });
          }

          const updatedRequest = await prisma.tenantMaintenanceRequest.update({
            where: {
              id: input.id,
            },
            data: {
              completedAt: new Date(),
              resolution: input.resolution,
              status: "COMPLETED",
            },
          });

          return toTenantMaintenanceRequestOutput(updatedRequest);
        }),
    }),
    laundry: createTRPCRouter({
      list: baseProcedure.query(async ({ ctx }) => {
        const authUser = ctx.session?.user;

        if (!authUser?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Sign in required.",
          });
        }

        const tenantProfile = await getTenantProfileForSession(authUser.id);
        const jobs = await prisma.tenantLaundryJob.findMany({
          where: {
            tenantProfileId: tenantProfile.id,
          },
          orderBy: [
            {
              status: "asc",
            },
            {
              receivedAt: "desc",
            },
          ],
        });

        return jobs.map(toTenantLaundryJobOutput);
      }),
      create: baseProcedure
        .input(tenantLaundryJobSchema)
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const tenantProfile = await getTenantProfileForSession(authUser.id);
          const jobCount = await prisma.tenantLaundryJob.count({
            where: {
              tenantProfileId: tenantProfile.id,
            },
          });
          const job = await prisma.tenantLaundryJob.create({
            data: {
              category: input.category,
              code: `LND-${String(jobCount + 1).padStart(4, "0")}`,
              dueTime: input.dueTime?.trim() || "Today",
              guestOrRoom: input.guestOrRoom,
              notes: input.notes?.trim() || null,
              pieces: input.pieces,
              priority: toTenantLaundryPriority(input.priority),
              tenantProfileId: tenantProfile.id,
            },
          });

          return toTenantLaundryJobOutput(job);
        }),
      updateStatus: baseProcedure
        .input(
          z.object({
            id: z.string().trim().min(1, "Laundry job is required."),
            status: tenantLaundryStatusSchema,
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const tenantProfile = await getTenantProfileForSession(authUser.id);
          const existingJob = await prisma.tenantLaundryJob.findFirst({
            where: {
              id: input.id,
              tenantProfileId: tenantProfile.id,
            },
          });

          if (!existingJob) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Laundry job not found.",
            });
          }

          const job = await prisma.tenantLaundryJob.update({
            where: {
              id: input.id,
            },
            data: {
              status: toTenantLaundryStatus(input.status),
            },
          });

          return toTenantLaundryJobOutput(job);
        }),
    }),
    inventory: createTRPCRouter({
      list: baseProcedure.query(async ({ ctx }) => {
        const authUser = ctx.session?.user;

        if (!authUser?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Sign in required.",
          });
        }

        const tenantProfile = await getTenantProfileForSession(authUser.id);
        const [items, movements] = await Promise.all([
          prisma.tenantInventoryItem.findMany({
            where: {
              tenantProfileId: tenantProfile.id,
            },
            include: {
              movements: {
                orderBy: {
                  createdAt: "desc",
                },
                take: 1,
              },
            },
            orderBy: {
              createdAt: "desc",
            },
          }),
          prisma.tenantInventoryMovement.findMany({
            where: {
              tenantProfileId: tenantProfile.id,
            },
            include: {
              item: {
                select: {
                  name: true,
                },
              },
            },
            orderBy: {
              createdAt: "desc",
            },
            take: 8,
          }),
        ]);

        return {
          items: items.map(toTenantInventoryItemOutput),
          movements: movements.map(toTenantInventoryMovementOutput),
        };
      }),
      byId: baseProcedure
        .input(
          z.object({
            id: z.string().trim().min(1),
          }),
        )
        .query(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const tenantProfile = await getTenantProfileForSession(authUser.id);
          const item = await prisma.tenantInventoryItem.findFirst({
            where: {
              OR: [
                {
                  id: input.id,
                },
                {
                  code: input.id,
                },
              ],
              tenantProfileId: tenantProfile.id,
            },
            include: {
              movements: {
                orderBy: {
                  createdAt: "desc",
                },
                take: 1,
              },
            },
          });

          if (!item) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Inventory item not found.",
            });
          }

          return toTenantInventoryItemOutput(item);
        }),
      upsert: baseProcedure
        .input(tenantInventoryItemSchema)
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const tenantProfile = await getTenantProfileForSession(authUser.id);
          const existingItem = input.id
            ? await prisma.tenantInventoryItem.findFirst({
                where: {
                  id: input.id,
                  tenantProfileId: tenantProfile.id,
                },
              })
            : null;

          if (input.id && !existingItem) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Inventory item not found.",
            });
          }

          const duplicate = await prisma.tenantInventoryItem.findFirst({
            where: {
              code: input.code,
              tenantProfileId: tenantProfile.id,
              ...(input.id
                ? {
                    id: {
                      not: input.id,
                    },
                  }
                : {}),
            },
          });

          if (duplicate) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "Item code already exists.",
            });
          }

          const item = input.id
            ? await prisma.tenantInventoryItem.update({
                where: {
                  id: input.id,
                },
                data: {
                  category: input.category,
                  code: input.code,
                  dashboardAlert: input.dashboardAlert,
                  description: input.description?.trim() || null,
                  name: input.name,
                  notes: input.notes?.trim() || null,
                  quantity: input.quantity,
                  threshold: input.threshold,
                  unit: input.unit,
                },
                include: {
                  movements: {
                    orderBy: {
                      createdAt: "desc",
                    },
                    take: 1,
                  },
                },
              })
            : await prisma.tenantInventoryItem.create({
                data: {
                  category: input.category,
                  code: input.code,
                  dashboardAlert: input.dashboardAlert,
                  description: input.description?.trim() || null,
                  name: input.name,
                  notes: input.notes?.trim() || null,
                  quantity: input.quantity,
                  tenantProfileId: tenantProfile.id,
                  threshold: input.threshold,
                  unit: input.unit,
                },
                include: {
                  movements: {
                    orderBy: {
                      createdAt: "desc",
                    },
                    take: 1,
                  },
                },
              });

          return toTenantInventoryItemOutput(item);
        }),
      delete: baseProcedure
        .input(
          z.object({
            id: z.string().trim().min(1),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const tenantProfile = await getTenantProfileForSession(authUser.id);
          const item = await prisma.tenantInventoryItem.findFirst({
            where: {
              id: input.id,
              tenantProfileId: tenantProfile.id,
            },
          });

          if (!item) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Inventory item not found.",
            });
          }

          await prisma.tenantInventoryItem.delete({
            where: {
              id: input.id,
            },
          });

          return {
            id: input.id,
          };
        }),
      createMovement: baseProcedure
        .input(tenantInventoryMovementSchema)
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const tenantProfile = await getTenantProfileForSession(authUser.id);
          const item = await prisma.tenantInventoryItem.findFirst({
            where: {
              id: input.itemId,
              tenantProfileId: tenantProfile.id,
            },
          });

          if (!item) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Inventory item not found.",
            });
          }

          const nextQuantity =
            input.type === "IN"
              ? item.quantity + input.quantity
              : Math.max(0, item.quantity - input.quantity);
          const movementCount = await prisma.tenantInventoryMovement.count({
            where: {
              tenantProfileId: tenantProfile.id,
            },
          });

          const movement = await prisma.$transaction(async (tx) => {
            await tx.tenantInventoryItem.update({
              where: {
                id: item.id,
              },
              data: {
                quantity: nextQuantity,
              },
            });

            return tx.tenantInventoryMovement.create({
              data: {
                code: `MOV-${String(movementCount + 1).padStart(4, "0")}`,
                itemId: item.id,
                quantity: input.quantity,
                reason: input.reason,
                tenantProfileId: tenantProfile.id,
                type: input.type,
              },
              include: {
                item: {
                  select: {
                    name: true,
                  },
                },
              },
            });
          });

          return toTenantInventoryMovementOutput(movement);
        }),
    }),
    housekeeping: createTRPCRouter({
      list: baseProcedure
        .input(
          z
            .object({
              date: z.string().optional(),
            })
            .optional(),
        )
        .query(async ({ ctx, input }) => {
        const authUser = ctx.session?.user;

        if (!authUser?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Sign in required.",
          });
        }

        const tenantProfile = await getTenantProfileForSession(authUser.id);
        const selectedDate = input?.date ? new Date(input.date) : new Date();
        const dayStart =
          Number.isNaN(selectedDate.getTime()) ? new Date() : selectedDate;
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);
        const upcomingEnd = new Date(dayStart);
        upcomingEnd.setDate(upcomingEnd.getDate() + 7);

        const [rooms, staffProfiles, damageReports] = await Promise.all([
          prisma.tenantRoom.findMany({
            where: {
              tenantProfileId: tenantProfile.id,
            },
            include: {
              housekeepingState: {
                include: {
                  attendantStaffProfile: {
                    include: {
                      appUser: true,
                    },
                  },
                },
              },
              reservations: {
                where: {
                  status: {
                    in: ["PENDING", "CONFIRMED", "CHECKED_IN"],
                  },
                  OR: [
                    {
                      status: "CHECKED_IN",
                      checkIn: {
                        lte: dayEnd,
                      },
                      checkOut: {
                        gte: dayStart,
                      },
                    },
                    {
                      checkIn: {
                        gte: dayStart,
                        lt: upcomingEnd,
                      },
                    },
                  ],
                },
                orderBy: {
                  checkIn: "asc",
                },
                take: 1,
              },
            },
            orderBy: [
              {
                code: "asc",
              },
              {
                name: "asc",
              },
            ],
          }),
          prisma.tenantStaffProfile.findMany({
            where: {
              tenantProfileId: tenantProfile.id,
              status: "ACTIVE",
            },
            include: {
              appUser: true,
            },
            orderBy: {
              createdAt: "desc",
            },
          }),
          prisma.tenantHousekeepingDamageReport.findMany({
            where: {
              createdAt: {
                gte: dayStart,
                lt: dayEnd,
              },
              tenantProfileId: tenantProfile.id,
            },
            include: {
              room: {
                select: {
                  code: true,
                  name: true,
                },
              },
            },
            orderBy: {
              createdAt: "desc",
            },
            take: 8,
          }),
        ]);

        return {
          damageReports: damageReports.map(toTenantHousekeepingDamageOutput),
          rooms: rooms.map(toTenantHousekeepingRoomOutput),
          staff: staffProfiles.map((staffProfile) => ({
            id: staffProfile.id,
            name: staffProfile.appUser.displayName,
          })),
        };
      }),
      updateRoomStatus: baseProcedure
        .input(
          z.object({
            roomId: z.string().trim().min(1, "Room is required."),
            status: tenantHousekeepingStatusSchema,
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const tenantProfile = await getTenantProfileForSession(authUser.id);
          const room = await prisma.tenantRoom.findFirst({
            where: {
              id: input.roomId,
              tenantProfileId: tenantProfile.id,
            },
          });

          if (!room) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Room not found.",
            });
          }

          await prisma.$transaction([
            prisma.tenantHousekeepingRoom.upsert({
              where: {
                roomId: input.roomId,
              },
              create: {
                roomId: input.roomId,
                status: toTenantHousekeepingStatus(input.status),
                tenantProfileId: tenantProfile.id,
              },
              update: {
                status: toTenantHousekeepingStatus(input.status),
              },
            }),
            prisma.tenantRoom.update({
              where: {
                id: input.roomId,
              },
              data: {
                status: getRoomStatusFromHousekeepingStatus(input.status),
              },
            }),
          ]);

          return {
            id: input.roomId,
            status: input.status,
          };
        }),
      markReady: baseProcedure
        .input(tenantHousekeepingReadySchema)
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const tenantProfile = await getTenantProfileForSession(authUser.id);
          const room = await prisma.tenantRoom.findFirst({
            where: {
              id: input.roomId,
              tenantProfileId: tenantProfile.id,
            },
          });

          if (!room) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Room not found.",
            });
          }

          const attendantStaffProfileId =
            input.attendantStaffProfileId &&
            input.attendantStaffProfileId !== "none"
              ? input.attendantStaffProfileId
              : null;

          if (attendantStaffProfileId) {
            const staffProfile = await prisma.tenantStaffProfile.findFirst({
              where: {
                id: attendantStaffProfileId,
                tenantProfileId: tenantProfile.id,
              },
            });

            if (!staffProfile) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Staff not found.",
              });
            }
          }

          await prisma.$transaction([
            prisma.tenantHousekeepingRoom.upsert({
              where: {
                roomId: input.roomId,
              },
              create: {
                attendantStaffProfileId,
                lastPhotoAt: new Date(),
                lastPhotoKey: input.photo?.key ?? null,
                lastPhotoName: input.photo?.name ?? null,
                lastPhotoNote: input.photoNote?.trim() || null,
                lastPhotoSize: input.photo?.size ?? null,
                lastPhotoUrl: input.photo?.url ?? null,
                roomId: input.roomId,
                status: "CLEAN",
                tenantProfileId: tenantProfile.id,
              },
              update: {
                attendantStaffProfileId,
                lastPhotoAt: new Date(),
                lastPhotoKey: input.photo?.key ?? null,
                lastPhotoName: input.photo?.name ?? null,
                lastPhotoNote: input.photoNote?.trim() || null,
                lastPhotoSize: input.photo?.size ?? null,
                lastPhotoUrl: input.photo?.url ?? null,
                status: "CLEAN",
              },
            }),
            prisma.tenantRoom.update({
              where: {
                id: input.roomId,
              },
              data: {
                status: "AVAILABLE",
              },
            }),
          ]);

          return {
            id: input.roomId,
          };
        }),
      reportDamage: baseProcedure
        .input(tenantHousekeepingDamageSchema)
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const tenantProfile = await getTenantProfileForSession(authUser.id);
          const room = await prisma.tenantRoom.findFirst({
            where: {
              id: input.roomId,
              tenantProfileId: tenantProfile.id,
            },
          });

          if (!room) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Room not found.",
            });
          }

          const maintenanceCount = await prisma.tenantMaintenanceRequest.count({
            where: {
              tenantProfileId: tenantProfile.id,
            },
          });
          const maintenanceNotes = [
            input.details,
            input.photoNote?.trim()
              ? `Photo note: ${input.photoNote.trim()}`
              : null,
          ]
            .filter(Boolean)
            .join("\n\n");

          const [report] = await prisma.$transaction([
            prisma.tenantHousekeepingDamageReport.create({
              data: {
                details: input.details,
                photoKey: input.photo?.key ?? null,
                photoName: input.photo?.name ?? null,
                photoNote: input.photoNote?.trim() || null,
                photoSize: input.photo?.size ?? null,
                photoUrl: input.photo?.url ?? null,
                roomId: input.roomId,
                tenantProfileId: tenantProfile.id,
                title: input.title,
              },
              include: {
                room: {
                  select: {
                    code: true,
                    name: true,
                  },
                },
              },
            }),
            prisma.tenantHousekeepingRoom.upsert({
              where: {
                roomId: input.roomId,
              },
              create: {
                roomId: input.roomId,
                status: "DIRTY",
                tenantProfileId: tenantProfile.id,
              },
              update: {
                status: "DIRTY",
              },
            }),
            prisma.tenantRoom.update({
              where: {
                id: input.roomId,
              },
              data: {
                status: "MAINTENANCE",
              },
            }),
            prisma.tenantMaintenanceRequest.create({
              data: {
                area: `${room.code} - ${room.name}`,
                code: `MNT-${String(maintenanceCount + 1).padStart(4, "0")}`,
                forwardedBy: "Housekeeping",
                issue: input.title,
                notes: maintenanceNotes,
                priority: "URGENT",
                roomId: input.roomId,
                tenantProfileId: tenantProfile.id,
              },
            }),
          ]);

          return toTenantHousekeepingDamageOutput(report);
        }),
      resolveDamage: baseProcedure
        .input(
          z.object({
            id: z.string().trim().min(1, "Report is required."),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const tenantProfile = await getTenantProfileForSession(authUser.id);
          const report = await prisma.tenantHousekeepingDamageReport.findFirst({
            where: {
              id: input.id,
              tenantProfileId: tenantProfile.id,
            },
          });

          if (!report) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Damage report not found.",
            });
          }

          await prisma.tenantHousekeepingDamageReport.update({
            where: {
              id: input.id,
            },
            data: {
              status: "RESOLVED",
            },
          });

          return {
            id: input.id,
          };
        }),
    }),
    leads: createTRPCRouter({
      integration: baseProcedure.query(async ({ ctx }) => {
        const authUser = ctx.session?.user;

        if (!authUser?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Sign in required.",
          });
        }

        const tenantProfile = await getTenantProfileForSession(authUser.id);
        const configuredPageId = process.env.META_PAGE_ID ?? "";
        const integration = configuredPageId
          ? await prisma.tenantMessengerIntegration.findUnique({
              where: {
                pageId: configuredPageId,
              },
            })
          : null;

        return {
          connected: Boolean(
            integration?.tenantProfileId === tenantProfile.id &&
              integration.isActive,
          ),
          integration: integration
            ? {
                id: integration.id,
                isActive: integration.isActive,
                pageId: integration.pageId,
                pageName: integration.pageName ?? "Alrio Private Resort",
                subscribedFields: integration.subscribedFields,
              }
            : null,
          pageCandidate: configuredPageId
            ? {
                pageId: configuredPageId,
                pageName: integration?.pageName ?? "Alrio Private Resort",
                webhookUrl: process.env.META_MESSENGER_WEBHOOK_URL ?? "",
              }
            : null,
        };
      }),
      diagnostics: baseProcedure.query(async ({ ctx }) => {
        const authUser = ctx.session?.user;

        if (!authUser?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Sign in required.",
          });
        }

        const tenantProfile = await getTenantProfileForSession(authUser.id);
        const pageId = process.env.META_PAGE_ID ?? "";
        const pageAccessToken = process.env.META_PAGE_ACCESS_TOKEN ?? "";
        const graphVersion = process.env.META_GRAPH_API_VERSION ?? "v25.0";
        const webhookUrl = process.env.META_MESSENGER_WEBHOOK_URL ?? "";
        const issues: string[] = [];
        const warnings: string[] = [];
        const checks: string[] = [];

        if (!pageId) issues.push("META_PAGE_ID missing.");
        else checks.push(`Configured Page ID: ${pageId}.`);

        if (!pageAccessToken) issues.push("META_PAGE_ACCESS_TOKEN missing.");
        else checks.push("Page access token configured.");

        if (!process.env.META_VERIFY_TOKEN) {
          issues.push("META_VERIFY_TOKEN missing.");
        }

        if (!process.env.META_APP_SECRET) {
          issues.push("META_APP_SECRET missing. Webhook signature check may fail in production.");
        }

        if (!webhookUrl) {
          issues.push("META_MESSENGER_WEBHOOK_URL missing.");
        } else if (!webhookUrl.includes("/api/webhooks/meta/messenger")) {
          issues.push("Webhook URL must end with /api/webhooks/meta/messenger.");
        } else {
          checks.push(`Webhook URL: ${webhookUrl}.`);
        }

        const integration = pageId
          ? await prisma.tenantMessengerIntegration.findUnique({
              where: {
                pageId,
              },
            })
          : null;

        if (!integration) {
          issues.push("Messenger page not connected in ResortCloud. Click Connect Messenger.");
        } else if (integration.tenantProfileId !== tenantProfile.id) {
          issues.push("Messenger page is connected to another tenant workspace.");
        } else if (!integration.isActive) {
          issues.push("Messenger integration exists but is inactive.");
        } else {
          checks.push("Messenger integration active in ResortCloud.");
        }

        const leadCount = await prisma.tenantLead.count({
          where: {
            tenantProfileId: tenantProfile.id,
          },
        });

        if (pageId && pageAccessToken) {
          type MetaPageProbeBody = {
            error?: { message?: string };
            id?: string;
            name?: string;
          };
          type MetaSubscriptionProbeBody = {
            data?: Array<{ subscribed_fields?: string[] }>;
            error?: { message?: string };
          };

          const pageProbe: { body: MetaPageProbeBody; ok: boolean } = await fetch(
            `https://graph.facebook.com/${graphVersion}/me?fields=id,name&access_token=${encodeURIComponent(pageAccessToken)}`,
            {
              cache: "no-store",
            },
          )
            .then(async (response) => ({
              ok: response.ok,
              body: (await response.json()) as {
                error?: { message?: string };
                id?: string;
                name?: string;
              },
            }))
            .catch((error: unknown) => ({
              ok: false,
              body: {
                error: {
                  message:
                    error instanceof Error
                      ? error.message
                      : "Cannot reach Meta Graph API.",
                },
              },
            }));

          if (!pageProbe.ok) {
            const message =
              pageProbe.body.error?.message ?? "Unknown Meta error.";

            if (
              message.includes("pages_read_engagement") ||
              message.includes("Page Public Content Access") ||
              message.includes("Page Public Metadata Access")
            ) {
              warnings.push(
                "Meta Page token read check blocked by extra Page read permission. Messenger webhook can still work if the Page is subscribed to messages and the token is a valid Page token.",
              );
            } else {
              issues.push(`Meta Page token check failed: ${message}`);
            }
          } else {
            checks.push(`Meta token belongs to: ${pageProbe.body.name ?? "Unknown Page"}.`);

            if (pageProbe.body.id && pageProbe.body.id !== pageId) {
              issues.push(
                `META_PAGE_ID mismatch. Token page is ${pageProbe.body.id}, env page is ${pageId}.`,
              );
            }
          }

          const subscriptionProbe: {
            body: MetaSubscriptionProbeBody;
            ok: boolean;
          } = await fetch(
            `https://graph.facebook.com/${graphVersion}/${pageId}/subscribed_apps?access_token=${encodeURIComponent(pageAccessToken)}`,
            {
              cache: "no-store",
            },
          )
            .then(async (response) => ({
              ok: response.ok,
              body: (await response.json()) as {
                data?: Array<{ subscribed_fields?: string[] }>;
                error?: { message?: string };
              },
            }))
            .catch((error: unknown) => ({
              ok: false,
              body: {
                error: {
                  message:
                    error instanceof Error
                      ? error.message
                      : "Cannot check Page subscriptions.",
                },
              },
            }));

          if (!subscriptionProbe.ok) {
            warnings.push(
              `Meta subscription read check failed: ${subscriptionProbe.body.error?.message ?? "Unknown Meta error."}`,
            );
          } else {
            const subscribedFields =
              subscriptionProbe.body.data?.flatMap(
                (item) => item.subscribed_fields ?? [],
              ) ?? [];
            const requiredFields = ["messages", "messaging_postbacks"];
            const missingFields = requiredFields.filter(
              (field) => !subscribedFields.includes(field),
            );

            if (missingFields.length > 0) {
              warnings.push(
                `Meta API did not report subscribed fields: ${missingFields.join(", ")}. If Messenger API Settings shows them as Subscribed, use Meta test webhook or send a real message to confirm.`,
              );
            } else {
              checks.push("Meta webhook subscribed to Messenger message fields.");
            }
          }
        }

        return {
          checks,
          healthy: issues.length === 0,
          issues,
          leadCount,
          warnings,
        };
      }),
      connectMessenger: baseProcedure.mutation(async ({ ctx }) => {
        const authUser = ctx.session?.user;

        if (!authUser?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Sign in required.",
          });
        }

        const pageId = process.env.META_PAGE_ID;

        if (!pageId) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "META_PAGE_ID is required.",
          });
        }

        const tenantProfile = await getTenantProfileForSession(authUser.id);
        const integration = await prisma.tenantMessengerIntegration.upsert({
          where: {
            pageId,
          },
          create: {
            pageAccessToken: process.env.META_PAGE_ACCESS_TOKEN,
            pageId,
            pageName: "Alrio Private Resort",
            subscribedFields: [
              "messages",
              "messaging_postbacks",
              "messaging_referrals",
            ],
            tenantProfileId: tenantProfile.id,
            verifyToken: process.env.META_VERIFY_TOKEN,
          },
          update: {
            isActive: true,
            pageAccessToken: process.env.META_PAGE_ACCESS_TOKEN,
            pageName: "Alrio Private Resort",
            subscribedFields: [
              "messages",
              "messaging_postbacks",
              "messaging_referrals",
            ],
            tenantProfileId: tenantProfile.id,
            verifyToken: process.env.META_VERIFY_TOKEN,
          },
        });

        return {
          id: integration.id,
          pageId: integration.pageId,
          pageName: integration.pageName ?? "Alrio Private Resort",
        };
      }),
      syncMessengerInbox: baseProcedure.mutation(async ({ ctx }) => {
        const authUser = ctx.session?.user;

        if (!authUser?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Sign in required.",
          });
        }

        const tenantProfile = await getTenantProfileForSession(authUser.id);
        const pageId = process.env.META_PAGE_ID;
        const pageAccessToken = process.env.META_PAGE_ACCESS_TOKEN;
        const graphVersion = process.env.META_GRAPH_API_VERSION ?? "v25.0";

        if (!pageId || !pageAccessToken) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "META_PAGE_ID and META_PAGE_ACCESS_TOKEN are required.",
          });
        }

        const integration = await prisma.tenantMessengerIntegration.upsert({
          where: {
            pageId,
          },
          create: {
            pageAccessToken,
            pageId,
            pageName: "Alrio Private Resort",
            subscribedFields: [
              "messages",
              "messaging_postbacks",
              "messaging_referrals",
            ],
            tenantProfileId: tenantProfile.id,
            verifyToken: process.env.META_VERIFY_TOKEN,
          },
          update: {
            isActive: true,
            pageAccessToken,
            subscribedFields: [
              "messages",
              "messaging_postbacks",
              "messaging_referrals",
            ],
            tenantProfileId: tenantProfile.id,
            verifyToken: process.env.META_VERIFY_TOKEN,
          },
        });

        type MetaConversation = {
          id: string;
          messages?: {
            data?: Array<{
              attachments?: unknown;
              created_time?: string;
              from?: { id?: string; name?: string };
              id: string;
              message?: string;
              to?: { data?: Array<{ id?: string; name?: string }> };
            }>;
          };
          participants?: {
            data?: Array<{ id?: string; name?: string }>;
          };
          updated_time?: string;
        };
        type MetaConversationResponse = {
          data?: MetaConversation[];
          error?: { message?: string };
        };

        const fields = [
          "id",
          "updated_time",
          "participants{id,name}",
          "messages.limit(10){id,message,created_time,from{id,name},to{id,name},attachments}",
        ].join(",");
        const response = await fetch(
          `https://graph.facebook.com/${graphVersion}/${pageId}/conversations?platform=messenger&fields=${encodeURIComponent(fields)}&limit=25&access_token=${encodeURIComponent(pageAccessToken)}`,
          {
            cache: "no-store",
          },
        );
        const body = (await response.json()) as MetaConversationResponse;

        if (!response.ok) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Messenger inbox sync failed: ${body.error?.message ?? "Unknown Meta error."}`,
          });
        }

        let syncedMessages = 0;

        for (const conversation of body.data ?? []) {
          const guest = conversation.participants?.data?.find(
            (participant) => participant.id && participant.id !== pageId,
          );
          const psid = guest?.id ?? conversation.id;
          const messages = conversation.messages?.data ?? [];
          const newestMessage =
            [...messages].sort(
              (a, b) =>
                new Date(b.created_time ?? conversation.updated_time ?? Date.now()).getTime() -
                new Date(a.created_time ?? conversation.updated_time ?? Date.now()).getTime(),
            )[0] ?? null;
          const summary =
            newestMessage?.message?.trim() ||
            (newestMessage?.attachments ? "Messenger attachment" : "Messenger inquiry");
          const lastMessageAt = newestMessage?.created_time
            ? new Date(newestMessage.created_time)
            : conversation.updated_time
              ? new Date(conversation.updated_time)
              : new Date();
          const conversationText = messages
            .map((message) => message.message)
            .filter(Boolean)
            .join("\n");
          const profile = await fetchMessengerProfile({
            graphVersion,
            pageAccessToken,
            psid,
          });
          const existingLead = await prisma.tenantLead.findUnique({
            where: {
              tenantProfileId_psid: {
                psid,
                tenantProfileId: tenantProfile.id,
              },
            },
            select: {
              profilePictureUrl: true,
              stage: true,
              targetDate: true,
            },
          });
          const inferredStage = inferMessengerLeadStage(conversationText || summary);
          const inferredTargetDate = extractMessengerTargetDate(
            conversationText || summary,
            lastMessageAt,
          );
          const shouldAutoStage =
            !existingLead || existingLead.stage === "INTAKE";

          const lead = await prisma.tenantLead.upsert({
            where: {
              tenantProfileId_psid: {
                psid,
                tenantProfileId: tenantProfile.id,
              },
            },
            create: {
              guestName: profile?.name ?? guest?.name ?? "Messenger guest",
              inquiry: summary,
              lastMessage: summary,
              lastMessageAt,
              messengerIntegrationId: integration.id,
              profilePictureUrl: profile?.profilePictureUrl,
              psid,
              source: "Messenger",
              stage: inferredStage,
              targetDate: inferredTargetDate,
              tenantProfileId: tenantProfile.id,
            },
            update: {
              guestName: profile?.name ?? guest?.name ?? undefined,
              inquiry: summary,
              lastMessage: summary,
              lastMessageAt,
              messengerIntegrationId: integration.id,
              profilePictureUrl:
                profile?.profilePictureUrl ??
                existingLead?.profilePictureUrl ??
                undefined,
              stage: shouldAutoStage ? inferredStage : undefined,
              targetDate: existingLead?.targetDate ?? inferredTargetDate ?? undefined,
            },
          });

          for (const message of messages) {
            const senderId = message.from?.id ?? psid;
            const recipientId =
              message.to?.data?.find((recipient) => recipient.id)?.id ?? pageId;
            const sentAt = message.created_time
              ? new Date(message.created_time)
              : lastMessageAt;

            await prisma.tenantLeadMessage.upsert({
              where: {
                metaMessageId: message.id,
              },
              create: {
                attachments: message.attachments
                  ? (message.attachments as Prisma.InputJsonValue)
                  : undefined,
                direction: senderId === pageId ? "OUTBOUND" : "INBOUND",
                lead: {
                  connect: {
                    id: lead.id,
                  },
                },
                metaMessageId: message.id,
                raw: message as Prisma.InputJsonValue,
                recipientId,
                senderId,
                sentAt,
                text: message.message ?? null,
              },
              update: {
                attachments: message.attachments
                  ? (message.attachments as Prisma.InputJsonValue)
                  : undefined,
                direction: senderId === pageId ? "OUTBOUND" : "INBOUND",
                raw: message as Prisma.InputJsonValue,
                text: message.message ?? null,
              },
            });
            syncedMessages += 1;
          }
        }

        return {
          conversations: body.data?.length ?? 0,
          messages: syncedMessages,
        };
      }),
      save: baseProcedure.input(tenantLeadSaveSchema).mutation(async ({ ctx, input }) => {
        const authUser = ctx.session?.user;

        if (!authUser?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Sign in required.",
          });
        }

        const tenantProfile = await getTenantProfileForSession(authUser.id);
        const targetDate = input.targetDate
          ? new Date(`${input.targetDate}T00:00:00`)
          : null;

        if (input.id) {
          const lead = await prisma.tenantLead.findFirst({
            where: {
              id: input.id,
              tenantProfileId: tenantProfile.id,
            },
          });

          if (!lead) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Lead not found.",
            });
          }

          return prisma.tenantLead.update({
            where: {
              id: input.id,
            },
            data: {
              guestName: input.guestName,
              inquiry: input.inquiry ?? null,
              lastMessage: input.lastMessage ?? lead.lastMessage,
              source: input.source,
              stage: input.stage,
              targetDate,
            },
          });
        }

        return prisma.tenantLead.create({
          data: {
            guestName: input.guestName,
            inquiry: input.inquiry ?? null,
            lastMessage: input.lastMessage ?? input.inquiry ?? null,
            lastMessageAt: input.lastMessage || input.inquiry ? new Date() : null,
            psid: `manual:${Date.now()}:${generateRandomString(8)}`,
            source: input.source,
            stage: input.stage,
            targetDate,
            tenantProfileId: tenantProfile.id,
          },
        });
      }),
      updateStage: baseProcedure
        .input(
          z.object({
            id: z.string().trim().min(1, "Lead is required."),
            stage: tenantLeadStageSchema,
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const tenantProfile = await getTenantProfileForSession(authUser.id);
          const lead = await prisma.tenantLead.findFirst({
            where: {
              id: input.id,
              tenantProfileId: tenantProfile.id,
            },
          });

          if (!lead) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Lead not found.",
            });
          }

          await prisma.tenantLead.update({
            where: {
              id: input.id,
            },
            data: {
              stage: input.stage,
            },
          });

          return {
            id: input.id,
          };
        }),
      sendReply: baseProcedure
        .input(tenantLeadReplySchema)
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const tenantProfile = await getTenantProfileForSession(authUser.id);
          const lead = await prisma.tenantLead.findFirst({
            where: {
              id: input.id,
              tenantProfileId: tenantProfile.id,
            },
            include: {
              messengerIntegration: true,
            },
          });

          if (!lead) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Lead not found.",
            });
          }

          const pageAccessToken =
            lead.messengerIntegration?.pageAccessToken ??
            process.env.META_PAGE_ACCESS_TOKEN;
          const pageId = lead.messengerIntegration?.pageId ?? process.env.META_PAGE_ID;

          if (lead.psid.startsWith("manual:")) {
            throw new TRPCError({
              code: "PRECONDITION_FAILED",
              message: "Manual lead has no Messenger PSID.",
            });
          }

          if (!pageAccessToken || !pageId) {
            throw new TRPCError({
              code: "PRECONDITION_FAILED",
              message: "Messenger Page access token is required.",
            });
          }

          const graphVersion = process.env.META_GRAPH_API_VERSION ?? "v25.0";
          const response = await fetch(
            `https://graph.facebook.com/${graphVersion}/me/messages?access_token=${encodeURIComponent(pageAccessToken)}`,
            {
              body: JSON.stringify({
                messaging_type: "RESPONSE",
                message: {
                  text: input.text,
                },
                recipient: {
                  id: lead.psid,
                },
              }),
              headers: {
                "Content-Type": "application/json",
              },
              method: "POST",
            },
          );
          const body = (await response.json()) as {
            error?: { message?: string };
            message_id?: string;
          };

          if (!response.ok) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Messenger reply failed: ${body.error?.message ?? "Unknown Meta error."}`,
            });
          }

          const sentAt = new Date();

          await prisma.$transaction([
            prisma.tenantLead.update({
              where: {
                id: input.id,
              },
              data: {
                lastMessage: input.text,
                lastMessageAt: sentAt,
              },
            }),
            prisma.tenantLeadMessage.create({
              data: {
                direction: "OUTBOUND",
                lead: {
                  connect: {
                    id: input.id,
                  },
                },
                metaMessageId: body.message_id ?? `outbound:${input.id}:${sentAt.getTime()}`,
                recipientId: lead.psid,
                senderId: pageId,
                sentAt,
                text: input.text,
              },
            }),
          ]);

          return {
            id: input.id,
          };
        }),
      delete: baseProcedure
        .input(
          z.object({
            id: z.string().trim().min(1, "Lead is required."),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const tenantProfile = await getTenantProfileForSession(authUser.id);
          const lead = await prisma.tenantLead.findFirst({
            where: {
              id: input.id,
              tenantProfileId: tenantProfile.id,
            },
          });

          if (!lead) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Lead not found.",
            });
          }

          await prisma.tenantLead.delete({
            where: {
              id: input.id,
            },
          });

          return {
            id: input.id,
          };
        }),
      list: baseProcedure.query(async ({ ctx }) => {
        const authUser = ctx.session?.user;

        if (!authUser?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Sign in required.",
          });
        }

        const tenantProfile = await getTenantProfileForSession(authUser.id);
        const leads = await prisma.tenantLead.findMany({
          where: {
            tenantProfileId: tenantProfile.id,
          },
          include: {
            messages: {
              orderBy: {
                sentAt: "desc",
              },
              take: 20,
            },
            messengerIntegration: true,
          },
          orderBy: [
            {
              lastMessageAt: "desc",
            },
            {
              createdAt: "desc",
            },
          ],
        });

        return leads.map((lead) => ({
          channel: "Messenger" as const,
          createdAt: lead.createdAt.toISOString(),
          guestName: lead.guestName,
          id: lead.id,
          inquiry: lead.inquiry ?? "Messenger inquiry",
          lastMessage: lead.lastMessage ?? "--",
          lastMessageAt: lead.lastMessageAt?.toISOString() ?? null,
          messages: lead.messages.map((message) => ({
            attachments: message.attachments,
            direction: message.direction,
            id: message.id,
            postbackPayload: message.postbackPayload,
            sentAt: message.sentAt.toISOString(),
            text: message.text ?? "Attachment or postback",
          })),
          pageId: lead.messengerIntegration?.pageId ?? null,
          profilePictureUrl: lead.profilePictureUrl,
          psid: lead.psid,
          source: lead.source,
          stage: lead.stage,
          targetDate: lead.targetDate?.toISOString() ?? null,
        }));
      }),
    }),
    amenities: createTRPCRouter({
      list: baseProcedure.query(async ({ ctx }) => {
        const authUser = ctx.session?.user;

        if (!authUser?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Sign in required.",
          });
        }

        const tenantProfile = await getTenantProfileForSession(authUser.id);
        const amenities = await prisma.tenantAmenity.findMany({
          where: {
            tenantProfileId: tenantProfile.id,
          },
          orderBy: [
            {
              sortOrder: "asc",
            },
            {
              updatedAt: "desc",
            },
          ],
        });

        return amenities.map(toTenantAmenityOutput);
      }),
      get: baseProcedure
        .input(
          z.object({
            id: z.string(),
          }),
        )
        .query(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const tenantProfile = await getTenantProfileForSession(authUser.id);
          const amenity = await prisma.tenantAmenity.findFirst({
            where: {
              id: input.id,
              tenantProfileId: tenantProfile.id,
            },
          });

          if (!amenity) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Amenity not found.",
            });
          }

          return toTenantAmenityOutput(amenity);
        }),
      save: baseProcedure
        .input(tenantAmenitySchema)
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const tenantProfile = await getTenantProfileForSession(authUser.id);
          const code = input.code.toUpperCase();

          if (input.id) {
            const existingAmenity = await prisma.tenantAmenity.findFirst({
              where: {
                id: input.id,
                tenantProfileId: tenantProfile.id,
              },
            });

            if (!existingAmenity) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Amenity not found.",
              });
            }
          }

          const duplicateCode = await prisma.tenantAmenity.findFirst({
            where: {
              tenantProfileId: tenantProfile.id,
              code,
              id: input.id
                ? {
                    not: input.id,
                  }
                : undefined,
            },
          });

          if (duplicateCode) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "Amenity code already exists.",
            });
          }

          const data = {
            code,
            name: input.name,
            category: input.category,
            icon: input.icon,
            description: input.description ?? null,
            appliesTo: toTenantAmenityScope(input.appliesTo),
            chargeable: input.chargeable,
            feeAmount: input.chargeable ? (input.feeAmount ?? null) : null,
            feeUnit: toTenantAmenityFeeUnit(input.feeUnit),
            status: toTenantAmenityStatus(input.status),
            showOnBookingPage: input.showOnBookingPage,
            featured: input.featured,
            sortOrder: input.sortOrder,
            internalNotes: input.internalNotes ?? null,
          };

          const amenity = input.id
            ? await prisma.tenantAmenity.update({
                where: {
                  id: input.id,
                },
                data,
              })
            : await prisma.tenantAmenity.create({
                data: {
                  ...data,
                  tenantProfileId: tenantProfile.id,
                },
              });

          return toTenantAmenityOutput(amenity);
        }),
      updateStatus: baseProcedure
        .input(
          z.object({
            id: z.string(),
            status: tenantAmenityStatusSchema,
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const tenantProfile = await getTenantProfileForSession(authUser.id);
          const amenity = await prisma.tenantAmenity.findFirst({
            where: {
              id: input.id,
              tenantProfileId: tenantProfile.id,
            },
          });

          if (!amenity) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Amenity not found.",
            });
          }

          await prisma.tenantAmenity.update({
            where: {
              id: input.id,
            },
            data: {
              status: toTenantAmenityStatus(input.status),
            },
          });

          return {
            id: input.id,
          };
        }),
      reorder: baseProcedure
        .input(
          z.object({
            items: z.array(
              z.object({
                id: z.string(),
                sortOrder: z.number().int().min(0),
              }),
            ),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const tenantProfile = await getTenantProfileForSession(authUser.id);
          const ids = input.items.map((item) => item.id);
          const amenityCount = await prisma.tenantAmenity.count({
            where: {
              id: {
                in: ids,
              },
              tenantProfileId: tenantProfile.id,
            },
          });

          if (amenityCount !== ids.length) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "One or more amenities are invalid.",
            });
          }

          await prisma.$transaction(
            input.items.map((item) =>
              prisma.tenantAmenity.update({
                where: {
                  id: item.id,
                },
                data: {
                  sortOrder: item.sortOrder,
                },
              }),
            ),
          );

          return {
            updated: input.items.length,
          };
        }),
      delete: baseProcedure
        .input(
          z.object({
            id: z.string(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const tenantProfile = await getTenantProfileForSession(authUser.id);
          const amenity = await prisma.tenantAmenity.findFirst({
            where: {
              id: input.id,
              tenantProfileId: tenantProfile.id,
            },
          });

          if (!amenity) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Amenity not found.",
            });
          }

          await prisma.tenantAmenity.delete({
            where: {
              id: input.id,
            },
          });

          return {
            id: input.id,
          };
        }),
    }),
    onboarding: baseProcedure.query(async ({ ctx }) => {
      const authUser = ctx.session?.user;

      if (!authUser?.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Sign in required.",
        });
      }

      const appUser = await prisma.appUser.findUnique({
        where: {
          authUserId: authUser.id,
        },
        include: {
          tenantProfile: true,
        },
      });

      if (appUser?.role !== "TENANT" || !appUser.tenantProfile) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Tenant account required.",
        });
      }

      return appUser.tenantProfile;
    }),
    saveOnboarding: baseProcedure
      .input(onboardingSchema)
      .mutation(async ({ ctx, input }) => {
        const authUser = ctx.session?.user;

        if (!authUser?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Sign in required.",
          });
        }

        const { complete, ...profileInput } = input;
        const tenantProfile = await prisma.tenantProfile.update({
          where: {
            appUserId: authUser.id,
          },
          data: {
            ...profileInput,
            onboardingStatus: complete ? "COMPLETED" : "IN_PROGRESS",
            onboardingCompletedAt: complete ? new Date() : undefined,
          },
        });

        return {
          tenantProfile,
          redirectTo: complete ? "/tenant/dashboard" : "/auth/onboarding",
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
