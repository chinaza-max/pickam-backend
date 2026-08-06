-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "admin_schema";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "notification_schema";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "order_schema";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "user_schema";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "wallet_schema";

-- CreateTable
CREATE TABLE "user_schema"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_schema"."Profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "phoneNumber" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_schema"."RiderProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vehicleType" TEXT NOT NULL,
    "vehiclePlate" TEXT NOT NULL,
    "licenseNo" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RiderProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_schema"."SocialAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_schema"."Wallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_schema"."Transaction" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_schema"."VirtualAccount" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VirtualAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_schema"."Order" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "riderId" TEXT,
    "pickupAddress" TEXT NOT NULL,
    "destinationAddress" TEXT NOT NULL,
    "pickupZoneId" TEXT NOT NULL,
    "destinationZoneId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL,
    "paymentStatus" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_schema"."OrderEvent" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_schema"."Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_schema"."Zone" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "boundary" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Zone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_schema"."Landmark" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Landmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_schema"."PricingMatrix" (
    "id" TEXT NOT NULL,
    "fromZoneId" TEXT NOT NULL,
    "toZoneId" TEXT NOT NULL,
    "basePrice" DECIMAL(10,2) NOT NULL,
    "perKmPrice" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingMatrix_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "user_schema"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "user_schema"."Profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RiderProfile_userId_key" ON "user_schema"."RiderProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SocialAccount_providerId_key" ON "user_schema"."SocialAccount"("providerId");

-- CreateIndex
CREATE UNIQUE INDEX "SocialAccount_provider_providerId_key" ON "user_schema"."SocialAccount"("provider", "providerId");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_userId_key" ON "wallet_schema"."Wallet"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_reference_key" ON "wallet_schema"."Transaction"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "VirtualAccount_walletId_key" ON "wallet_schema"."VirtualAccount"("walletId");

-- CreateIndex
CREATE UNIQUE INDEX "VirtualAccount_accountNumber_key" ON "wallet_schema"."VirtualAccount"("accountNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Zone_name_key" ON "admin_schema"."Zone"("name");

-- AddForeignKey
ALTER TABLE "user_schema"."Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_schema"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_schema"."SocialAccount" ADD CONSTRAINT "SocialAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_schema"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_schema"."Landmark" ADD CONSTRAINT "Landmark_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "admin_schema"."Zone"("id") ON DELETE CASCADE ON UPDATE CASCADE;
