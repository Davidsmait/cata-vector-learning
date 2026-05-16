---
session: 1
focus: Índices clásicos (B-tree)
started: 2026-05-16
status: en progreso
---

# Sesión 1 — Índices clásicos (B-tree)

Notas en vivo. Cada entrada se etiqueta para que al final del proyecto sea fácil filtrar qué va al blog post.

Convenciones de tags:

- `[decisión]` — elección técnica + por qué se eligió eso y no la alternativa
- `[analogía]` — modelo conceptual que funcionó para aterrizar una idea
- `[modelo-mental]` — intuición que trajo David antes de ver la respuesta real
- `[confusión]` — pausa o pregunta natural que pide aclaración
- `[output]` — salida literal que vale la pena pegar (EXPLAIN ANALYZE, errores, etc.)
- `[pregunta-abierta]` — algo que surge ahora pero se resuelve en una sesión futura
- `[idea-post]` — momento que merece ser su propio sidebar / sección en el post final

---

## Capturas en vivo

- `[decisión]` **Postgres 16 vía imagen oficial `pgvector/pgvector:pg16`** (no `postgres:16` + Dockerfile custom). La imagen oficial trae la extensión precompilada, cero pasos extra. Sufijo `:pg16` porque es la versión que Supabase usa por default — lo que aprendemos aquí se traslada 1:1 a Cata en producción.

- `[decisión]` **Puerto 5433 (no 5432 default)** para no chocar con un Postgres/Supabase local que David pueda tener corriendo. Decisión de "buen vecino" en el host.

- `[decisión]` **Embeddings con Transformers.js, no Voyage AI**. Tres razones: (1) cero fricción — sin API key, sin facturación; (2) vectores de 384 dimensiones más fáciles de visualizar geométricamente que 1024 de Voyage; (3) Cata en producción puede cambiar a Voyage después sin que se rompa nada de lo aprendido aquí.

- `[decisión]` **OrbStack en lugar de Docker Desktop** en el Mac de David. Compatible 100% con `docker compose` estándar, sin sintaxis ni flags especiales. Más liviano en RAM.

- `[analogía]` **B-tree = índice alfabético al final de un libro de cocina.** Te permite saltar a la página donde está "tiramisu" sin leer el libro entero. Si no hay índice, lees página por página hasta encontrar la receta. (Por confirmar cuando veamos el primer EXPLAIN ANALYZE.)

- `[analogía]` **pgvector = "PostGIS pero para geometría semántica".** PostGIS agrega tipos geográficos (puntos, polígonos) y operaciones (distancia, intersección) a Postgres. pgvector agrega tipos vectoriales y operaciones (distancia coseno, producto interno) a Postgres. Misma forma estructural. Esta analogía aterrizó.

- `[modelo-mental]` Cuando le pregunté qué creía que pasaba si haces `SELECT WHERE email = 'x'` sin índice en una tabla grande, David respondió: **"¿va a buscar registro por registro?"**. Modelo mental correcto a la primera. Solo le faltaba el matiz de que Postgres lee en **páginas de 8KB**, no fila a fila literal. Esto refleja que la audiencia mid-level del blog post probablemente ya intuye lo esencial — el post no necesita sobre-explicar la base, puede confiar en que el lector llega con la pieza correcta.

- `[confusión]` Después de levantar Docker, David pausó para preguntar **"¿qué es pgvector y por qué `:pg16`?"**. Pregunta natural y muy bloggeable.

- `[idea-post]` Sidebar en el post final: **"Por qué la imagen Docker importa más de lo que parece"** — diferenciar entre la extensión (código C que extiende Postgres) y la imagen (binarios precompilados listos en un container). Es el tipo de detalle que la gente "se salta" en tutoriales y después no entiende por qué su `CREATE EXTENSION` falla.

- `[confusión]` Pausa estratégica de David: **"¿deberíamos empezar el blog post ya?"**. Decisión que tomamos juntos: capturar notas crudas ahora, redactar el post solo en la sesión final. Razón: el arco narrativo del post solo se conoce viendo el final (HNSW puede reframear qué tan central es el B-tree); escribir prosa estructurada drena energía de aprender; los mejores momentos del post son los inesperados (este sidebar mismo), y comprometerse a una estructura temprano los expulsa.

- `[confusión]` **EL gran agujero conceptual**: David dijo literalmente "entiendo que sea un array de números pero no veo para qué ni cómo se conectan". También: "nunca había escuchado coseno, euclidiano fuera del día de hoy". Esta es **la pregunta más honesta** del proyecto. Captura el punto exacto donde un lector mid-level pierde el hilo en cualquier tutorial de vector DBs.

- `[idea-post]` **Probablemente el hook central del post**: una sección entera tipo "¿Por qué un array de 384 números puede representar el significado de un texto?". No es decoración — es la pregunta que justifica que el artículo exista. Si el post no responde esto bien, lo demás no importa.

- `[idea-post]` El post debe asumir que el lector **no tiene fundamentos matemáticos universitarios**. Coseno y euclidiano son nombres nuevos. Empezar siempre por la intuición geométrica, dejar las fórmulas como apéndice opcional.

- `[analogía]` **Embeddings = "GPS pero para significado"**. (lat, lon) son 2 números que mapean cada lugar de la Tierra; lugares cercanos = números cercanos. Un embedding de 384 dimensiones hace lo mismo pero mapea "espacio de significados"; textos parecidos = vectores cercanos. _(Por confirmar si aterriza.)_

- `[analogía]` **Métricas de distancia = dos flechas saliendo del origen**. Distancia coseno = qué tanto **apuntan en la misma dirección** (el ángulo entre ellas). Distancia euclidiana = qué tan **lejos están las puntas**. Para embeddings, lo que importa es la dirección, no la magnitud — por eso coseno es el default en la industria. _(Por confirmar si aterriza.)_

## Outputs / evidencias capturadas

_(EXPLAIN ANALYZE de cada experimento se pega aquí, tal cual sale en consola.)_

## Preguntas abiertas para próximas sesiones

_(Vacío por ahora — se llena cuando surjan preguntas que no resolvemos en esta sesión.)_
