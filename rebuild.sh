#!/bin/bash
set -e

echo "Cleaning caches..."
rm -rf .next
rm -rf node_modules/.prisma/client

echo "Regenerating Prisma client..."
npx prisma generate

echo "Starting dev server..."
npm run dev
