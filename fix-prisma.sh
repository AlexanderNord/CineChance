#!/bin/bash
# Скрипт для восстановления после обновления Prisma schema

echo "🔄 Очищаем кэш Next.js..."
rm -rf .next

echo "🔄 Очищаем кэш Prisma..."
rm -rf node_modules/.prisma/client

echo "✅ Генерируем Prisma client..."
npx prisma generate

echo "✅ Запускаем dev сервер..."
npm run dev
