// Extrae el status HTTP desde un Error lanzado por apiRequest / getQueryFn.
// Formato esperado del mensaje: "${status}: ${text}" (ver client/src/lib/queryClient.ts).
export function parseHttpStatus(error: unknown): number | null {
  if (error instanceof Error) {
    const match = error.message.match(/^(\d{3}):/);
    if (match) return parseInt(match[1], 10);
  }
  return null;
}
