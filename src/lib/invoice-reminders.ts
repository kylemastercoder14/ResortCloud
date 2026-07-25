import nodemailer from "nodemailer";

import { prisma } from "@/lib/prisma";

type ReminderCadence = "STANDARD" | "LIGHT" | "STRICT" | "PAUSED";

const DAY_MS = 24 * 60 * 60 * 1000;

type ReminderRunResult = {
  failed: Array<{ id: string; message: string }>;
  skipped: number;
  sent: number;
  scanned: number;
};

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required to send invoice reminders.`);
  }

  return value;
}

function createTransporter() {
  const host = getRequiredEnv("SMTP_HOST");
  const port = Number(process.env.SMTP_PORT ?? "587");
  const secure = process.env.SMTP_SECURE === "true";
  const user = getRequiredEnv("SMTP_USER");
  const pass = getRequiredEnv("SMTP_PASSWORD");

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });
}

export async function runInvoiceReminderCron(now = new Date()): Promise<ReminderRunResult> {
  const invoices = await prisma.tenantInvoice.findMany({
    where: {
      status: {
        in: ["DRAFT", "SENT", "OVERDUE"],
      },
      guestEmail: {
        not: null,
      },
      reminderCadence: {
        not: "PAUSED",
      },
      OR: [
        {
          nextReminderAt: {
            lte: now,
          },
        },
        {
          nextReminderAt: null,
        },
      ],
    },
    include: {
      tenantProfile: {
        select: {
          billingEmail: true,
          businessName: true,
        },
      },
    },
    orderBy: {
      dueDate: "asc",
    },
  });
  const transporter = createTransporter();
  const from = getRequiredEnv("SMTP_FROM");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  const result: ReminderRunResult = {
    failed: [],
    skipped: 0,
    sent: 0,
    scanned: invoices.length,
  };

  for (const invoice of invoices) {
    if (!shouldSendReminder(invoice, now)) {
      result.skipped += 1;
      continue;
    }

    try {
      await sendInvoiceReminderEmail(invoice, now, transporter, from, appUrl);
      result.sent += 1;
    } catch (error) {
      result.failed.push({
        id: invoice.id,
        message: error instanceof Error ? error.message : "Unknown reminder error.",
      });
    }
  }

  return result;
}

export async function sendInvoiceReminderNow(invoiceId: string, now = new Date()) {
  const invoice = await prisma.tenantInvoice.findUnique({
    where: {
      id: invoiceId,
    },
    include: {
      tenantProfile: {
        select: {
          billingEmail: true,
          businessName: true,
        },
      },
    },
  });

  if (!invoice) {
    throw new Error("Invoice not found.");
  }

  if (!invoice.guestEmail?.trim()) {
    throw new Error("Invoice has no guest email.");
  }

  if (parseMoney(invoice.balanceDue) <= 0) {
    throw new Error("Invoice has no remaining balance.");
  }

  await sendInvoiceReminderEmail(invoice, now);

  return {
    id: invoice.id,
  };
}

async function sendInvoiceReminderEmail(
  invoice: {
    balanceDue: string;
    code: string;
    dueDate: Date;
    guestEmail: string | null;
    guestName: string;
    id: string;
    reminderCadence: ReminderCadence;
    status: "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "VOID";
    tenantProfile: {
      billingEmail: string | null;
      businessName: string | null;
    };
    totalAmount: string;
  },
  now: Date,
  transporter = createTransporter(),
  from = getRequiredEnv("SMTP_FROM"),
  appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
) {
  const workspaceName = invoice.tenantProfile.businessName || "ResortCloud";
  const html = buildReminderHtml({
    appUrl,
    balanceDue: invoice.balanceDue,
    code: invoice.code,
    dueDate: invoice.dueDate,
    guestName: invoice.guestName,
    totalAmount: invoice.totalAmount,
    workspaceName,
  });
  const text = buildReminderText({
    appUrl,
    balanceDue: invoice.balanceDue,
    code: invoice.code,
    dueDate: invoice.dueDate,
    guestName: invoice.guestName,
    totalAmount: invoice.totalAmount,
    workspaceName,
  });

  await transporter.sendMail({
    from,
    to: invoice.guestEmail!,
    replyTo: invoice.tenantProfile.billingEmail ?? undefined,
    subject: `Payment reminder - ${invoice.code}`,
    html,
    text,
  });

  await prisma.tenantInvoice.update({
    where: {
      id: invoice.id,
    },
    data: {
      lastReminderSentAt: now,
      nextReminderAt:
        invoice.reminderCadence === "PAUSED"
          ? null
          : getNextReminderAt(invoice.dueDate, invoice.reminderCadence, now),
      status: invoice.dueDate < now ? "OVERDUE" : invoice.status,
    },
  });
}

function shouldSendReminder(
  invoice: {
    balanceDue: string;
    dueDate: Date;
    guestEmail: string | null;
    lastReminderSentAt: Date | null;
    nextReminderAt: Date | null;
    reminderCadence: ReminderCadence;
  },
  now: Date,
) {
  if (!invoice.guestEmail?.trim()) return false;
  if (invoice.reminderCadence === "PAUSED") return false;
  if (parseMoney(invoice.balanceDue) <= 0) return false;
  if (isSameDay(invoice.lastReminderSentAt, now)) return false;

  const nextReminderAt =
    invoice.nextReminderAt ?? getFirstReminderAt(invoice.dueDate, invoice.reminderCadence);

  return nextReminderAt <= now;
}

function getFirstReminderAt(dueDate: Date, cadence: ReminderCadence) {
  if (cadence === "LIGHT") return startOfDay(dueDate);

  const first = startOfDay(dueDate);
  first.setDate(first.getDate() - 3);

  return first;
}

function getNextReminderAt(dueDate: Date, cadence: ReminderCadence, now: Date) {
  const due = startOfDay(dueDate);
  const today = startOfDay(now);
  const preDueSchedule =
    cadence === "STRICT"
      ? [-3, -1, 0]
      : cadence === "STANDARD"
        ? [-3, 0]
        : [0];

  for (const offset of preDueSchedule) {
    const scheduled = new Date(due);
    scheduled.setDate(due.getDate() + offset);
    if (scheduled > now) return scheduled;
  }

  const intervalDays = cadence === "STRICT" ? 1 : cadence === "STANDARD" ? 3 : 7;
  const overdueDays = Math.max(0, Math.floor((today.getTime() - due.getTime()) / DAY_MS));
  const nextOverdueDays =
    overdueDays <= 0
      ? intervalDays
      : Math.floor(overdueDays / intervalDays) * intervalDays + intervalDays;
  const next = new Date(due);
  next.setDate(due.getDate() + nextOverdueDays);

  return next;
}

function buildReminderHtml(input: {
  appUrl: string;
  balanceDue: string;
  code: string;
  dueDate: Date;
  guestName: string;
  totalAmount: string;
  workspaceName: string;
}) {
  const invoiceUrl = new URL("/", input.appUrl).toString();

  return `<!doctype html>
