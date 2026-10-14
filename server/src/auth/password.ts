/**
 * Hashing y verificación de contraseñas con bcrypt.
 */
import bcrypt from "bcryptjs";

const ROUNDS = 12;

export function hashContrasena(plano: string): Promise<string> {
  return bcrypt.hash(plano, ROUNDS);
}

export function verificarContrasena(
  plano: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plano, hash);
}
