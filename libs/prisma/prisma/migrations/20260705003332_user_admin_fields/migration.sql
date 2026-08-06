-- AlterTable
ALTER TABLE "user_schema"."User" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'ACTIVE';

-- CreateIndex
CREATE INDEX "User_email_idx" ON "user_schema"."User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "user_schema"."User"("role");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "user_schema"."User"("status");
