-- CreateTable
CREATE TABLE IF NOT EXISTS admin_schema."State" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "State_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "State_name_key" ON admin_schema."State"("name");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "State_code_key" ON admin_schema."State"("code");

-- AlterTable: Add stateId column to Zone (nullable for backward compat)
ALTER TABLE admin_schema."Zone" ADD COLUMN IF NOT EXISTS "stateId" TEXT;

-- AddForeignKey
ALTER TABLE admin_schema."Zone" ADD CONSTRAINT "Zone_stateId_fkey"
    FOREIGN KEY ("stateId") REFERENCES admin_schema."State"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Drop old global unique on Zone.name (if exists) and replace with per-state unique
ALTER TABLE admin_schema."Zone" DROP CONSTRAINT IF EXISTS "Zone_name_key";

-- CreateIndex: unique zone name per state (allows same name in different states)
CREATE UNIQUE INDEX IF NOT EXISTS "Zone_stateId_name_key" ON admin_schema."Zone"("stateId", "name");
