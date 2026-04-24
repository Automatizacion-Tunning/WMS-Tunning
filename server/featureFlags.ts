/**
 * Feature flags simples por env var.
 *  - default true en desarrollo, false en produccion (rollout gradual).
 *  - Override explicito: FEATURE_REPORTS=true | false
 */
const isProd = process.env.NODE_ENV === "production";

function readBoolFlag(envKey: string, defaultValue: boolean): boolean {
  const raw = process.env[envKey];
  if (raw === undefined || raw === "") return defaultValue;
  return raw.toLowerCase() === "true" || raw === "1";
}

export const featureFlags = {
  reports: readBoolFlag("FEATURE_REPORTS", !isProd),
};
