//  Sesión 3 — Guardar y buscar en pgvector. Paso 1
import { pool, q } from "../lib/db.ts";
import { pipeline } from "@xenova/transformers";

const embed = await pipeline(
  "feature-extraction",
  "Xenova/multilingual-e5-small",
);

async function vec(
  prefijo: "query" | "passage",
  texto: string,
): Promise<number[]> {
  const salida = await embed(`${prefijo}: ${texto}`, {
    pooling: "mean",
    normalize: true,
  });
  return Array.from(salida.data as Float32Array);
}

const toPg = (v: number[]) => `[${v.join(",")}]`;

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

const lecciones = [
  "Cuando el espresso queda subextraído sabe agrio o avinagrado: molido muy grueso, agua poco caliente o extracción corta.",
  "Si el espresso sale amargo suele estar sobreextraído: molido muy fino o temperatura muy alta que quema los compuestos.",
  "La microespuma se logra calentando la leche a unos 60 grados e incorporando aire con la varilla del vaporizador.",
  "El nivel de tueste cambia el perfil: los claros resaltan acidez frutal, los oscuros dan notas a chocolate y cuerpo.",
  "La proporción de café y agua define la intensidad: un espresso ronda 1:2, un filtrado 1:16.",
  "Los gatos domésticos duermen unas dieciséis horas al día en lugares cálidos y elevados.",
  "El ácido sulfúrico es un compuesto corrosivo usado en la industria química para tratar metales.",
];

for (const leccion of lecciones) {
  const embedding = toPg(await vec("passage", leccion));
  await q(`INSERT INTO coffee_chunks (texto, embedding) VALUES ($1, $2)`, [
    leccion,
    embedding,
  ]);
}

console.log(`✓ ${lecciones.length} lecciones insertadas`);
await pool.end();
