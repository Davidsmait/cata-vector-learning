// npm run query:gotchas
//
// Demo 3 — Tres casos donde el índice se ignora. Para cada caso mostramos
// la query "buena" (usa el índice) y la "mala" (vuelve a Seq Scan).
//
// Casos:
//   A. LIKE con wildcard al inicio
//   B. Función aplicada sobre la columna indexada
//   C. Índice compuesto consultado por la columna equivocada (leftmost prefix)

import pc from "picocolors";
import { pool, q, explain } from "../lib/db.ts";

function box(title: string) {
  const line = "═".repeat(60);
  console.log();
  console.log(pc.bold(pc.yellow(line)));
  console.log(pc.bold(pc.yellow("  " + title)));
  console.log(pc.bold(pc.yellow(line)));
  console.log();
}

function divider() {
  console.log(pc.dim("─".repeat(60)));
}

function summarize(planLines: string[]) {
  const text = planLines.join("\n");
  let op = "Other";
  for (const candidate of ["Index Only Scan", "Index Scan", "Bitmap Heap Scan", "Seq Scan"]) {
    if (text.includes(candidate)) {
      op = candidate;
      break;
    }
  }
  const rows = text.match(/Rows Removed by Filter:\s*(\d+)/i)?.[1] ?? null;
  const buf = text.match(/Buffers:\s*shared\s*hit=(\d+)/i)?.[1] ?? null;
  const exec = text.match(/Execution Time:\s*([\d.]+)\s*ms/i)?.[1] ?? null;
  return { op, rows, buf, exec };
}

async function showQuery(label: string, sql: string, params: unknown[]) {
  console.log(pc.bold(label));
  console.log(pc.cyan("  " + sql));
  if (params.length > 0) {
    console.log(pc.dim("  Params: " + JSON.stringify(params)));
  }

  // Warm cache para que ambas mediciones sean comparables
  await q(sql, params);
  const plan = await explain(sql, params);
  const s = summarize(plan);

  // Imprime el primer line del plan (la operación)
  console.log(pc.dim("  Plan top: ") + plan[0]);
  const opColor = s.op === "Seq Scan" ? pc.red : pc.green;
  console.log(
    `  → ${opColor(s.op)}` +
      (s.rows ? `  · Rows Removed: ${s.rows}` : "") +
      (s.buf ? `  · Buffers: ${s.buf} páginas` : "") +
      (s.exec ? `  · ${s.exec} ms` : "")
  );
  console.log();
  return s;
}

