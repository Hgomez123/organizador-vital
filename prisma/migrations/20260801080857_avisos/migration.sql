/*
  Warnings:

  - You are about to drop the column `recordatorioActivo` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `recordatorioHora` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `ultimoRecordatorio` on the `User` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "TipoAviso" AS ENUM ('PLAN_MANANA', 'EMPUJON_TARDE', 'REGISTRO_NOCHE', 'REVISION_SEMANAL');

-- AlterTable
ALTER TABLE "User" DROP COLUMN "recordatorioActivo",
DROP COLUMN "recordatorioHora",
DROP COLUMN "ultimoRecordatorio";

-- CreateTable
CREATE TABLE "Aviso" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tipo" "TipoAviso" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT false,
    "hora" TEXT NOT NULL,
    "diaSemana" INTEGER,
    "ultimoEnvio" TIMESTAMP(3),

    CONSTRAINT "Aviso_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Aviso_userId_idx" ON "Aviso"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Aviso_userId_tipo_key" ON "Aviso"("userId", "tipo");

-- AddForeignKey
ALTER TABLE "Aviso" ADD CONSTRAINT "Aviso_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
