-- CreateTable
CREATE TABLE "admin_schema"."DropOffPartner" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "landmarkId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DropOffPartner_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "admin_schema"."DropOffPartner" ADD CONSTRAINT "DropOffPartner_landmarkId_fkey" FOREIGN KEY ("landmarkId") REFERENCES "admin_schema"."Landmark"("id") ON DELETE CASCADE ON UPDATE CASCADE;
