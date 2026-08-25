//  Sesión 3 — Guardar y buscar en pgvector. Paso 1

import { pipeline } from "@xenova/transformers";

const embed = await pipeline(
  "feature-extraction",
  "Xenova/multilingual-e5-small",
);

console.log("pipeline cargado");
