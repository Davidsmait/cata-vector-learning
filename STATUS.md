# Reporte de avance: cata-vector-learning

> Estado vivo del proyecto. Actualizado al cerrar cada sesión.
> Última actualización: Sesión 1 en curso (~85% completada).

## TL;DR

Pausé el diseño del spec de Cata para construir un sandbox separado donde estoy aprendiendo desde cero los fundamentos técnicos que estaba aceptando a ciegas: índices SQL, embeddings, pgvector, HNSW, métricas de distancia. Cuando termine las 5 sesiones, regreso al spec con criterio propio para cuestionar las recomendaciones técnicas con base.

## Por qué este detour

Mientras armábamos el spec, me di cuenta de que estaba dando OK a decisiones técnicas (pgvector, HNSW, contrastive learning, distancia coseno, 384 vs 1024 dimensiones, parámetros `m` y `ef_construction`) que no entendía. No quiero un Cata que funcione porque le copié el stack a un blog post de Medium — quiero entender por qué cada pieza es la correcta para mi caso.

## Estrategia

5 sesiones de 1-2 horas, cada una con código ejecutable, mediciones reales en consola, y notas crudas en vivo. Sandbox local separado del repo de davidblog para no contaminar el proyecto principal.

| # | Sesión | Estado |
|---|--------|--------|
| 1 | Índices clásicos (B-tree) | En curso (~85% terminada) |
| 2 | Embeddings desde cero | Pendiente |
| 3 | pgvector + HNSW | Pendiente |
| 4 | Operator classes y métricas | Pendiente |
| 5 | Síntesis + blog post | Pendiente |

## Stack del sandbox

- **Repo**: github.com/Davidsmait/cata-vector-learning (público, MIT, learning in public)
- **Postgres 16 + pgvector** vía Docker (corre en OrbStack en mi Mac)
- **Node 22 + TypeScript + tsx** (mismo stack que uso normalmente)
- **Embeddings**: Transformers.js local con `Xenova/all-MiniLM-L6-v2` (384 dims) — elegí esto sobre Voyage AI por cero fricción de setup y dimensión más fácil de visualizar geométricamente; Cata producción puede cambiar a Voyage después sin que se rompa lo aprendido
- **Datos de prueba**: 10,000 clientes ficticios con @faker-js/faker
- **Cero servicios pagos**, todo corre local

## Progreso técnico real (Sesión 1)

- ✓ Setup completo: Docker + Postgres + extensión vector verificada
- ✓ Tabla `customers` seedeada con 10K filas reproducibles (seed=42)
- ✓ Demo 1: Seq Scan sobre la tabla sin índice. **0.484 ms, 119 páginas leídas (~952 KB) para encontrar 1 fila de ~50 bytes**. Ratio de desperdicio ~19,000×.
- ✓ Demo 2: B-tree creado, misma query. **0.009 ms, 3 páginas (~24 KB)**. Speedup 55× en wall-clock, 40× en páginas leídas.
- ⏳ Demo 3 (gotchas: LIKE wildcard, función sobre columna, leftmost prefix violation) — script listo, falta correr.
- ⏳ Cierre de Sesión 1.

## Lo que ya entiendo bien

- **Heap vs índice como dos archivos físicos separados.** El índice guarda `(valor, CTID)` donde CTID = `(page, offset)`. Para `SELECT *`, Postgres siempre termina visitando el heap.
- **Diferencia entre `Filter` y `Index Cond`** en `EXPLAIN ANALYZE`. La huella exacta de si el índice está funcionando o se está ignorando.
- **Crecimiento logarítmico** del B-tree. Por qué a 10M+ filas es la única forma viable.
- **System catalog de Postgres** (`pg_class`, `pg_index`, `pg_indexes`, `pg_attribute`). Dos capas: tablas crudas singulares vs vistas amigables plurales.
- **4 casos donde el índice se ignora**: LIKE con wildcard inicial, función aplicada sobre la columna, leftmost prefix violation en índices compuestos, type mismatch.

## Lo que entiendo parcialmente (necesita Sesión 2-3)

- **Qué es un embedding**: tengo las analogías (RGB para significados, GPS para meaning, coordenadas en un espacio de 384 dimensiones), pero no va a aterrizar 100% hasta que vea los 384 números reales en consola.
- **Contrastive learning**: entiendo el modelo de ligas/resortes y la fuente de los pares de entrenamiento. Detalle técnico aún difuso.
- **Cosine vs euclidean**: tengo la intuición geométrica (dirección vs distancia entre puntas de flechas). Falta la fórmula formal y casos prácticos.

## Implicaciones para el spec de Cata cuando regrese

Cosas que voy a cuestionar con criterio en vez de aceptar a ciegas:

1. **¿Por qué pgvector y no otra opción?** Quiero entender la decisión, no solo asentir.
2. **Dimensiones del modelo**: las implicaciones de costo y almacenamiento de 384 vs 1024 vs 1536 las puedo evaluar yo ahora.
3. **Métrica de distancia para mi corpus específico**: cosine es default pero quiero ver con mis lecciones reales si euclidean o IP cambian el ranking.
4. **Parámetros HNSW (`m`, `ef_construction`)**: los voy a tocar yo mismo en Sesión 3 antes de aceptarlos como números mágicos. Quiero saber qué trade-off recall-vs-speed me da cada uno.
5. **Estrategia de chunking de las lecciones**: relacionado con el tamaño de los vectores y cómo afecta similarity.

## Estimado de tiempo para regresar al spec

- Sesión 1: cierre hoy o próxima sesión corta (1 hora)
- Sesiones 2-4: 1-2 horas cada una
- Sesión 5 (síntesis + blog post): 1-2 horas
- **Total ~5-10 horas distribuidas en las próximas 1-2 semanas**

## Recursos

- **Repo del sandbox**: github.com/Davidsmait/cata-vector-learning
- **Notas crudas en vivo**: [`notes/sesion-1-indices-btree.md`](notes/sesion-1-indices-btree.md) dentro de este repo (capturan momentos de confusión, analogías que funcionaron, ideas para el blog post final)
- **Blog post final**: cuando termine, va a vivir como borrador en `davidblog/src/content/posts/` con título tentativo *"Cómo aprendí vector databases construyendo Cata"*

---

> Pa que cuando regrese al chat del spec haya contexto pelado: estoy haciendo el legwork. Cuando vuelva, asume que mi nivel subió y que voy a hacer preguntas técnicas más profundas.
