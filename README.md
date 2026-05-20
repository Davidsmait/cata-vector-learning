# cata-vector-learning

> **Learning in public.** Este repo es mi sandbox personal para aprender
> índices SQL, embeddings, pgvector y HNSW desde cero — con la motivación de
> construir [Cata](https://davidsanluisaguirre.com), una tutora conversacional
> de IA para mi roadmap de café de especialidad.
>
> El código está pensado para ejecutarse paso a paso, con `EXPLAIN ANALYZE`
> impreso en consola y comparaciones lado a lado. La carpeta `notes/` contiene
> apuntes **candid** de cada sesión — incluye preguntas, confusiones reales y
> analogías que probé. Es evidencia honesta del proceso, no documentación
> pulida.
>
> Resultado planeado: blog post en
> [davidsanluisaguirre.com](https://davidsanluisaguirre.com) sintetizando todo
> el aprendizaje.

## Stack y motivación

Sandbox de **Node 22 + TypeScript + Postgres 16 + pgvector**, corriendo
localmente vía Docker. Construido en sesiones de 1-2 horas siguiendo la
estructura de las 5 sesiones abajo. Cero servicios pagos, cero cuentas
externas — todo corre en tu Mac.

**Por qué este repo existe:** estaba diseñando el spec de Cata en otra
sesión y me di cuenta de que estaba aceptando recomendaciones de stack
(pgvector, HNSW, contrastive learning) sin entender los fundamentos. Pausé
el spec para llenar esos huecos con código y mediciones reales. Cuando
termine, vuelvo al spec con criterio propio.

## Las 5 sesiones

| # | Tema                              | Foco práctico                                                                 |
|---|-----------------------------------|-------------------------------------------------------------------------------|
| 1 | Índices clásicos (B-tree)         | Seq Scan vs Index Scan. Casos donde el índice se ignora.                      |
| 2 | Embeddings desde cero             | Por qué un vector representa significado. Cosine similarity a mano.           |
| 3 | pgvector + HNSW                   | Búsqueda exhaustiva vs aproximada. Trade-off recall vs speed. Parámetros.     |
| 4 | Operator classes y métricas       | `cosine_ops`, `l2_ops`, `ip_ops`. Por qué la elección se cementa al construir.|
| 5 | Síntesis                          | Borrador de blog post con todo lo aprendido.                                  |

## Stack

- **Postgres 16 + pgvector** vía Docker (OrbStack en Mac)
- **Node 22 + TypeScript + tsx** (sin build step, scripts ejecutables directos)
- **Transformers.js** para embeddings locales (Sesión 2 en adelante)
- **@faker-js/faker** para datos dummy

## Quick start

```bash
# 1. Levantar Postgres con pgvector
npm run db:up

# 2. Instalar deps
npm install

# 3. Verificar conexión + extensión vector disponible
npm run db:ping
```

Si los tres comandos pasan, estás listo para la Sesión 1.

## Comandos disponibles

| Comando                    | Qué hace                                                              |
|----------------------------|-----------------------------------------------------------------------|
| `npm run db:up`            | Levanta Postgres + pgvector en background                             |
| `npm run db:down`          | Apaga el contenedor (preserva datos)                                  |
| `npm run db:nuke`          | Apaga + borra el volumen (datos perdidos)                             |
| `npm run db:logs`          | Tail de logs de Postgres                                              |
| `npm run db:psql`          | Abre `psql` interactivo dentro del contenedor                         |
| `npm run db:ping`          | Verifica conexión y disponibilidad de la extensión vector             |
| `npm run seed:classic`     | Seedea 10K clientes dummy (Sesión 1)                                  |
| `npm run query:no-index`   | EXPLAIN ANALYZE de una query sin índice                               |
| `npm run query:with-index` | EXPLAIN ANALYZE después de crear el índice B-tree                     |
| `npm run query:gotchas`    | Casos donde el índice se ignora (LIKE, funciones, leftmost prefix)    |

## Estructura

```
cata-vector-learning/
├── docker-compose.yml
├── package.json
├── tsconfig.json
├── .env.example
├── README.md
├── src/
│   ├── lib/
│   │   └── db.ts            # Pool de Postgres compartido
│   ├── db-ping.ts           # Sesión 1: verificación
│   ├── seed-classic.ts      # Sesión 1: 10K clientes
│   ├── query-no-index.ts    # Sesión 1: Seq Scan
│   ├── query-with-index.ts  # Sesión 1: Index Scan
│   └── query-gotchas.ts     # Sesión 1: dónde falla el índice
└── notes/                   # Notas por sesión (alimenta blog post final)
```
