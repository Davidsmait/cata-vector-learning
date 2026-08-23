// npm run query:with-index
//
// Demo 2: misma query que Demo 1, pero esta vez creamos un índice B-tree
// sobre `email` y comparamos los dos planes lado a lado.
//
// Estructura del script:
//   1. Garantizar que no hay índice en email (drop si existe)
//   2. Correr la query SIN índice y guardar el plan + métricas
//   3. CREATE INDEX en email + ANALYZE
//   4. Correr la MISMA query CON índice
//   5. Imprimir comparación

import pc from "picocolors";
import { pool, q, explain } from "../lib/db.ts";

function box(title: string) {
  const line = "═".repeat(60);
  console.log(pc.bold(pc.yellow(line)));
  console.log(pc.bold(pc.yellow("  " + title)));
  console.log(pc.bold(pc.yellow(line)));
}

function divider() {
  console.log(pc.dim("─".repeat(60)));
}

type Metrics = {
  operation: "Seq Scan" | "Index Scan" | "Index Only Scan" | "Bitmap Heap Scan" | "Other";
  rowsRemoved: number | null;
  bufferPages: number | null;
  planningTimeMs: number | null;
  executionTimeMs: number | null;
  planText: string[];
};

function parsePlan(planLines: string[]): Metrics {
  const text = planLines.join("\n");
  const ops = ["Index Only Scan", "Index Scan", "Bitmap Heap Scan", "Seq Scan"];
  let operation: Metrics["operation"] = "Other";
  for (const op of ops) {
    if (text.includes(op)) {
      operation = op as Metrics["operation"];
      break;
    }
  }
  const rowsRemoved = text.match(/Rows Removed by Filter:\s*(\d+)/i)?.[1];
  const buffers = text.match(/Buffers:\s*shared\s*hit=(\d+)/i)?.[1];
  const planTime = text.match(/Planning Time:\s*([\d.]+)\s*ms/i)?.[1];
  const execTime = text.match(/Execution Time:\s*([\d.]+)\s*ms/i)?.[1];

  return {
    operation,
    rowsRemoved: rowsRemoved ? Number(rowsRemoved) : null,
    bufferPages: buffers ? Number(buffers) : null,
    planningTimeMs: planTime ? Number(planTime) : null,
    executionTimeMs: execTime ? Number(execTime) : null,
    planText: planLines,
  };
}

