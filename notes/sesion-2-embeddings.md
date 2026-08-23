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

## Repaso de código + embeddings a fondo (22-ago, parte 2)

- `[aha]` David resumió bien la Sesión 2: texto → vectores, y dada una frase buscar el vector
  más cercano. Confirmó también que TANTO la pregunta como las lecciones se embeben, con el
  MISMO modelo (única forma de compararlos en el mismo espacio).
- `[confusión→aha]` `db.ts` = conexión compartida a Postgres (analogía "conmutador telefónico
  del edificio"): escribir la conexión UNA vez y reusarla en los 5 scripts. Principio de
  encapsular/DRY.
- `[confusión→aha]` Por qué el embedding corre SIN contenedor: `embeddings-demo.ts` no importa
  `db.ts`, corre en memoria. Analogía "dos mundos": la FÁBRICA de embeddings (modelo, en Node)
  vs la BODEGA (Postgres). Sesión 2 = solo la fábrica.
- `[confusión]` "¿por qué varían los números (0.8 vs 0.9)?" → Los embeddings son DETERMINISTAS:
  mismo texto + mismo modelo = mismos 384 números siempre, sin azar. 0.899 es "arriba de 0.8" Y
  "casi 0.9" a la vez. Un párrafo puntúa más que un fragmento de 4 palabras (más contexto).
- `[aha]` Coseno = medida de ALINEACIÓN (qué tanto apuntan al mismo lado), rango -1 a 1;
  "porcentaje de misma dirección"; nunca pasa de 1. Puntaje alto = significado más parecido =
  más relevante.
- `[aha]` Lecciones se embeben UNA vez y se GUARDAN; la pregunta se embebe en cada búsqueda.
  ¿Dónde guardarlas? En la base (pgvector). → Puente natural a Sesión 3.
- `[decisión]` Reorganización de `src/` por sesión para no confundir los dos mundos:
  `src/sesion-1-indices/` (requieren contenedor) y `src/sesion-2-embeddings/` (no). Los alias
  `npm run ...` no cambiaron. Reorg SIN commitear aún (pendiente que David revise el diff).
- `[idea-post]` La analogía "dos mundos / fábrica vs bodega" fue lo que por fin aclaró por qué
  generar embeddings no necesita base de datos. Va al post.
