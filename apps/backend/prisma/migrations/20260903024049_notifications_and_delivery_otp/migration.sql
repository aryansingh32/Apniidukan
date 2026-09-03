-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ORDER_CONFIRMED', 'PAYMENT_VERIFIED', 'PAYMENT_REJECTED', 'ORDER_DISPATCHED', 'OUT_FOR_DELIVERY', 'ORDER_DELIVERED', 'ORDER_CANCELLED', 'NEW_SCHEME', 'ACCOUNT_APPROVED', 'ACCOUNT_REJECTED', 'ACCOUNT_SUSPENDED', 'BROADCAST');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "deliveryOtp" TEXT,
ADD COLUMN     "deliveryOtpVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "requiresDeliveryOtp" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "retailerId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "orderId" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_retailerId_read_idx" ON "Notification"("retailerId", "read");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "Retailer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
