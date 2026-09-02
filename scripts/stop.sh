#!/bin/sh
# Stops the backend/admin/postgres containers. Data is kept (named volume).
# Pass --reset to also wipe the database volume (next start reseeds fresh).
set -e
cd "$(dirname "$0")/.."

if [ "$1" = "--reset" ]; then
  docker compose down -v
  echo "Stopped and wiped the database volume. Next 'start' will reseed from scratch."
else
  docker compose down
  echo "Stopped. Database data is preserved — run scripts/start.sh to resume."
fi
