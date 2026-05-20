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

- `[analogía]` **Métricas de distancia = dos flechas saliendo del origen**. Distancia coseno = qué tanto **apuntan en la misma dirección** (el ángulo entre ellas). Distancia euclidiana = qué tan **lejos están las puntas**. Para embeddings, lo que importa es la dirección, no la magnitud — por eso coseno es el default en la industria. **Confirmada**: David la parafraseó perfecto: *"nuestro objetivo es encontrar que las flechas apunten al mismo lado sin importar la distancia a la que estén"*. Esta analogía va al post tal cual.

- `[modelo-mental]` David, sin guía adicional, internalizó coseno como **"apuntan al mismo lado sin importar la distancia"**. Es la forma más limpia de comunicar la intuición — más simple que la mía. Robarla para el post.

- `[confusión]` David preguntó **"¿de dónde sacaste el número 384?"** — el número de dimensiones del embedding. Pregunta totalmente válida. El post tiene que cubrir explícitamente: por qué los modelos tienen N dimensiones, que no es algo que tú elijas (es propiedad fija del modelo entrenado), y comparar 384 (MiniLM) vs 1024 (Voyage) vs 1536 (OpenAI) como tabla.

- `[confusión]` David preguntó **qué representan los dos números de las coordenadas GPS** (lat y lon). Señal importante: la analogía GPS funciona conceptualmente, pero **no asumir que el lector tiene mapa mental claro de latitud/longitud**. En el post, explicar los dos números explícitamente la primera vez. Posiblemente reforzar con un visual.

- `[idea-post]` En el post final, sección de embeddings, **abrir con esta tabla comparativa de dimensiones**: MiniLM 384, BERT-base 768, Voyage-3-lite 1024, OpenAI text-embedding-3-small 1536. Aclarar: "tu modelo decide el tamaño, no tú". Más dims = potencialmente más capacidad expresiva, pero también más espacio en disco y más tiempo de cómputo. 384 es sweet spot para aprender y para muchos casos reales.

- `[confusión]` David preguntó **"¿cómo aprende el modelo a poner significados parecidos cerca?"**. Pregunta de oro — la que más tutoriales evaden. El post final tiene que responderla bien, no es opcional.

- `[analogía]` **Ligas y resortes en un cuarto vacío.** Cada texto es una esfera. Pares parecidos → liga elástica que las jala. Pares no parecidos → resorte que las separa. Después de millones de iteraciones, el sistema llega a equilibrio: relacionados juntos, no relacionados lejos. **El modelo no son las esferas — es la función que decide dónde poner cada esfera.** _(Por confirmar si aterriza.)_

- `[idea-post]` Punto que sorprende y vale incluir: **los pares de entrenamiento no se etiquetan a mano**. Se obtienen con trucos automáticos: traducciones (mismo significado, distintos idiomas), pares Q&A de Stack Overflow/Reddit, oraciones contiguas del mismo párrafo, título+cuerpo de noticias. Y los "no parecidos" se generan tomando textos random de documentos distintos.

- `[idea-post]` **La generalización es la magia real**, no la memorización. El modelo nunca vio "mi máquina italiana tira ristrettos cortos", pero la coloca cerca de otros textos cafeteros porque internalizó patrones léxicos. Esto debe quedar muy claro en el post — distingue un modelo de IA de un simple índice de palabras.

- `[idea-post]` **Nombre técnico para soltar una sola vez** en el post: "contrastive learning". No abundar; solo darle al lector el término por si lo encuentra en otros artículos.

- `[decisión]` **No entrenamos modelo desde cero** — usamos uno pre-entrenado (MiniLM de Microsoft Research). Entrenar uno cuesta millones de dólares en GPUs. El post debe aclarar esto explícitamente para que el lector no se asuste pensando que va a tener que entrenar algo.

- `[confusión]` Después de toda la explicación de embeddings (GPS + flechas + ligas/resortes + contrastive learning), David dijo literal **"masomenos pero entiendo que no hay que profundizar aún mucho"**. Señal importante: la primera pasada **no aterrizó al 100%**, y David lo está reconociendo honestamente. El post final tiene que **dedicarle más espacio a esta sección** del que parece justificarse en una primera lectura. La Sesión 2 debe abrir reforzando estos conceptos con código antes de avanzar.

- `[confusión]` David preguntó **qué guarda físicamente el índice**: ¿solo el campo indexado y el id, o el registro completo? Pregunta perfecta porque revela que el modelo mental "el índice es un atajo" se queda corto sin entender el **heap vs índice como dos archivos físicos separados**.

- `[idea-post]` **Diagrama obligatorio del heap + índice como dos estructuras separadas** con flechas (CTID) que apuntan de una a otra. Sin este diagrama, el resto del post no se sostiene. Posiblemente animado/SVG en el post final.

- `[confusión]` David preguntó **qué significa "logarítmicamente"**. Marca el nivel exacto del lector: no asume background de matemáticas universitarias. El post debe explicar logaritmo en una línea simple antes de soltarlo.

