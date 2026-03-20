/**
 * Reglas de sesion compartidas para todos los agentes.
 * Define la fecha actual, el template de notas y la instruccion obligatoria.
 */

export const TODAY = new Date().toISOString().slice(0, 10); // yyyy-MM-dd

export const SESSION_NOTE_TEMPLATE = `# Sesion ${TODAY}

## Resumen
Breve descripcion de lo trabajado.

## Cambios realizados
- Archivos modificados/creados con descripcion

## Decisiones tomadas
- Razon de cada decision importante

## Pendientes
- [ ] Tareas que quedaron sin completar

## Contexto para proxima sesion
Informacion clave para retomar el trabajo.
`;

/**
 * Instruccion que se inyecta en el prompt de TODOS los agentes.
 * Obliga a actualizar sesiones al finalizar el trabajo.
 */
export function buildSessionRules(
  apartados: { apartado: string; capa: "frontend" | "backend" }[]
): string {
  const paths = apartados
    .map((a) => `sessions/${a.apartado}/${a.capa}/${TODAY}/notas.md`)
    .join("\n   - ");

  return `
## REGLA OBLIGATORIA DE SESIONES

Al INICIAR tu trabajo:
1. Lee la sesion mas reciente de cada apartado asignado para obtener contexto
2. Busca la carpeta con la fecha mas reciente dentro de sessions/{apartado}/{capa}/
3. Lee el archivo notas.md de esa carpeta

Al FINALIZAR tu trabajo SIEMPRE debes:
1. Crear la carpeta sessions/{apartado}/{capa}/${TODAY}/ si no existe (usa mkdir -p)
2. Crear o SOBRESCRIBIR el archivo notas.md en esa carpeta
3. El archivo debe seguir este formato exacto:

\`\`\`markdown
# Sesion ${TODAY}

## Resumen
[Describe brevemente que se trabajo]

## Cambios realizados
- [archivo1] — [que se hizo]
- [archivo2] — [que se hizo]

## Decisiones tomadas
- [Decision 1] — [Razon]

## Pendientes
- [ ] [Tarea pendiente 1]

## Contexto para proxima sesion
[Informacion clave para retomar]
\`\`\`

Archivos de sesion que debes actualizar:
   - ${paths}

IMPORTANTE: Esta regla NO es opcional. Si no actualizas las sesiones, tu trabajo se considera incompleto.
`;
}

/**
 * Instruccion para leer manuales al inicio.
 */
export function buildManualReadingRules(manuales: string[]): string {
  const manualPaths = manuales
    .map((m) => `Manuales/${m}`)
    .join("\n   - ");

  return `
## LECTURA OBLIGATORIA DE MANUALES

Al INICIAR tu trabajo, DEBES leer los siguientes manuales para entender el contexto de la aplicacion:
   - ${manualPaths}

Estos manuales contienen la documentacion funcional de la aplicacion. Usalos como referencia para entender que hace cada seccion y como debe funcionar.
`;
}
