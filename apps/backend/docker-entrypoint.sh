#!/bin/sh
set -e

echo "Waiting for Postgres and applying migrations..."
until npx prisma migrate deploy; do
  echo "Migration attempt failed, retrying in 3s..."
  sleep 3
done

ADMIN_COUNT=$(node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.adminUser.count()
  .then((c) => { console.log(c); process.exit(0); })
  .catch(() => { console.log(0); process.exit(0); });
")

if [ "$ADMIN_COUNT" = "0" ]; then
  echo "Database is empty — seeding demo data..."
  npx ts-node prisma/seed.ts
else
  echo "Database already seeded ($ADMIN_COUNT admin users found) — skipping seed."
fi

echo "Starting Apniidukan backend..."
exec node dist/src/main
