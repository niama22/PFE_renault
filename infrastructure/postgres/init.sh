#!/bin/bash
set -e

echo "=========================================="
echo " OptiFlow - PostgreSQL Initialization"
echo "=========================================="

create_db_if_not_exists() {
  local db=$1
  local exists
  exists=$(psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "SELECT 1 FROM pg_database WHERE datname='$db'")
  if [ "$exists" != "1" ]; then
    psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "CREATE DATABASE $db"
    echo "  Created: $db"
  else
    echo "  Already exists: $db"
  fi
}

# Create service databases
create_db_if_not_exists client_db
create_db_if_not_exists operateur_db
create_db_if_not_exists chauffeur_db
create_db_if_not_exists admin_db
create_db_if_not_exists responsable_db
create_db_if_not_exists gps_db
create_db_if_not_exists reporting_db
create_db_if_not_exists keycloak_db

echo "Enabling extensions on service databases..."

for db in client_db operateur_db chauffeur_db admin_db responsable_db reporting_db; do
  echo "  -> $db"
  psql -U "$POSTGRES_USER" -d "$db" -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp"' > /dev/null
  psql -U "$POSTGRES_USER" -d "$db" -c 'CREATE EXTENSION IF NOT EXISTS pg_trgm' > /dev/null
  psql -U "$POSTGRES_USER" -d "$db" -c 'CREATE EXTENSION IF NOT EXISTS pgcrypto' > /dev/null
done

echo "  -> gps_db (PostGIS)"
psql -U "$POSTGRES_USER" -d gps_db -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp"' > /dev/null
psql -U "$POSTGRES_USER" -d gps_db -c 'CREATE EXTENSION IF NOT EXISTS postgis' > /dev/null
psql -U "$POSTGRES_USER" -d gps_db -c 'CREATE EXTENSION IF NOT EXISTS postgis_topology' > /dev/null

echo "=========================================="
echo " PostgreSQL initialization complete!"
echo "=========================================="
