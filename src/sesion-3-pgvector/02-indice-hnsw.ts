import { q } from "../lib/db";
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
