import { createHash } from "crypto";

export async function hashPassword(password: string): Promise<string> {
  return createHash("sha256").update(password).digest("hex");
}

export async function comparePassword(inputPassword: string, storedPassword: string): Promise<boolean> {
  const hashedInput = await hashPassword(inputPassword);
  // Comparación en tiempo constante para evitar timing attacks
  if (hashedInput.length !== storedPassword.length) return false;
  let result = 0;
  for (let i = 0; i < hashedInput.length; i++) {
    result |= hashedInput.charCodeAt(i) ^ storedPassword.charCodeAt(i);
  }
  return result === 0;
}

/** Detecta si un password está en texto plano (no es un hash SHA256 hex de 64 chars) */
export function isPlaintextPassword(password: string): boolean {
  return !/^[a-f0-9]{64}$/.test(password);
}