- `[analogía]` **Logaritmo ≈ cuántos dígitos tiene un número.** log_10(1000) = 3 (mil tiene 4 dígitos, aproximadamente 3 + 1). log_10(1,000,000) = 6. Crecimiento lentísimo. _(Por confirmar si aterriza.)_

- `[idea-post]` **Tabla de complejidades como guía mental rápida** en el post: O(1) constante, O(log N) logarítmica, O(N) lineal, O(N²) cuadrática, O(2^N) exponencial. Solo necesita ser un párrafo, no un curso de Big-O.

- `[confusión]` Después de toda la explicación de B-tree y mientras estaba listo para seedear, David **volvió a preguntar "¿qué es un embedding?"** — la versión más básica posible. Señal contundente: a pesar de GPS + flechas + ligas/resortes + contrastive learning, **el concepto aún no se consolidó**. Mid-level dev haciendo metacognición correcta — está cerrando el loop antes de continuar.

- `[analogía]` **Embedding = RGB pero para significados.** RGB son 3 números que codifican una apariencia visual; embedding son 384 números que codifican significado. Colores con RGB parecido se ven parecido; textos con embedding parecido significan parecido. **Es la analogía más concreta** y la única que David ya conocía de antes (CSS) — probablemente la que finalmente aterrice. _(Por confirmar.)_

- `[idea-post]` **Mover RGB al inicio** de la sección de embeddings en el post final. GPS y flechas vienen después como refuerzo. La definición debería abrir con: "un embedding es una lista de números que representa contenido, donde contenidos parecidos producen listas parecidas — como RGB pero para significados".

- `[idea-post]` **Tabla concreta con vectores reales** en el post: 3 textos del corpus + sus primeros 4-5 valores del vector, mostrando que los relacionados tienen números parecidos. Hasta que el lector no ve los números reales, el concepto no se cierra del todo.

- `[pregunta-abierta]` Si después de Sesión 2 (cuando vea los números reales) David sigue diciendo "masomenos", reconsiderar la estructura del post: quizá embeddings necesitan una sección entera con visualización 2D (UMAP) antes de tocar pgvector.

## Outputs / evidencias capturadas

### Demo 1 — Query SIN índice (Seq Scan)

Cliente objetivo: id 5001, Mr. Ryan Kling, `mr.ziemann@gmail.com`. Query: `SELECT id, name, city FROM customers WHERE email = $1`.

```
Seq Scan on customers  (cost=0.00..244.00 rows=1 width=28) (actual time=0.221..0.478 rows=1 loops=1)
  Filter: (email = 'mr.ziemann@gmail.com'::text)
  Rows Removed by Filter: 9999
  Buffers: shared hit=119
Planning Time: 0.017 ms
Execution Time: 0.484 ms
```

**Métricas a destacar en el post**:
- `Execution Time: 0.484 ms` — rápido en absoluto, pero…
- `Rows Removed by Filter: 9999` — descartó el 99.99% del trabajo
- `Buffers: shared hit=119` ≈ 952 KB paseados para encontrar una fila de ~50 bytes (ratio de desperdicio ~19,000×)

- `[idea-post]` **Ser honesto en el post sobre la escala**: 0.484 ms no asusta a nadie. La razón por la cual los índices son esenciales y no opcionales se revela al escalar: 10K→0.5ms, 1M→50ms, 100M→5s. La tabla de proyección debe estar en el post para que el lector entienda por qué el snapshot de hoy no es donde está la moraleja.

- `[idea-post]` La métrica que **sí** escala obvio aunque la tabla sea chica es **Buffers (páginas leídas)**. 119 páginas para encontrar 1 fila es la evidencia visible incluso a esta escala. El post puede usar esto para no depender de tablas gigantes para mostrar el contraste.

### Demo 2 — Crear índice B-tree y comparar

```
Plan SIN índice:
Seq Scan on customers  (cost=0.00..244.00 rows=1 width=28) (actual time=0.245..0.494 rows=1 loops=1)
  Filter: (email = 'mr.ziemann@gmail.com'::text)
  Rows Removed by Filter: 9999
  Buffers: shared hit=119
Planning Time: 0.017 ms
Execution Time: 0.498 ms

CREATE INDEX idx_customers_email ON customers(email);
✓ Índice creado en 25 ms. Tamaño: 448 kB.

Plan CON índice:
Index Scan using idx_customers_email on customers  (cost=0.29..8.30 rows=1 width=28) (actual time=0.005..0.005 rows=1 loops=1)
  Index Cond: (email = 'mr.ziemann@gmail.com'::text)
  Buffers: shared hit=3
Planning Time: 0.019 ms
Execution Time: 0.009 ms
```

**Comparación final:**
- Tipo: Seq Scan → Index Scan
- Filas descartadas: 9999 → 0
- Páginas leídas: 119 → 3 (**39.7× menos**)
- Execution Time: 0.498 ms → 0.009 ms (**55.3× más rápido**)

