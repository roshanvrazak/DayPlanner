#!/bin/sh
set -e

echo "🔄 Running Prisma db push..."
npx prisma db push --skip-generate 2>/dev/null || {
  echo "⚠️  Prisma db push failed, retrying in 3 seconds..."
  sleep 3
  npx prisma db push --skip-generate
}

echo "🌱 Seeding database..."
npx prisma db seed 2>/dev/null || echo "⚠️  Seed skipped (may already exist)"

echo "🚀 Starting application..."
exec "$@"
