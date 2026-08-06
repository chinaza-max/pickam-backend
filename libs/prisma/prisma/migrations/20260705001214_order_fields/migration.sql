-- AlterTable
ALTER TABLE "order_schema"."Order" ADD COLUMN     "deliveryNotes" TEXT,
ADD COLUMN     "deliveryProofUrl" TEXT,
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "pickupNotes" TEXT,
ADD COLUMN     "recipientName" TEXT,
ADD COLUMN     "recipientPhone" TEXT;
