-- AlterTable
ALTER TABLE "tareas" ADD COLUMN     "coResponsableId" TEXT;

-- CreateIndex
CREATE INDEX "tareas_coResponsableId_idx" ON "tareas"("coResponsableId");

-- AddForeignKey
ALTER TABLE "tareas" ADD CONSTRAINT "tareas_coResponsableId_fkey" FOREIGN KEY ("coResponsableId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
