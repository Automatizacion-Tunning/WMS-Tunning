/**
 * Formatea una fecha a formato largo: dd/mm/yyyy, hh:mm
 */
export function formatDate(date: string | Date | null): string {
  if (!date) return "-";
  try {
    return new Date(date).toLocaleDateString("es-CL", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return String(date);
  }
}

/**
 * Formatea una fecha a formato corto: dd/mm/yyyy
 */
export function formatDateShort(date: string | Date | null): string {
  if (!date) return "-";
  try {
    return new Date(date).toLocaleDateString("es-CL", {
      year: "numeric", month: "2-digit", day: "2-digit",
    });
  } catch {
    return String(date);
  }
}

/**
 * Formatea un valor numérico a CLP: $1.234.567
 */
export function formatCLP(value: number | string | null): string {
  if (value === null || value === undefined) return "-";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return String(value);
  return "$" + num.toLocaleString("es-CL", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

/** Alias */
export const formatMoney = formatCLP;

/**
 * Obtiene el nombre del usuario de un movimiento
 */
export function getUserName(movement: { user?: { firstName?: string | null; lastName?: string | null; username?: string } | null }): string {
  if (!movement.user) return "Sistema";
  const { firstName, lastName, username } = movement.user;
  if (firstName) return `${firstName} ${lastName || ""}`.trim();
  return username || "Sistema";
}
