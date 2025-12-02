/*
  Warnings:

  - You are about to drop the column `product_id` on the `materials` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `variants` table. All the data in the column will be lost.
  - You are about to drop the `inventories` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[user_id]` on the table `carts` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `material_id` to the `variants` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."inventories" DROP CONSTRAINT "inventories_product_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."materials" DROP CONSTRAINT "materials_product_id_fkey";

-- AlterTable
ALTER TABLE "materials" DROP COLUMN "product_id";

-- AlterTable
ALTER TABLE "variants" DROP COLUMN "price",
ADD COLUMN     "material_id" TEXT NOT NULL;

-- DropTable
DROP TABLE "public"."inventories";

-- CreateIndex
CREATE UNIQUE INDEX "carts_user_id_key" ON "carts"("user_id");

-- AddForeignKey
ALTER TABLE "variants" ADD CONSTRAINT "variants_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;
