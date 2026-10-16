-- DropIndex
DROP INDEX "admin_schema"."Zone_name_key";

-- CreateTable
CREATE TABLE "user_schema"."OtpRecord" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "otpHash" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OtpRecord_email_purpose_idx" ON "user_schema"."OtpRecord"("email", "purpose");
