/*
  Warnings:

  - Added the required column `subTotal` to the `orders` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "shippingFee" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "subTotal" DECIMAL(12,2) NOT NULL,
ADD COLUMN     "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0;
