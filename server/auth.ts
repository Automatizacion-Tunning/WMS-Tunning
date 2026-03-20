import { randomBytes, scryptSync, timingSafeEqual, createHash } from "crypto";

/**
 * Hashea un password con scrypt (salt aleatorio de 16 bytes).
 * Retorna formato "salt:hash" en hexadecimal.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Compara un password de entrada contra el almacenado.
 * Soporta formato scrypt (salt:hash) y legacy SHA256 (64 hex chars).
 */
export async function comparePassword(inputPassword: string, storedPassword: string): Promise<boolean> {
  // Legacy SHA256: 64 hex chars sin ":"
  if (isSha256Hash(storedPassword)) {
    const inputHash = createHash("sha256").update(inputPassword).digest("hex");
    const inputBuf = Buffer.from(inputHash, "hex");
    const storedBuf = Buffer.from(storedPassword, "hex");
    return timingSafeEqual(inputBuf, storedBuf);
  }

  // Formato scrypt: salt:hash
  const [salt, storedHash] = storedPassword.split(":");
  if (!salt || !storedHash) return false;

  const inputHash = scryptSync(inputPassword, salt, 32);
  const storedBuf = Buffer.from(storedHash, "hex");
  return timingSafeEqual(inputHash, storedBuf);
}

/**
 * Detecta si un password esta en texto plano.
 * Retorna true si NO es formato salt:hash (hex 32:64) NI es SHA256 puro (hex 64).
 */
export function isPlaintextPassword(password: string): boolean {
  // Formato scrypt: 32 hex chars (salt) + ":" + 64 hex chars (hash)
  if (/^[a-f0-9]{32}:[a-f0-9]{64}$/.test(password)) return false;
  // Formato SHA256: 64 hex chars
  if (/^[a-f0-9]{64}$/.test(password)) return false;
  return true;
}

/**
 * Detecta si un password almacenado es un hash SHA256 legacy (para migracion automatica).
 */
export function isSha256Hash(password: string): boolean {
  return /^[a-f0-9]{64}$/.test(password);
}
