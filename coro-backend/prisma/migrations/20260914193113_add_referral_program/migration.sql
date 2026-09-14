/*
  Warnings:

  - A unique constraint covering the columns `[referralCode]` on the table `Organization` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'REGISTERED', 'QUALIFIED', 'CONVERTED', 'REWARDED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReferralSource" AS ENUM ('LINK', 'CODE', 'EMAIL', 'MANUAL', 'ADMIN');

-- CreateEnum
CREATE TYPE "ReferralCreditType" AS ENUM ('REFERRAL_REWARD', 'MANUAL_ADJUSTMENT', 'REDEMPTION', 'REVERSAL');

-- CreateEnum
CREATE TYPE "ReferralCreditStatus" AS ENUM ('PENDING', 'APPROVED', 'APPLIED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "referralCode" TEXT;

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "referrerOrganizationId" TEXT NOT NULL,
    "referredOrganizationId" TEXT,
    "createdByUserId" TEXT,
    "referralCode" TEXT NOT NULL,
    "prospectCompanyName" TEXT,
    "prospectFirstName" TEXT,
    "prospectLastName" TEXT,
    "prospectEmail" TEXT,
    "prospectPhone" TEXT,
    "source" "ReferralSource" NOT NULL DEFAULT 'LINK',
    "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
    "firstTouchAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "registeredAt" TIMESTAMP(3),
    "qualifiedAt" TIMESTAMP(3),
    "convertedAt" TIMESTAMP(3),
    "rewardedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "conversionValueCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'CAD',
    "rewardAmountCents" INTEGER NOT NULL DEFAULT 25000,
    "adminNotes" TEXT,
    "rejectionReason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralCredit" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "referralId" TEXT,
    "type" "ReferralCreditType" NOT NULL,
    "status" "ReferralCreditStatus" NOT NULL DEFAULT 'PENDING',
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CAD',
    "description" TEXT,
    "adminNotes" TEXT,
    "approvedAt" TIMESTAMP(3),
    "appliedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferralCredit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Referral_referredOrganizationId_key" ON "Referral"("referredOrganizationId");

-- CreateIndex
CREATE INDEX "Referral_referrerOrganizationId_idx" ON "Referral"("referrerOrganizationId");

-- CreateIndex
CREATE INDEX "Referral_createdByUserId_idx" ON "Referral"("createdByUserId");

-- CreateIndex
CREATE INDEX "Referral_prospectEmail_idx" ON "Referral"("prospectEmail");

-- CreateIndex
CREATE INDEX "Referral_referralCode_idx" ON "Referral"("referralCode");

-- CreateIndex
CREATE INDEX "Referral_status_idx" ON "Referral"("status");

-- CreateIndex
CREATE INDEX "Referral_createdAt_idx" ON "Referral"("createdAt");

-- CreateIndex
CREATE INDEX "ReferralCredit_organizationId_idx" ON "ReferralCredit"("organizationId");

-- CreateIndex
CREATE INDEX "ReferralCredit_referralId_idx" ON "ReferralCredit"("referralId");

-- CreateIndex
CREATE INDEX "ReferralCredit_status_idx" ON "ReferralCredit"("status");

-- CreateIndex
CREATE INDEX "ReferralCredit_createdAt_idx" ON "ReferralCredit"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_referralCode_key" ON "Organization"("referralCode");

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referrerOrganizationId_fkey" FOREIGN KEY ("referrerOrganizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referredOrganizationId_fkey" FOREIGN KEY ("referredOrganizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralCredit" ADD CONSTRAINT "ReferralCredit_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralCredit" ADD CONSTRAINT "ReferralCredit_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral"("id") ON DELETE SET NULL ON UPDATE CASCADE;
