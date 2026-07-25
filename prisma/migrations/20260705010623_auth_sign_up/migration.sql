-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'TENANT', 'CUSTOMER');

-- CreateEnum
CREATE TYPE "TenantOnboardingStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "TenantSubscriptionPlan" AS ENUM ('FREE_TRIAL', 'STARTER', 'GROWTH', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "TenantBillingCycle" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "TenantSubscriptionStatus" AS ENUM ('PENDING', 'TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'REVOKED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "TenantPaymentMethod" AS ENUM ('CREDIT_CARD', 'BANK_TRANSFER', 'E_WALLET', 'CASH_DEPOSIT');

-- CreateEnum
CREATE TYPE "TenantPaymentAccountType" AS ENUM ('CREDIT_CARD', 'BANK_ACCOUNT', 'E_WALLET');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_user" (
    "authUserId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_user_pkey" PRIMARY KEY ("authUserId")
);

-- CreateTable
CREATE TABLE "tenant_profile" (
    "id" TEXT NOT NULL,
    "appUserId" TEXT NOT NULL,
    "resortName" TEXT,
    "propertyType" TEXT,
    "fullAddress" TEXT,
    "region" TEXT,
    "province" TEXT,
    "municipality" TEXT,
    "barangay" TEXT,
    "phoneNumber" TEXT,
    "website" TEXT,
    "shortDescription" TEXT,
    "subscriptionPlan" "TenantSubscriptionPlan" NOT NULL DEFAULT 'STARTER',
    "subscriptionStatus" "TenantSubscriptionStatus" NOT NULL DEFAULT 'PENDING',
    "billingCycle" "TenantBillingCycle" NOT NULL DEFAULT 'MONTHLY',
    "trialStartedAt" TIMESTAMP(3),
    "trialEndsAt" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "suspendedAt" TIMESTAMP(3),
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "polarCustomerId" TEXT,
    "polarSubscriptionId" TEXT,
    "polarProductId" TEXT,
    "businessName" TEXT,
    "billingEmail" TEXT,
    "billingPhoneCountryCode" TEXT DEFAULT '+63',
    "billingPhoneNumber" TEXT,
    "billingAddress" TEXT,
    "billingCity" TEXT,
    "billingStateProvince" TEXT,
    "billingPostalCode" TEXT,
    "billingCountry" TEXT DEFAULT 'Philippines',
    "paymentMethod" "TenantPaymentMethod" DEFAULT 'CREDIT_CARD',
    "cardholderName" TEXT,
    "cardBrand" TEXT,
    "cardLastFour" TEXT,
    "cardExpiry" TEXT,
    "onboardingStatus" "TenantOnboardingStatus" NOT NULL DEFAULT 'PENDING',
    "onboardingCurrentStep" INTEGER NOT NULL DEFAULT 0,
    "onboardingCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_profile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "app_user_email_key" ON "app_user"("email");

-- CreateIndex
CREATE INDEX "app_user_role_idx" ON "app_user"("role");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_profile_appUserId_key" ON "tenant_profile"("appUserId");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_user" ADD CONSTRAINT "app_user_authUserId_fkey" FOREIGN KEY ("authUserId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_profile" ADD CONSTRAINT "tenant_profile_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "app_user"("authUserId") ON DELETE CASCADE ON UPDATE CASCADE;
