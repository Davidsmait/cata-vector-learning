//  Sesión 3 — Guardar y buscar en pgvector. Paso 1
import { pool, q } from "../lib/db.ts";
import { pipeline } from "@xenova/transformers";

const embed = await pipeline(
  "feature-extraction",
  "Xenova/multilingual-e5-small",
);

console.log("pipeline cargado");

// ── Conectar a Postgres y crear la tabla ──
await q("CREATE EXTENSION IF NOT EXISTS vector");

await q("DROP TABLE IF EXISTS coffee_chunks");

await q(`
  CREATE TABLE coffee_chunks (
    id        SERIAL PRIMARY KEY,
    texto     TEXT NOT NULL,
    embedding VECTOR(384) NOT NULL
  )
`);

console.log("✓ tabla coffee_chunks creada");

await pool.end();
