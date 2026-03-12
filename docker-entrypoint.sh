#!/bin/sh
set -e

echo "🔄 Pushing database schema..."
./node_modules/.bin/prisma db push --skip-generate --accept-data-loss 2>&1 || {
  echo "⚠️  Retrying in 3s..."
  sleep 3
  ./node_modules/.bin/prisma db push --skip-generate --accept-data-loss 2>&1
}

echo "🌱 Seeding database..."
npx prisma db seed 2>&1

echo "🚀 Starting DayPlanner..."
exec "$@"
