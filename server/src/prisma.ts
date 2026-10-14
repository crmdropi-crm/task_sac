/**
 * Instancia única (singleton) del cliente Prisma.
 */
import { PrismaClient } from "@prisma/client";
import { isProd } from "./env";

export const prisma = new PrismaClient({
  log: isProd ? ["warn", "error"] : ["warn", "error"],
});
