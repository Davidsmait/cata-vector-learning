---
session: 3
focus: pgvector + HNSW — guardar vectores en Postgres y buscar
started: 2026-08-22
status: Paso 1 completado (guardar + buscar sin índice)
---

# Sesión 3 — pgvector + HNSW

Construida línea por línea con David (él tecleó todo en Cursor, entendiendo cada pieza).
Archivo: `src/sesion-3-pgvector/01-guardar-y-buscar.ts` (alias `npm run s3:paso1`).

## Paso 1 — guardar vectores y buscar SIN índice ✓

Construido en bloques, cada uno corrido como checkpoint:
- Bloque 1: cargar el modelo con `pipeline('feature-extraction', 'Xenova/multilingual-e5-small')`.
- Bloque 2: `CREATE EXTENSION vector` + tabla `coffee_chunks(id, texto, embedding VECTOR(384))`.
- Bloque 3: helper `vec(prefijo, texto)` + `toPg` + insertar 7 lecciones (5 café + 2 distractoras).
- Bloque 4: búsqueda con `ORDER BY embedding <=> $1` (operador `<=>` = distancia coseno).
- Bloque 5: EXPLAIN → Seq Scan (aún sin índice).

## Conceptos que aterrizaron (Q&A)

- `[confusión→aha]` `@xenova/transformers` = librería (el "reproductor"); el modelo vive en
  Hugging Face y se descarga (~120MB) la 1a vez (el "disco"). El nombre Xenova se repite (misma
  persona hizo la librería JS y publicó los modelos).
- `[aha]` `pipeline(tarea, modelo)`: 1er arg = tarea (enum: feature-extraction, translation,
  summarization, text-generation...); 2º = modelo. La "G" de Cata futura usará text-generation.
- `[aha]` Qué es un modelo por dentro: arquitectura fija + millones de PESOS (números). La
  inteligencia vive en los pesos; salen del entrenamiento y quedan congelados. Usar = inferencia
  (≠ entrenar). Las 384 dims son propiedad fija de la arquitectura.
- `[aha]` Prefijos `query:`/`passage:` NO son inventados: son del modelo e5, documentados en su
  model card. Otros modelos difieren (MiniLM sin prefijos, BGE con instrucción, OpenAI ninguno).
  → habilidad: leer la model card antes de usar un modelo.
- `[aha]` `db.ts` = conexión compartida. `pool` = flotilla de conexiones reusables (default 10,
  tiene límite; si todas ocupadas, la query espera). `pool.end()` cierra o el proceso se cuelga.
- `[aha]` Guardar texto Y embedding: el embedding sirve para BUSCAR, el texto para MOSTRAR (un
  embedding no se puede revertir a texto). Van en la misma fila.
- `[aha]` `toPg`: array de números → UN string "[n,n,...]" (no array de strings). El driver `pg`
  no traduce un array de JS al tipo VECTOR; pgvector acepta ese formato de texto.
- `[decisión]` El autocompletado de Cursor es predicción, no verdad — no aceptarlo a ciegas.
  Regla real de orden: una `const` debe declararse antes de usarse; una `function` se eleva (hoisting).

## Resultado honesto de la búsqueda (idea-post fuerte)

Pregunta "por qué mi espresso sale ácido":
  1. 0.890 espresso AMARGO/sobreextraído  ← quedó #1
  2. 0.872 espresso AGRIO/subextraído     ← era la respuesta real (agrio = ácido)
  3. 0.837 ácido sulfúrico                ← distractor colado

- `[idea-post]` Los embeddings capturan el TEMA muy bien, pero son flojos con la POLARIDAD fina:
  ácido vs amargo son opuestos pero del mismo tema → casi empatan. Por eso existe el reranking
  (fuera de alcance en la 1a rebanada del PRD, pero ahora David entiende POR QUÉ).
- `[idea-post]` "ácido sulfúrico" se cuela por la palabra compartida + compresión de e5. Mismo
  fenómeno de la Sesión 2, ahora dentro de Postgres.

## Pendiente
- Paso 2: crear índice HNSW y ver el plan cambiar (Seq Scan → Index Scan).
- Paso 3: recall vs velocidad (exacto vs aproximado).
- Paso 4: tunear m / ef_construction.