async function main() {
  box("DEMO 2 — Crear índice B-tree y comparar");

  // 0) Preparación: agarrar email objetivo (el mismo que en Demo 1)
  const [target] = await q<{ id: number; email: string; name: string }>(
    "SELECT id, email, name FROM customers ORDER BY id OFFSET 5000 LIMIT 1"
  );
  const sql = "SELECT id, name, city FROM customers WHERE email = $1";

  console.log();
  console.log(pc.bold("Setup:"));
  console.log(`  Email objetivo: ${pc.cyan(target.email)} (id ${target.id})`);
  console.log(`  Query:          ${pc.cyan(sql)}`);
  console.log();

  // 1) Limpiar: que NO haya índice en email
  console.log(pc.dim("→ Dropeando idx_customers_email si existe..."));
  await q("DROP INDEX IF EXISTS idx_customers_email");
  await q("ANALYZE customers");

  // 2) Calentar cache y medir SIN índice
  await q(sql, [target.email]);
  const planSin = await explain(sql, [target.email]);
  const metricsSin = parsePlan(planSin);

  divider();
  console.log(pc.bold("Plan SIN índice:"));
  console.log();
  for (const line of planSin) console.log(line);
  console.log();

  // 3) Crear índice B-tree
  divider();
  console.log(pc.bold("Creando índice..."));
  console.log(pc.cyan("  CREATE INDEX idx_customers_email ON customers(email);"));

  const t0 = Date.now();
  await q("CREATE INDEX idx_customers_email ON customers(email)");
  const tCreateMs = Date.now() - t0;
  await q("ANALYZE customers");

  const [{ size }] = await q<{ size: string }>(
    `SELECT pg_size_pretty(pg_relation_size('idx_customers_email')) AS size`
  );
  console.log(pc.green(`  ✓ Índice creado en ${tCreateMs} ms. Tamaño: ${size}`));
  console.log();

  // 4) Calentar cache y medir CON índice
  await q(sql, [target.email]);
  const planCon = await explain(sql, [target.email]);
  const metricsCon = parsePlan(planCon);

  divider();
  console.log(pc.bold("Plan CON índice:"));
  console.log();
  for (const line of planCon) console.log(line);
  console.log();

  // 5) Comparación lado a lado
  divider();
  console.log(pc.bold("Comparación lado a lado:"));
  console.log();

  const opColor = (op: string) =>
    op === "Seq Scan" ? pc.red(op) : pc.green(op);
  const ratio = (a: number | null, b: number | null) => {
    if (a === null || b === null || b === 0) return "—";
    return (a / b).toFixed(1) + "×";
  };

  console.log(
    pc.bold(
      "  Métrica".padEnd(28) +
        "Sin índice".padEnd(18) +
        "Con índice".padEnd(18) +
        "Mejora"
    )
  );
  console.log(pc.dim("  " + "─".repeat(60)));

  console.log(
    "  " +
      "Tipo de operación".padEnd(26) +
      opColor(metricsSin.operation).padEnd(28) +
      opColor(metricsCon.operation).padEnd(28) +
      "—"
  );
  console.log(
    "  " +
      "Filas descartadas".padEnd(26) +
      String(metricsSin.rowsRemoved ?? 0).padEnd(18) +
      String(metricsCon.rowsRemoved ?? 0).padEnd(18) +
      "—"
  );
  console.log(
    "  " +
      "Páginas leídas".padEnd(26) +
      String(metricsSin.bufferPages ?? "—").padEnd(18) +
      String(metricsCon.bufferPages ?? "—").padEnd(18) +
      ratio(metricsSin.bufferPages, metricsCon.bufferPages) + " menos"
  );
  console.log(
    "  " +
      "Execution Time (ms)".padEnd(26) +
      (metricsSin.executionTimeMs?.toFixed(3) ?? "—").padEnd(18) +
      (metricsCon.executionTimeMs?.toFixed(3) ?? "—").padEnd(18) +
      ratio(metricsSin.executionTimeMs, metricsCon.executionTimeMs) + " más rápido"
  );

  console.log();
  divider();
  console.log(pc.bold("Qué cambió realmente:"));
  console.log();
  console.log(
    pc.yellow("  ❶ ") + "El plan ya no es " + pc.red("Seq Scan") + "."
  );
  console.log(
    "     Ahora dice " + pc.green("Index Scan using idx_customers_email") + "."
  );
  console.log(
    pc.dim("     Postgres bajó por el B-tree en ~3 saltos en vez de leer 119 páginas.")
  );
  console.log();
  console.log(
    pc.yellow("  ❷ ") + "Las filas descartadas ahora son 0."
  );
  console.log(
    pc.dim("     No hay descarte porque el índice apunta directo al CTID correcto.")
  );
  console.log();
  console.log(
    pc.yellow("  ❸ ") + "Buffers cayó de ~119 páginas a unas pocas."
  );
  console.log(
    pc.dim("     Esa es la métrica que ESCALA. A 1M filas, el Seq Scan tocaría")
  );
  console.log(
    pc.dim("     ~12,000 páginas (96 MB). El Index Scan seguiría tocando ~4.")
  );
  console.log();
  console.log(
    pc.yellow("  ❹ ") + "El Execution Time bajó significativamente."
  );
  console.log(
    pc.dim("     A 10K filas la diferencia absoluta es modesta. A 1M+ se vuelve")
  );
  console.log(
    pc.dim("     catastrófica para el Seq Scan. El plan que viste hoy es el patrón")
  );
  console.log(
    pc.dim("     que decide si tu app aguanta el crecimiento o se cae.")
  );
  console.log();

  // 6) Bonus: mostrar todos los índices ahora existentes
  divider();
  const indexes = await q<{ indexname: string; size: string }>(
    `SELECT i.indexname,
            pg_size_pretty(pg_relation_size(c.oid)) AS size
     FROM pg_indexes i
     JOIN pg_class c ON c.relname = i.indexname
     WHERE i.tablename = 'customers'
     ORDER BY i.indexname`
  );
  console.log(pc.bold(`Índices ahora en customers (${indexes.length}):`));
  for (const idx of indexes) {
    console.log(`  • ${pc.cyan(idx.indexname)} — ${pc.dim(idx.size)}`);
  }
  console.log();
  console.log(
    pc.bold("Siguiente paso: ") + pc.cyan("npm run query:gotchas")
  );
  console.log(
    pc.dim(
      "  Donde el índice que acabamos de crear NO va a servir (la parte\n" +
      "  que enseña de verdad)."
    )
  );
}

main()
  .catch((err) => {
    console.error(pc.red("✗ Error:"), err.message);
    process.exit(1);
  })
  .finally(() => pool.end());