// ─────────────────────────────────────────────────────────────────────────
// CASO A: LIKE con wildcard al inicio
// ─────────────────────────────────────────────────────────────────────────
async function caseA() {
  box("CASO A — LIKE con wildcard al inicio");

  console.log(pc.dim("Setup: creando índice B-tree sobre `name`..."));
  await q("DROP INDEX IF EXISTS idx_customers_name");
  await q("CREATE INDEX idx_customers_name ON customers(name)");
  await q("ANALYZE customers");
  console.log(pc.green("  ✓ idx_customers_name creado"));
  console.log();

  divider();
  const good = await showQuery(
    'Query "buena" (prefijo conocido) — debería usar el índice:',
    "SELECT id, name FROM customers WHERE name LIKE $1 LIMIT 50",
    ["Mar%"]
  );

  const bad = await showQuery(
    'Query "mala" (wildcard al inicio) — Postgres ignora el índice:',
    "SELECT id, name FROM customers WHERE name LIKE $1 LIMIT 50",
    ["%mar%"]
  );

  divider();
  console.log(pc.bold("Por qué:"));
  console.log(
    pc.dim(
      "  El B-tree está ordenado alfabéticamente. Todos los 'Mar...' están\n" +
      "  contiguos en el índice — saltar a ellos es trivial. Pero los nombres\n" +
      "  que contienen 'mar' en cualquier posición están dispersos por todo\n" +
      "  el índice (Mar/í/a, Mar/tín, Eli/mar, Lan/d/mar/k). El orden no\n" +
      "  ayuda. Postgres tira la toalla y hace Seq Scan."
    )
  );
  console.log();
  console.log(pc.bold("Fix si necesitas búsqueda 'contiene':"));
  console.log(
    pc.dim(
      "  Otro tipo de índice: GIN con extensión pg_trgm. No B-tree.\n" +
      "  Lo veremos en otra sesión si te interesa."
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────
// CASO B: Función sobre la columna indexada
// ─────────────────────────────────────────────────────────────────────────
async function caseB() {
  box("CASO B — Función aplicada sobre la columna indexada");

  console.log(pc.dim("Setup: garantizando idx_customers_email (del Demo 2)..."));
  await q("DROP INDEX IF EXISTS idx_customers_email");
  await q("CREATE INDEX idx_customers_email ON customers(email)");
  await q("DROP INDEX IF EXISTS idx_customers_lower_email");
  await q("ANALYZE customers");
  console.log(pc.green("  ✓ idx_customers_email creado, sin índice funcional"));
  console.log();

  const [target] = await q<{ email: string }>(
    "SELECT email FROM customers ORDER BY id OFFSET 5000 LIMIT 1"
  );

  divider();
  const good = await showQuery(
    'Query "buena" (email tal cual) — usa el índice:',
    "SELECT id, name FROM customers WHERE email = $1",
    [target.email]
  );

  const bad = await showQuery(
    'Query "mala" (LOWER aplicado al email) — ignora el índice:',
    "SELECT id, name FROM customers WHERE LOWER(email) = $1",
    [target.email.toLowerCase()]
  );

  divider();
  console.log(pc.bold("Por qué:"));
  console.log(
    pc.dim(
      "  El índice guarda emails tal como se insertaron. La query pide\n" +
      "  'filas donde LOWER(email) = X'. Para usar el índice, Postgres\n" +
      "  tendría que aplicar LOWER a cada entrada — al mismo costo que\n" +
      "  recorrer la tabla. Mejor ni se molesta."
    )
  );
  console.log();

  // FIX: crear un índice FUNCIONAL
  console.log(pc.bold("Fix: índice funcional sobre LOWER(email)"));
  console.log(pc.cyan("  CREATE INDEX idx_customers_lower_email ON customers(LOWER(email));"));
  await q("CREATE INDEX idx_customers_lower_email ON customers(LOWER(email))");
  await q("ANALYZE customers");
  console.log(pc.green("  ✓ índice funcional creado"));
  console.log();

  const fixed = await showQuery(
    'Misma query "mala" — ahora SÍ usa el índice funcional:',
    "SELECT id, name FROM customers WHERE LOWER(email) = $1",
    [target.email.toLowerCase()]
  );

  console.log(pc.dim(
    "  Moraleja: cuando una columna se consulta SIEMPRE con LOWER (o cualquier\n" +
    "  otra función), conviene tener un índice que la guarde ya transformada."
  ));
}

// ─────────────────────────────────────────────────────────────────────────
// CASO C: Índice compuesto y regla del prefijo izquierdo
// ─────────────────────────────────────────────────────────────────────────
async function caseC() {
  box("CASO C — Índice compuesto, regla del prefijo izquierdo");

  console.log(pc.dim("Setup: creando índice compuesto (city, loyalty_points)..."));
  await q("DROP INDEX IF EXISTS idx_city_points");
  await q("CREATE INDEX idx_city_points ON customers(city, loyalty_points)");
  await q("ANALYZE customers");
  console.log(pc.green("  ✓ idx_city_points creado"));
  console.log();

  divider();
  await showQuery(
    'Query 1: filtra por city sola — USA el índice (prefijo izquierdo cumplido):',
    "SELECT id, name FROM customers WHERE city = $1",
    ["Ciudad de México"]
  );

  await showQuery(
    'Query 2: filtra por city + loyalty_points — USA el índice (prefijo completo):',
    "SELECT id, name FROM customers WHERE city = $1 AND loyalty_points > $2",
    ["Ciudad de México", 100]
  );

  await showQuery(
    'Query 3: filtra solo por loyalty_points — IGNORA el índice (rompe el prefijo):',
    "SELECT id, name FROM customers WHERE loyalty_points > $1",
    [4000]
  );

  divider();
  console.log(pc.bold("Por qué:"));
  console.log(
    pc.dim(
      "  El índice está ordenado PRIMERO por city, DESPUÉS por loyalty_points\n" +
      "  (solo dentro de cada ciudad). Es como una guía telefónica organizada\n" +
      "  por ciudad y dentro de cada ciudad por nombre.\n" +
      "    • Conoces la ciudad → vas directo a esa sección. (Query 1, 2)\n" +
      "    • Solo conoces el nombre → tienes que ir sección por sección.\n" +
      "      El índice no te da ningún atajo. (Query 3)"
    )
  );
  console.log();
  console.log(pc.bold("Fix si tu app filtra mucho solo por loyalty_points:"));
  console.log(
    pc.dim(
      "  Crear un índice separado: CREATE INDEX ON customers(loyalty_points).\n" +
      "  No reusar el compuesto."
    )
  );
}

async function main() {
  box("DEMO 3 — Tres casos donde el índice se ignora");

  await caseA();
  await caseB();
  await caseC();

  console.log();
  box("Resumen final de Demo 3");
  console.log(pc.bold("Los 3 patrones que rompen un B-tree:"));
  console.log();
  console.log(
    pc.yellow("  ❶ ") +
      pc.bold("Transformaste la columna antes de comparar.")
  );
  console.log(
    pc.dim("     LIKE '%x%', LOWER(col), col::int, etc. → el orden del índice no aplica.")
  );
  console.log();
  console.log(
    pc.yellow("  ❷ ") +
      pc.bold("Estás violando el orden del índice compuesto.")
  );
  console.log(
    pc.dim("     CREATE INDEX (a, b) — solo sirve si filtras por 'a' primero.")
  );
  console.log();
  console.log(
    pc.yellow("  ❸ ") +
      pc.bold("El índice está ordenado para un caso, tu query pide otro.")
  );
  console.log(
    pc.dim("     La regla universal: el índice solo ayuda cuando tu query")
  );
  console.log(
    pc.dim("     respeta el orden con el que el índice fue construido.")
  );
  console.log();
  console.log(
    pc.bold("Hábito clave: ") +
      pc.dim("siempre verifica con EXPLAIN ANALYZE si el plan dice")
  );
  console.log(
    pc.dim("'Index Cond' (índice usado) o 'Filter' (índice ignorado). Esa palabra")
  );
  console.log(
    pc.dim("es la diferencia entre 0.01 ms y 500 ms en producción.")
  );
}

main()
  .catch((err) => {
    console.error(pc.red("✗ Error:"), err.message);
    process.exit(1);
  })
  .finally(() => pool.end());
