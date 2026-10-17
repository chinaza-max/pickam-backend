-- AlterTable
ALTER TABLE "order_schema"."Order" ADD COLUMN     "fundsReleased" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isReceived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "receivedAt" TIMESTAMP(3),
ADD COLUMN     "riderPayout" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "user_schema"."RiderProfile" ADD COLUMN     "commissionRate" DECIMAL(5,2) DEFAULT 80.00,
ADD COLUMN     "monthlySalary" DECIMAL(10,2),
ADD COLUMN     "payoutType" TEXT NOT NULL DEFAULT 'PERCENTAGE';
