// npm run seed:classic
//
// Crea la tabla `customers` y la llena con 10,000 clientes ficticios.
// Pensada para sentir el contraste entre Seq Scan e Index Scan.
//
// El script es idempotente: si lo corres dos veces, no duplica datos. Borra
// la tabla y la vuelve a crear.

import pc from "picocolors";
import { faker } from "@faker-js/faker";
import { pool, q } from "./lib/db.ts";

const TOTAL_ROWS = 10_000;

// Ciudades mexicanas — para que la consulta por ciudad sea realista cuando
// hagamos índices compuestos en la Demo 3.
const MX_CITIES = [
  "Ciudad de México",
  "Guadalajara",
  "Monterrey",
  "Puebla",
  "Querétaro",
  "Mérida",
  "Tijuana",
  "León",
  "Cancún",
  "Toluca",
];

async function main() {
  console.log(pc.dim("→ Tirando tabla customers si existía..."));
  await q("DROP TABLE IF EXISTS customers CASCADE");

  console.log(pc.dim("→ Creando tabla customers..."));
  await q(`
    CREATE TABLE customers (
      id             SERIAL PRIMARY KEY,
      name           TEXT NOT NULL,
      email          TEXT NOT NULL UNIQUE,
      city           TEXT NOT NULL,
      loyalty_points INTEGER NOT NULL,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // Nota: el UNIQUE en email crea automáticamente un índice. Lo quitamos
  // a propósito para esta sesión — queremos partir de una tabla "limpia"
  // sin índices y agregarlos manualmente para sentir la diferencia.
  console.log(pc.dim("→ Quitando el índice automático de email (queremos partir sin índices)..."));
  await q(`ALTER TABLE customers DROP CONSTRAINT customers_email_key`);

  console.log(pc.dim(`→ Generando ${TOTAL_ROWS.toLocaleString()} clientes ficticios...`));

  // faker en español para que los nombres se sientan locales
  faker.seed(42); // misma semilla en cada corrida = datos reproducibles

  // Generamos los datos primero en memoria, después insertamos en batch.
  // Insertar uno por uno con 10K queries sería lento sin necesidad.
  const rows: Array<[string, string, string, number]> = [];
  const emailsVistos = new Set<string>();

  for (let i = 0; i < TOTAL_ROWS; i++) {
    const name = faker.person.fullName();

    // Garantizamos unicidad de email manualmente (sin la constraint).
    let email = faker.internet.email({ firstName: name.split(" ")[0] }).toLowerCase();
    while (emailsVistos.has(email)) {
      email = `${faker.string.alphanumeric(4)}.${email}`;
    }
    emailsVistos.add(email);

    const city = faker.helpers.arrayElement(MX_CITIES);

    // Distribución sesgada: la mayoría con pocos puntos, algunos pocos con
    // muchísimos. Simula clientes reales.
    const loyalty_points = Math.floor(
      faker.number.float({ min: 0, max: 1 }) ** 3 * 5000
    );

    rows.push([name, email, city, loyalty_points]);
  }

  // Insertar en batches de 500 con un INSERT por batch.
  console.log(pc.dim("→ Insertando en batches de 500..."));
  const BATCH = 500;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const values: unknown[] = [];
    const placeholders = batch
      .map((row, idx) => {
        const base = idx * 4;
        values.push(...row);
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`;
      })
      .join(", ");

    await q(
      `INSERT INTO customers (name, email, city, loyalty_points) VALUES ${placeholders}`,
      values
    );

    process.stdout.write(pc.dim(`  ${Math.min(i + BATCH, rows.length).toLocaleString()}/${rows.length.toLocaleString()}\r`));
  }
  process.stdout.write("\n");

  // ANALYZE para que el planner tenga estadísticas frescas.
  // Esto es crítico: sin estadísticas actualizadas, Postgres puede tomar
  // decisiones erróneas sobre usar o no un índice.
  console.log(pc.dim("→ Corriendo ANALYZE para refrescar estadísticas..."));
  await q("ANALYZE customers");

  // Stats finales
  const [{ count }] = await q<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM customers"
  );
  const [{ size }] = await q<{ size: string }>(
    "SELECT pg_size_pretty(pg_total_relation_size('customers')) AS size"
  );
  const [{ index_count }] = await q<{ index_count: string }>(
    `SELECT COUNT(*)::text AS index_count
     FROM pg_indexes WHERE tablename = 'customers'`
  );

  console.log();
  console.log(pc.green("✓"), `${count} clientes insertados`);
  console.log(pc.dim(`  Tamaño total: ${size}`));
  console.log(pc.dim(`  Índices en la tabla: ${index_count} (solo el PRIMARY KEY del id)`));
  console.log();
  console.log(pc.bold("Listo. Siguiente paso:"), pc.cyan("npm run query:no-index"));
}

main()
  .catch((err) => {
    console.error(pc.red("✗ Error:"), err.message);
    process.exit(1);
  })
  .finally(() => pool.end());
