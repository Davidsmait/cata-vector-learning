import { pool, q } from "../lib/db";
import { toPg, vec } from "../lib/helpers";

const vq = toPg(await vec("query", "por qué mi espresso sale ácido"));

console.log("✓ vector de la pregunta listo");

await q("DROP INDEX IF EXISTS coffee_chunks_hnsw");
await q(`
  CREATE INDEX coffee_chunks_hnsw
    ON coffee_chunks
    USING hnsw (embedding vector_cosine_ops)
`);
console.log("✓ índice HNSW creado");

const sql = `SELECT id FROM coffee_chunks ORDER BY embedding <=> $1 LIMIT 3`;

const client = await pool.connect(); // ← UNA sola conexión, fíjate por qué abajo

const antes = await client.query(`EXPLAIN ${sql}`, [vq]);
console.log("\n── Planner libre (7 filas) ──");
antes.rows.forEach((r) => console.log(r["QUERY PLAN"]));

await client.query("SET enable_seqscan = off");

const despues = await client.query(`EXPLAIN ${sql}`, [vq]);
console.log("\n── Seq Scan prohibido ──");
despues.rows.forEach((r) => console.log(r["QUERY PLAN"]));

client.release();
await pool.end();
