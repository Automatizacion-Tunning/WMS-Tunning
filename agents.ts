/**
 * Sistema de Agentes para Control de Inventario (WMS)
 *
 * Orquesta 7 agentes especializados que trabajan como equipo:
 * - 2 desarrolladores (frontend, backend)
 * - 3 supervisores (inventario, bodegas, usuarios)
 * - 2 testers (inventario, general)
 *
 * Uso:
 *   npx tsx agents.ts --agent <nombre> --task "descripcion de la tarea"
 *   npx tsx agents.ts --list
 *
 * Ejemplos:
 *   npx tsx agents.ts --agent supervisor-inventario --task "Agregar campo de lote al producto"
 *   npx tsx agents.ts --agent tester-inventario --task "Verificar movimientos de stock"
 *   npx tsx agents.ts --agent frontend-dev --task "Corregir formulario de entrada de stock"
 */

import { query, type AgentDefinition, type ResultMessage } from "@anthropic-ai/claude-agent-sdk";
import {
  FRONTEND_DEV_PROMPT,
  BACKEND_DEV_PROMPT,
  SUPERVISOR_INVENTARIO_PROMPT,
  SUPERVISOR_BODEGAS_PROMPT,
  SUPERVISOR_USUARIOS_PROMPT,
  TESTER_INVENTARIO_PROMPT,
  TESTER_GENERAL_PROMPT,
} from "./agents/prompts.js";

// ---------------------------------------------------------------------------
// Definicion de agentes
// ---------------------------------------------------------------------------

const AGENT_DEFINITIONS: Record<string, AgentDefinition> = {
  // Desarrolladores
  "frontend-dev": {
    description: "Desarrollador frontend especializado en React + TypeScript + Vite + Tailwind.",
    prompt: FRONTEND_DEV_PROMPT,
    tools: ["Read", "Write", "Edit", "Glob", "Grep", "Bash"],
  },
  "backend-dev": {
    description: "Desarrollador backend especializado en Express + Drizzle ORM + PostgreSQL.",
    prompt: BACKEND_DEV_PROMPT,
    tools: ["Read", "Write", "Edit", "Glob", "Grep", "Bash"],
  },

  // Supervisores
  "supervisor-inventario": {
    description: "Supervisor de productos, inventario, ordenes de compra y escaneo de barcode.",
    prompt: SUPERVISOR_INVENTARIO_PROMPT,
    tools: ["Read", "Glob", "Grep", "Agent"],
  },
  "supervisor-bodegas": {
    description: "Supervisor de bodegas, centros de costo y ordenes de traspaso.",
    prompt: SUPERVISOR_BODEGAS_PROMPT,
    tools: ["Read", "Glob", "Grep", "Agent"],
  },
  "supervisor-usuarios": {
    description: "Supervisor de usuarios, roles, permisos y autenticacion.",
    prompt: SUPERVISOR_USUARIOS_PROMPT,
    tools: ["Read", "Glob", "Grep", "Agent"],
  },

  // Testers
  "tester-inventario": {
    description: "QA de productos/inventario/OC: revision de codigo + pruebas funcionales.",
    prompt: TESTER_INVENTARIO_PROMPT,
    tools: ["Read", "Glob", "Grep", "Bash"],
  },
  "tester-general": {
    description: "QA general de la app (todo excepto inventario): revision de codigo + pruebas funcionales.",
    prompt: TESTER_GENERAL_PROMPT,
    tools: ["Read", "Glob", "Grep", "Bash"],
  },
};

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(): { agent: string | null; task: string | null; list: boolean } {
  const args = process.argv.slice(2);
  let agent: string | null = null;
  let task: string | null = null;
  let list = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--agent" && args[i + 1]) {
      agent = args[++i];
    } else if (args[i] === "--task" && args[i + 1]) {
      task = args[++i];
    } else if (args[i] === "--list") {
      list = true;
    }
  }

  return { agent, task, list };
}

function printAgentList(): void {
  console.log("\n  Agentes disponibles:\n");
  console.log("  DESARROLLADORES:");
  console.log("    frontend-dev          — React + TypeScript + Vite + Tailwind");
  console.log("    backend-dev           — Express + Drizzle ORM + PostgreSQL");
  console.log("\n  SUPERVISORES:");
  console.log("    supervisor-inventario — Productos, inventario, OC, barcode");
  console.log("    supervisor-bodegas    — Bodegas, centros de costo, traspasos");
  console.log("    supervisor-usuarios   — Usuarios, roles, permisos, auth");
  console.log("\n  TESTERS:");
  console.log("    tester-inventario     — QA de productos/inventario/OC");
  console.log("    tester-general        — QA general (todo excepto inventario)");
  console.log("\n  Uso:");
  console.log('    npx tsx agents.ts --agent <nombre> --task "descripcion"');
  console.log("    npx tsx agents.ts --list\n");
}

// ---------------------------------------------------------------------------
// Ejecucion principal
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const { agent, task, list } = parseArgs();

  if (list) {
    printAgentList();
    return;
  }

  if (!agent || !task) {
    console.error('\n  Error: Se requiere --agent <nombre> y --task "descripcion"');
    printAgentList();
    process.exit(1);
  }

  if (!AGENT_DEFINITIONS[agent]) {
    console.error(`\n  Error: Agente "${agent}" no existe.`);
    printAgentList();
    process.exit(1);
  }

  console.log(`\n  Lanzando agente: ${agent}`);
  console.log(`  Tarea: ${task}\n`);

  // Construir subagentes disponibles segun el tipo de agente
  const agentsForQuery: Record<string, AgentDefinition> = {};

  // Los supervisores pueden invocar a los desarrolladores
  if (agent.startsWith("supervisor-")) {
    agentsForQuery["frontend-dev"] = AGENT_DEFINITIONS["frontend-dev"];
    agentsForQuery["backend-dev"] = AGENT_DEFINITIONS["backend-dev"];
  }

  // Determinar tools del agente
  const agentDef = AGENT_DEFINITIONS[agent];
  const allowedTools = [...agentDef.tools];

  // Solo agregar Agent tool si tiene subagentes disponibles
  if (Object.keys(agentsForQuery).length === 0) {
    const agentToolIndex = allowedTools.indexOf("Agent");
    if (agentToolIndex !== -1) {
      allowedTools.splice(agentToolIndex, 1);
    }
  }

  for await (const message of query({
    prompt: task,
    options: {
      cwd: process.cwd(),
      systemPrompt: agentDef.prompt,
      allowedTools,
      agents: Object.keys(agentsForQuery).length > 0 ? agentsForQuery : undefined,
      permissionMode: "acceptEdits",
      maxTurns: 50,
    },
  })) {
    if ("result" in message) {
      console.log("\n  --- Resultado ---\n");
      console.log(message.result);
      console.log("\n  -----------------\n");
    }
  }
}

main().catch((err) => {
  console.error("Error ejecutando agente:", err);
  process.exit(1);
});
