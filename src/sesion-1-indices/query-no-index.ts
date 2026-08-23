// npm run query:no-index
//
// Demo 1: query con WHERE sobre una columna SIN índice.
// Esperado: Seq Scan, Postgres revisa las 10K filas para encontrar 1.

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

async function main() {
  box("DEMO 1 — Query SIN índice (Seq Scan)");

  // 1) Estado de la tabla antes del experimento
  const [{ count }] = await q<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM customers"
  );
  const indexes = await q<{ indexname: string; indexdef: string }>(
    `SELECT indexname, indexdef FROM pg_indexes
     WHERE tablename = 'customers' ORDER BY indexname`
  );

  console.log();
  console.log(pc.bold("Estado de la tabla:"));
  console.log(`  Filas en customers: ${pc.cyan(Number(count).toLocaleString())}`);
  console.log(`  Índices existentes: ${pc.cyan(indexes.length.toString())}`);
  for (const idx of indexes) {
    console.log(pc.dim(`    • ${idx.indexname}`));
    console.log(pc.dim(`      ${idx.indexdef}`));
  }
  console.log();
  console.log(
    pc.dim(
      "  El único índice es el del PRIMARY KEY (id). La columna `email`\n" +
      "  NO tiene índice. Por eso un WHERE por email va a doler."
    )
  );
  console.log();

  // 2) Tomamos un cliente "del medio" para que sea representativo
  const [target] = await q<{ id: number; email: string; name: string }>(
    "SELECT id, email, name FROM customers ORDER BY id OFFSET 5000 LIMIT 1"
  );

  console.log(pc.bold("Cliente objetivo (escogido del medio de la tabla):"));
  console.log(`  id:    ${pc.cyan(String(target.id))}`);
  console.log(`  name:  ${pc.cyan(target.name)}`);
  console.log(`  email: ${pc.cyan(target.email)}`);
  console.log();

  // 3) Query que vamos a analizar
  const sql = "SELECT id, name, city FROM customers WHERE email = $1";
  console.log(pc.bold("Query a analizar:"));
  console.log(pc.cyan("  " + sql));
  console.log();

  // 4) Calentamos el cache para que las dos mediciones (hoy y la de Demo 2)
  //    sean comparables. Si no, la primera corrida paga el costo de leer
  //    desde disco y la segunda lee del cache — sería trampa.
  await q(sql, [target.email]);

  // 5) EXPLAIN ANALYZE de verdad — ejecuta la query con instrumentación.
  divider();
  console.log(pc.bold("EXPLAIN (ANALYZE, BUFFERS):"));
  console.log();
  const plan = await explain(sql, [target.email]);
  for (const line of plan) {
    console.log(line);
  }
  console.log();

  // 6) Extraemos métricas clave del plan para mostrarlas grandes
  const planText = plan.join("\n");
  const seqScan = /Seq Scan/i.test(planText);
  const rowsRemovedMatch = planText.match(/Rows Removed by Filter:\s*(\d+)/i);
  const execTimeMatch = planText.match(/Execution Time:\s*([\d.]+)\s*ms/i);
  const planTimeMatch = planText.match(/Planning Time:\s*([\d.]+)\s*ms/i);
  const buffersMatch = planText.match(/Buffers:\s*shared\s*hit=(\d+)/i);

  divider();
  console.log(pc.bold("Métricas clave extraídas del plan:"));
  console.log(
    `  Tipo de operación:        ${seqScan ? pc.red("Seq Scan") : pc.green("Index Scan")}`
  );
  if (rowsRemovedMatch) {
    console.log(
      `  Filas descartadas:        ${pc.red(Number(rowsRemovedMatch[1]).toLocaleString())} (de 10,000)`
    );
  }
  if (buffersMatch) {
    const pages = Number(buffersMatch[1]);
    const kb = (pages * 8).toLocaleString();
    console.log(`  Páginas leídas:           ${pc.red(pages.toString())} (~${kb} KB)`);
  }
  if (planTimeMatch) {
    console.log(`  Planning Time:            ${pc.dim(planTimeMatch[1] + " ms")}`);
  }
  if (execTimeMatch) {
    console.log(
      `  Execution Time:           ${pc.red(pc.bold(execTimeMatch[1] + " ms"))}`
    );
  }
  console.log();

  // 7) Explicación línea por línea
  divider();
  console.log(pc.bold("Lo que está pasando aquí (línea por línea):"));
  console.log();
  console.log(
    pc.yellow("  ❶ ") +
      pc.bold("Seq Scan on customers") +
      " — Postgres lee la tabla página por página."
  );
  console.log(
    pc.dim("     No hay atajo. Recorre las 10K filas en orden físico.")
  );
  console.log();
  console.log(
    pc.yellow("  ❷ ") +
      pc.bold("Filter: (email = '...')") +
      " — condición que se aplica a cada fila."
  );
  console.log(
    pc.dim("     Para cada una decide si la mantiene o la descarta.")
  );
  console.log();
  console.log(
    pc.yellow("  ❸ ") +
      pc.bold("Rows Removed by Filter: 9999") +
      " — la prueba del dolor."
  );
  console.log(
    pc.dim("     Visitó 10,000 filas, descartó 9,999. Solo una calzó.")
  );
  console.log();
  console.log(
    pc.yellow("  ❹ ") +
      pc.bold("Buffers: shared hit=N") +
      " — páginas de 8KB que leyó del cache."
  );
  console.log(
    pc.dim("     Recuerda: Postgres no lee fila por fila desde disco,")
  );
  console.log(pc.dim("     lee páginas. Cada página tiene decenas de filas."));
  console.log();
  console.log(
    pc.yellow("  ❺ ") +
      pc.bold("Execution Time") +
      " — tiempo real de wall-clock que tardó."
  );
  console.log(
    pc.dim("     Anótalo mentalmente. En la Demo 2 lo vamos a aplastar.")
  );
  console.log();

  divider();
  console.log(
    pc.bold("Siguiente paso: ") +
      pc.cyan("npm run query:with-index")
  );
  console.log(
    pc.dim(
      "  (Crea el índice B-tree en email, vuelve a correr la misma query,\n" +
      "  y comparamos los dos planes lado a lado.)"
    )
  );
}

main()
  .catch((err) => {
    console.error(pc.red("✗ Error:"), err.message);
    process.exit(1);
  })
  .finally(() => pool.end());
