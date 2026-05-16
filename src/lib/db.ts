// Pool de Postgres compartido entre todos los scripts.
// pg con TypeScript y ESM: el cliente sigue siendo CommonJS, así que importamos
// el default export.

import pg from "pg";
import "dotenv/config";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL no está definida. ¿Existe el archivo .env en la raíz?"
  );
}

export const pool = new pg.Pool({ connectionString });

// Pequeño helper: ejecuta una query y devuelve solo las filas.
export async function q<T extends pg.QueryResultRow = pg.QueryResultRow>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const res = await pool.query<T>(sql, params as never);
  return res.rows;
}

// Helper para imprimir EXPLAIN ANALYZE bonito. Es lo que veremos toda la sesión.
export async function explain(sql: string, params: unknown[] = []): Promise<string[]> {
  const res = await pool.query(
    `EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) ${sql}`,
    params as never
  );
  // Cada fila viene como { "QUERY PLAN": "..." }
  return res.rows.map((r) => r["QUERY PLAN"] as string);
}
