import { createHash, randomBytes } from "crypto";

export function generateInviteToken() {
  return randomBytes(32).toString("hex");
}

export function hashInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function getInviteExpiresAt() {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  return expiresAt;
}
