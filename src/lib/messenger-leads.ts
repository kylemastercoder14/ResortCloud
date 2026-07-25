export type MessengerLeadStage =
  | "INTAKE"
  | "QUALIFIED"
  | "PAYMENT_DONE"
  | "CONVERTED";

type MessengerProfileResponse = {
  error?: {
    message?: string;
  };
  first_name?: string;
  last_name?: string;
  name?: string;
  profile_pic?: string;
};

const MONTHS = new Map([
  ["jan", 0],
  ["january", 0],
  ["feb", 1],
  ["february", 1],
  ["mar", 2],
  ["march", 2],
  ["apr", 3],
  ["april", 3],
  ["may", 4],
  ["jun", 5],
  ["june", 5],
  ["jul", 6],
  ["july", 6],
  ["aug", 7],
  ["august", 7],
  ["sep", 8],
  ["sept", 8],
  ["september", 8],
  ["oct", 9],
  ["october", 9],
  ["nov", 10],
  ["november", 10],
  ["dec", 11],
  ["december", 11],
]);

export async function fetchMessengerProfile({
  graphVersion,
  pageAccessToken,
  psid,
}: {
  graphVersion: string;
  pageAccessToken: string;
  psid: string;
}) {
  try {
    const response = await fetch(
      `https://graph.facebook.com/${graphVersion}/${psid}?fields=first_name,last_name,name,profile_pic&access_token=${encodeURIComponent(pageAccessToken)}`,
      {
        cache: "no-store",
      },
    );
    const body = (await response.json()) as MessengerProfileResponse;

    if (!response.ok || body.error) {
      return null;
    }

    const name =
      body.name ??
      [body.first_name, body.last_name].filter(Boolean).join(" ").trim();

    return {
      name: name || null,
      profilePictureUrl: body.profile_pic ?? null,
    };
  } catch {
    return null;
  }
}

export function inferMessengerLeadStage(text: string): MessengerLeadStage {
  const lower = text.toLowerCase();

  if (/\b(confirm|confirmed|booked|reserved|reservation)\b/.test(lower)) {
    return "CONVERTED";
  }

  if (/\b(gcash|deposit|paid|payment|receipt|screenshot|proof)\b/.test(lower)) {
    return "PAYMENT_DONE";
  }

  if (
    /\b(avail|available|availability|rate|rates|quote|package|pax|headcount|date)\b/.test(
      lower,
    )
  ) {
    return "QUALIFIED";
  }

  return "INTAKE";
}

export function extractMessengerTargetDate(
  text: string,
  baseDate = new Date(),
) {
  const lower = text.toLowerCase();
  const today = startOfDay(baseDate);

  if (/\b(today|ngayon)\b/.test(lower)) {
    return today;
  }

  if (/\b(tomorrow|bukas)\b/.test(lower)) {
    const date = new Date(today);
    date.setDate(date.getDate() + 1);
    return date;
  }

  const monthMatch = lower.match(
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+(\d{1,2})(?:,\s*(\d{4}))?\b/,
  );

  if (monthMatch) {
    const month = MONTHS.get(monthMatch[1]);
    const day = Number(monthMatch[2]);
    const year = monthMatch[3] ? Number(monthMatch[3]) : today.getFullYear();

    return buildFutureDate(year, month, day, today);
  }

  const numericMatch = lower.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);

  if (numericMatch) {
    const month = Number(numericMatch[1]) - 1;
    const day = Number(numericMatch[2]);
    const rawYear = numericMatch[3] ? Number(numericMatch[3]) : today.getFullYear();
    const year = rawYear < 100 ? 2000 + rawYear : rawYear;

    return buildFutureDate(year, month, day, today);
  }

  return null;
}

function buildFutureDate(
  year: number,
  month: number | undefined,
  day: number,
  today: Date,
) {
  if (month === undefined || day < 1 || day > 31) {
    return null;
  }

  const date = new Date(year, month, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return null;
  }

  if (date.getTime() < today.getTime() - 24 * 60 * 60 * 1000) {
    date.setFullYear(date.getFullYear() + 1);
  }

  return startOfDay(date);
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}
