// prisma/seed.ts
// Seed script uses its own PrismaClient to avoid ESM/ts-node import issues.
import 'dotenv/config';
import { Client } from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const client = new Client({ connectionString });

async function main() {
  console.log('🌱 Заполняем таблицу MovieStatus начальными статусами...')

  const statuses = [
    { name: 'Хочу посмотреть' },
    { name: 'Просмотрено' },
    { name: 'Брошено' },
  ];

  await client.connect();

  for (const status of statuses) {
    const insert = `INSERT INTO "MovieStatus"(name) VALUES($1) ON CONFLICT (name) DO NOTHING RETURNING id, name`;
    const res = await client.query(insert, [status.name]);

    if ((res.rowCount ?? 0) > 0) {
      console.log(`Статус "${res.rows[0].name}" (id: ${res.rows[0].id}) — добавлен`);
    } else {
      const sel = await client.query(`SELECT id, name FROM "MovieStatus" WHERE name = $1`, [status.name]);
      if ((sel.rowCount ?? 0) > 0) {
        console.log(`Статус "${sel.rows[0].name}" (id: ${sel.rows[0].id}) — уже существует`);
      } else {
        console.log(`Не удалось добавить или найти статус "${status.name}"`);
      }
    }
  }

  console.log('✅ Все статусы обработаны (inserted/existed).');
}

main()
  .catch((e) => {
    console.error('❌ Ошибка при выполнении seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await client.end();
  });