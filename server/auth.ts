import { createHash } from "crypto";

export async function hashPassword(password: string): Promise<string> {
  return createHash("sha256").update(password).digest("hex");
}
