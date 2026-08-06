# Postgres backup & restore runbook

**Verified working on 2026-08-06** — full drill run: downloaded a real backup
from S3, restored it into a scratch database on the live server, confirmed
`psql` could query it, cleaned up. If you change the backup script, the
bucket, or the server layout, re-run the drill and update this date.

## Where things are

| What | Value |
|---|---|
| Server | `root@161.104.44.9` |
| Repo / compose file | `/opt/woodclay` (`docker-compose.yml`) |
| Postgres container | `woodandclay-postgres` (compose service name `postgres`) |
| Database | `woodclay` |
| App role | `woodclay_app` |
| Password | in `/opt/woodclay/.env` as `POSTGRES_PASSWORD` — not written down anywhere else. If you lose this along with the server, you need it from wherever you personally store secrets; there is no recovery path that doesn't require it. |
| Backup script | `/opt/woodclay/backup.sh`, run daily at 03:00 server time via root's crontab |
| Local backup copies | `/opt/woodclay-backups/*.sql.gz`, pruned after 14 days |
| S3 bucket | `woodandclay-images` |
| S3 prefix | `backups/postgres/` |
| S3 endpoint | `https://s3.ru-7.storage.selcloud.ru` |
| S3 region | `ru-7` |
| S3 retention | none yet — every backup stays in the bucket forever unless you add a lifecycle rule in the Selectel console |

## List backups in S3

```bash
aws --endpoint-url https://s3.ru-7.storage.selcloud.ru s3 ls s3://woodandclay-images/backups/postgres/
```

## Download a chosen backup

```bash
FILE=woodclay-20260806-002803.sql.gz   # replace with the one you want, from the listing above
mkdir -p /tmp/restore
aws --endpoint-url https://s3.ru-7.storage.selcloud.ru s3 cp \
  s3://woodandclay-images/backups/postgres/$FILE /tmp/restore/$FILE
```

## Restore into a scratch database (safe — proves the backup is good, touches nothing live)

This is exactly the drill run on 2026-08-06:

```bash
cd /opt/woodclay
docker compose exec postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "CREATE DATABASE restore_check;"'
gunzip -c /tmp/restore/$FILE | docker compose exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d restore_check'
docker compose exec postgres sh -c 'psql -U "$POSTGRES_USER" -d restore_check -c "\dt"'
docker compose exec postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "DROP DATABASE restore_check;"'
```

## Restore over the real database (disaster recovery, same server)

Only do this if the live `woodclay` database is actually gone or corrupted —
this drops it. `pg_dump`'s plain-SQL output can't be piped into a database
that already has the same objects in it, so the target has to be empty:

```bash
cd /opt/woodclay
docker compose exec postgres sh -c 'psql -U "$POSTGRES_USER" -d postgres -c "DROP DATABASE IF EXISTS \"$POSTGRES_DB\";"'
docker compose exec postgres sh -c 'psql -U "$POSTGRES_USER" -d postgres -c "CREATE DATABASE \"$POSTGRES_DB\";"'
gunzip -c /tmp/restore/$FILE | docker compose exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

## Restore onto a fresh server (server itself is gone)

Nothing about the restore works until these exist:

1. A new Ubuntu VPS with Docker + the Docker Compose plugin installed.
2. This repo cloned to `/opt/woodclay`:
   ```bash
   git clone git@github.com:bondoge/Wood-Clay.git /opt/woodclay
   ```
3. `/opt/woodclay/.env` created with at least `POSTGRES_DB=woodclay`,
   `POSTGRES_USER=woodclay_app`, `POSTGRES_PASSWORD=<the real password,
   from wherever you keep secrets — not from this file>` (plus the other
   `.env.example` keys if you're restoring the whole app, not just the DB).
4. The `postgres` service up and healthy:
   ```bash
   cd /opt/woodclay
   docker compose up -d postgres
   docker compose ps   # confirm "healthy" before continuing
   ```
5. `aws-cli` installed and configured with the S3 access/secret key
   (`apt install -y awscli && aws configure`) — same credentials as before,
   from wherever you keep secrets.

Once all five exist, follow **"Restore over the real database"** above — on
a fresh server the database is already empty, so the `DROP DATABASE` step
is a no-op and can be skipped.
