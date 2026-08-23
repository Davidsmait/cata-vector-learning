// npm run db:ping
//
// Verifica que:
//   1. Podemos conectar a Postgres.
//   2. La extensión `vector` (pgvector) está disponible. La instalamos aquí
//      una vez para tenerla lista para Sesión 3, aunque Sesión 1 no la use.

import pc from "picocolors";
import { pool, q } from "../lib/db.ts";

async function main() {
  console.log(pc.dim("→ Conectando a Postgres..."));

  const [{ version }] = await q<{ version: string }>("SELECT version()");
  console.log(pc.green("✓"), "Conexión OK");
  console.log(pc.dim("  " + version.split(",")[0]));

  console.log(pc.dim("→ Creando extensión vector (si no existe)..."));
  await q("CREATE EXTENSION IF NOT EXISTS vector");

  const [{ extversion }] = await q<{ extversion: string }>(
    "SELECT extversion FROM pg_extension WHERE extname = 'vector'"
  );
  console.log(pc.green("✓"), `pgvector instalado (v${extversion})`);

  // Tamaño actual de la base — útil para ver cómo crece después de seedear.
  const [{ pretty_size }] = await q<{ pretty_size: string }>(
    "SELECT pg_size_pretty(pg_database_size(current_database())) AS pretty_size"
  );
  console.log(pc.dim(`  Tamaño actual de la base: ${pretty_size}`));

  console.log();
  console.log(pc.bold(pc.green("Todo listo para la Sesión 1.")));
}

main()
  .catch((err) => {
    console.error(pc.red("✗ Error:"), err.message);
    process.exit(1);
  })
  .finally(() => pool.end());
