import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required to initialize Prisma Client.");
  }

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

const cachedPrisma = globalForPrisma.prisma;
const hasCurrentDelegates =
  cachedPrisma &&
  "tenantReservation" in cachedPrisma &&
  "tenantService" in cachedPrisma &&
  "tenantInvoice" in cachedPrisma &&
  "tenantFinanceEntry" in cachedPrisma;

export const prisma =
  cachedPrisma && hasCurrentDelegates ? cachedPrisma : createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
