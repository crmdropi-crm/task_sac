/**
 * Seed del administrador inicial.
 *
 * Se ejecuta con `npm run seed:admin` o automáticamente con `prisma db seed`.
 * Si NO existe ningún usuario, crea un admin con los datos de las variables
 * ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME / ADMIN_CARGO del .env.
 *
 * Es idempotente: si ya hay usuarios, no hace nada.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const totalUsuarios = await prisma.usuario.count();
  if (totalUsuarios > 0) {
    console.log(
      `[seed] Ya existen ${totalUsuarios} usuario(s). No se crea admin inicial.`
    );
    return;
  }

  const correo = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const nombre = process.env.ADMIN_NAME ?? "Administrador";
  const cargo = process.env.ADMIN_CARGO ?? "Administración";

  if (!correo || !password) {
    throw new Error(
      "[seed] Faltan ADMIN_EMAIL y/o ADMIN_PASSWORD en el entorno. " +
        "Defínelos en tu .env antes de crear el admin inicial."
    );
  }

  if (password.length < 8) {
    throw new Error("[seed] ADMIN_PASSWORD debe tener al menos 8 caracteres.");
  }

  const contrasenaHash = await bcrypt.hash(password, 12);

  const admin = await prisma.usuario.create({
    data: {
      nombre,
      correo: correo.toLowerCase().trim(),
      cargo,
      rol: "admin",
      contrasenaHash,
      activo: true,
    },
  });

  console.log(`[seed] Admin inicial creado: ${admin.correo}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
