#!/bin/sh
set -e

echo "🔄 Pushing database schema..."
prisma db push --skip-generate --accept-data-loss 2>&1 || {
  echo "⚠️  Retrying in 3s..."
  sleep 3
  prisma db push --skip-generate --accept-data-loss 2>&1
}

echo "🌱 Seeding database..."
prisma db seed 2>&1 || echo "⚠️  Seed skipped (already seeded or error)"

echo "🚀 Starting DayPlanner..."
exec "$@"
