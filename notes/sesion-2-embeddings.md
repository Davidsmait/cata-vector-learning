---
session: 2
focus: Embeddings desde cero (ver los 384 números reales + coseno)
started: 2026-08-22
status: en progreso
---

# Sesión 2 — Embeddings desde cero

Retomada tras el repaso del 22-ago. Objetivo: dejar de entender embeddings "masomenos"
viéndolos con código real.

## Capturas en vivo

- `[decisión]` Modelo `Xenova/multilingual-e5-small` (no `all-MiniLM-L6-v2`). Motivo confirmado
  EN VIVO: MiniLM es inglés-céntrico y con español aplastó el contraste (A-B 0.551 vs A-C 0.422,
  casi sin separación). e5 multilingüe separa mucho mejor. Esto valida la decisión del PRD.

- `[output]` MiniLM, "mi espresso sale ácido" vs "mi café sabe agrio" = 0.551 ; vs "el gato
  duerme en el sofá" = 0.422. Contraste flojo → evidencia de por qué NO usar MiniLM para ES.

- `[confusión→aha]` Con e5 y frases de 4 palabras, "el ácido sulfúrico corroe el metal" GANÓ
  (0.841) por compartir la palabra rara "ácido". Lección: con poco contexto, una palabra rara
  compartida pesa demasiado. Las lecciones reales son párrafos → el significado domina.

- `[output]` e5 con pasajes tamaño-lección. Pregunta "por qué mi espresso sale ácido":
    1. 0.899  shot-acido    (la que responde, sin compartir casi palabras) ← gana
    2. 0.835  acido-quim    (comparte "ácido", pero es química) ← falso positivo de keyword
    3. 0.819  espuma-leche
    4. 0.754  gatos         (sin relación) ← último
  Buscar por significado funciona; una búsqueda por palabra pondría "ácido sulfúrico" arriba.

- `[modelo-mental]` (David) embedding = "convertir una cadena de texto en números dentro de una
  columna". Correcto salvo el matiz clave: números que capturan SIGNIFICADO (parecido→parecido).

- `[decisión]` e5 exige prefijos `query:` / `passage:` al embeber (peculiaridad ya anotada en el PRD).

- `[idea-post]` e5 comprime las similitudes a una banda alta (~0.75–0.90): interpretar por ORDEN
  relativo, no por el valor absoluto. Confunde a quien espera "0.9 = match, 0.2 = no".

- `[idea-post]` El caso "ácido sulfúrico" es el ejemplo perfecto de por qué existen hybrid search
  y reranking (que el PRD dejó fuera de la 1a rebanada, con razón).

## Pendiente
- Correr `npm run embed:demo` en la Mac de David (con internet real) y confirmar mismos números.
- Ver un embedding completo (los 384) impreso, no solo los primeros 8.
- Sesión 3: meter estos vectores a pgvector + índice HNSW y comparar búsqueda exacta vs aproximada.
