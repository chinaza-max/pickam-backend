/*
  Warnings:

  - You are about to drop the column `lat` on the `Landmark` table. All the data in the column will be lost.
  - You are about to drop the column `lng` on the `Landmark` table. All the data in the column will be lost.
  - You are about to drop the column `basePrice` on the `PricingMatrix` table. All the data in the column will be lost.
  - You are about to drop the column `perKmPrice` on the `PricingMatrix` table. All the data in the column will be lost.
  - You are about to drop the column `boundary` on the `Zone` table. All the data in the column will be lost.
  - Added the required column `price` to the `PricingMatrix` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "admin_schema"."Landmark" DROP COLUMN "lat",
DROP COLUMN "lng";

-- AlterTable
ALTER TABLE "admin_schema"."PricingMatrix" DROP COLUMN "basePrice",
DROP COLUMN "perKmPrice",
ADD COLUMN     "price" DECIMAL(10,2) NOT NULL;

-- AlterTable
ALTER TABLE "admin_schema"."Zone" DROP COLUMN "boundary",
ADD COLUMN     "basePrice" DECIMAL(10,2) NOT NULL DEFAULT 0.00;

-- CreateTable
CREATE TABLE "user_schema"."RiderZone" (
    "id" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiderZone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RiderZone_riderId_zoneId_key" ON "user_schema"."RiderZone"("riderId", "zoneId");