<html>
  <body style="margin:0;background:#ffffff;color:#020617;font-family:Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#ffffff;">
      <tr>
        <td align="center" style="padding:48px 24px;">
          <table role="presentation" width="670" cellspacing="0" cellpadding="0" style="max-width:670px;width:100%;">
            <tr>
              <td style="padding-bottom:40px;">
                <img src="https://alrioprivateresort.com/main/logo-light.png" width="90" alt="ResortCloud" style="display:block;border:0;outline:none;text-decoration:none;" />
              </td>
            </tr>
            <tr>
              <td>
                <h1 style="margin:0 0 24px;font-size:25px;line-height:1.2;font-weight:600;color:#020617;">Payment reminder</h1>
                <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#000000;">Hi ${escapeHtml(input.guestName)}, this is a reminder for your invoice at ${escapeHtml(input.workspaceName)}.</p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 30px;border-collapse:collapse;">
                  ${buildDetailRow("Invoice", input.code)}
                  ${buildDetailRow("Due date", formatEmailDate(input.dueDate))}
                  ${buildDetailRow("Total", formatEmailAmount(input.totalAmount))}
                  ${buildDetailRow("Balance due", formatEmailAmount(input.balanceDue))}
                </table>
                <a href="${invoiceUrl}" style="display:inline-block;height:32px;border:1px solid #000000;border-radius:10px;background:#171717;background-image:linear-gradient(to bottom,#4b4b4b,#171717);color:#ffffff;font-size:14px;font-weight:500;line-height:32px;text-decoration:none;padding:0 10px;box-shadow:inset 0 1px 0 rgba(255,255,255,0.35),0 1px 1px rgba(0,0,0,0.35);">View invoice</a>
                <p style="margin:22px 0 0;font-size:15px;line-height:1.6;color:#000000;">If payment has already been made, please disregard this reminder.</p>
              </td>
            </tr>
            <tr>
              <td style="padding-top:70px;">
                <div style="border-top:1px dashed #cbd5e1;padding-top:20px;color:#64748b;font-size:13px;">© 2026 ResortCloud</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function buildReminderText(input: {
  appUrl: string;
  balanceDue: string;
  code: string;
  dueDate: Date;
  guestName: string;
  totalAmount: string;
  workspaceName: string;
}) {
  return [
    "Payment reminder",
    "",
    `Hi ${input.guestName}, this is a reminder for your invoice at ${input.workspaceName}.`,
    `Invoice: ${input.code}`,
    `Due date: ${formatEmailDate(input.dueDate)}`,
    `Total: ${formatEmailAmount(input.totalAmount)}`,
    `Balance due: ${formatEmailAmount(input.balanceDue)}`,
    `View invoice: ${new URL("/", input.appUrl).toString()}`,
    "",
    "If payment has already been made, please disregard this reminder.",
    "",
    "© 2026 ResortCloud",
  ].join("\n");
}

function buildDetailRow(label: string, value: string) {
  return `<tr>
    <td style="width:160px;padding:10px 0;border-bottom:1px solid #e5e7eb;color:#64748b;font-size:14px;">${escapeHtml(label)}</td>
    <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#020617;font-size:14px;font-weight:600;">${escapeHtml(value)}</td>
  </tr>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatEmailDate(value: Date) {
  return value.toLocaleDateString("en-PH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatEmailAmount(value: string) {
  const amount = parseMoney(value);

  if (!Number.isFinite(amount)) return value;

  return `PHP ${amount.toLocaleString("en-PH", {
    maximumFractionDigits: 2,
  })}`;
}

function parseMoney(value: string) {
  return Number(value.replace(/[^\d.]/g, ""));
}

function startOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function isSameDay(left: Date | null, right: Date) {
  if (!left) return false;

  return startOfDay(left).getTime() === startOfDay(right).getTime();
}