- `[idea-post]` **La diferencia entre `Filter` y `Index Cond`** es la pista visible más limpia de si tu índice funciona. Filter = "lee y después decide", Index Cond = "usa el índice para navegar y solo lee lo que califica". Esta diferencia de palabra en EXPLAIN ANALYZE merece su propio recuadro en el post — cuando un dev depura performance, mirar esa línea le dice todo.

- `[idea-post]` **El índice ocupa 448 kB en un table de ~1.2 MB** — overhead ~37%. Vale para el post mencionar el costo real: los índices no son gratis. Multiplica si tienes 5 índices.

- `[output]` Bug menor en el script: la query usó `indexrelid` en `pg_indexes`, pero esa columna está en `pg_index` (sin "s"). Fix: usar `pg_class.oid` con JOIN sobre `pg_class.relname = indexname`. **Idea de sidebar**: en Postgres hay vistas (`pg_indexes`, `pg_tables`) y catálogos crudos (`pg_index`, `pg_class`) con nombres parecidos pero campos distintos — la confusión es endémica.

- `[idea-post]` **Variación entre corridas**: Demo 1 dio 0.484 ms, Demo 2 sin índice dio 0.498 ms. Misma query, mismo data, mismo cache. Las mediciones tienen ruido natural — el post debería normalizar promediando N corridas (ej. 100) para que el contraste sea estadísticamente honesto.

- `[confusión]` David preguntó **qué son `pg_indexes`, `pg_index`, `pg_class`** y por qué tienen nombres tan parecidos. Pregunta excelente que abre el tema del **system catalog** — algo que mid-level devs raramente conocen pero que es la diferencia entre "saber Postgres" y "saber Postgres profundo".

- `[analogía]` **Postgres se conoce a sí mismo: el registro de hotel.** Para saber quién duerme en el cuarto 304 no entras al cuarto — consultas el registro de la recepción. Postgres hace lo mismo: para saber qué índices existen no inspecciona disco, consulta sus tablas internas. **Metadata como data.** _(Funcionó bien.)_

- `[idea-post]` **Sidebar muy útil para el post**: "Postgres como base de datos sobre sí misma". Explicar las dos capas del catálogo (tablas crudas `pg_*` singular vs vistas amigables `pg_*` plural), la confusión típica entre `pg_index` y `pg_indexes` (la "s" cambia todo), y `pg_class` como el rey universal que contiene oids de todas las relaciones. Cerrar con `information_schema` como alternativa portable.

- `[idea-post]` **Tabla mental para el post**: singular = tabla cruda (`pg_index`, `pg_table` ¡no existe!), plural = vista amigable (`pg_indexes`, `pg_tables`). `pg_class` rompe el patrón pero es el más importante.

- `[idea-post]` **Conectar explícitamente con Cata** en este punto del post: cuando llegues a HNSW, vas a inspeccionar `pg_indexes` para confirmar que tu índice vectorial quedó, `pg_extension` para verificar `vector`, `pg_stat_user_indexes` para ver si tu índice se usa o está zombie. El system catalog deja de ser trivia y se vuelve herramienta de debugging.

- `[confusión]` David tuvo **mucha confusión real** con la primera explicación del catálogo. Preguntó específicamente: qué significa la "o" en oid, qué significa "rel" (creía que podía ser "real"), qué es relkind, por qué hay tablas con nombres tan parecidos, qué es `indexrelid` y por qué no puede acceder desde la vista. Señal crítica: **la etimología de los nombres del catálogo es un bloqueo cognitivo grande para mid-level devs no expertos en DBs**. El post no puede asumir conocimiento de "relation" como sinónimo de tabla.

- `[idea-post]` **Sección obligatoria en el post: "Etimología del catálogo".** Tabla con: OID = Object Identifier, REL = Relation (no Real), KIND = tipo. Y la regla mental: singular = tabla cruda, plural = vista amigable. Sin esta sección de claridad terminológica, el resto de las explicaciones de `pg_class`/`pg_index`/`pg_indexes` no aterrizan.

- `[idea-post]` **Diagrama ASCII / SVG obligatorio** del catálogo: `pg_class` en el centro con flechas saliendo a `pg_index`, `pg_attribute`, `pg_namespace`, mostrando que todo se enlaza por OIDs. Debe haber filas reales del ejemplo (oid 16389 → customers, etc.) — no solo abstracciones.

- `[idea-post]` **Side-by-side de "misma pregunta, dos formas"** funciona muy bien: pregunta humana ("¿qué índices tiene customers?") y mostrar la query cruda vs la query con vista, con resultados reales. Es lo que más cierra el concepto de "dos capas".

- `[idea-post]` Para el post final: **el bug real del script** + su fix es un ejemplo concreto perfecto. Mostrar el bug, mostrar el fix, explicar por qué falló desde el modelo mental del catálogo. Es 10× más memorable que una explicación abstracta.

## Preguntas abiertas para próximas sesiones

_(Vacío por ahora — se llena cuando surjan preguntas que no resolvemos en esta sesión.)_
