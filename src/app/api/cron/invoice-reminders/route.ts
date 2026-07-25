import { NextResponse } from "next/server";

import { runInvoiceReminderCron } from "@/lib/invoice-reminders";

export async function GET(request: Request) {
  return handleInvoiceReminderCron(request);
}

export async function POST(request: Request) {
  return handleInvoiceReminderCron(request);
}

async function handleInvoiceReminderCron(request: Request) {
  const configuredSecret = process.env.CRON_SECRET;

  if (configuredSecret) {
    const authorization = request.headers.get("authorization");
    const headerSecret = request.headers.get("x-cron-secret");
    const bearerToken = authorization?.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length)
      : "";

    if (bearerToken !== configuredSecret && headerSecret !== configuredSecret) {
      return NextResponse.json({ error: "Unauthorized cron request." }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "CRON_SECRET is required." }, { status: 500 });
  }

  const result = await runInvoiceReminderCron();

  return NextResponse.json({
    ok: true,
    ...result,
  });
}
