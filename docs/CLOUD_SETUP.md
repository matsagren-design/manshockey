# MansHockey Cloud setup

## 1. Skapa D1
Cloudflare → Workers & Pages → D1 → Create database:
- Name: manshockey-db

Kör SQL från:
- schema/d1_schema.sql

Lägg sedan in database_id i wrangler.toml:

```toml
[[d1_databases]]
binding = "DB"
database_name = "manshockey-db"
database_id = "DIN_D1_DATABASE_ID"
```

## 2. Skapa R2
Cloudflare → R2 → Create bucket:
- Name: manshockey-files

Lägg till:

```toml
[[r2_buckets]]
binding = "FILES"
bucket_name = "manshockey-files"
```

## 3. Skydda admin
Cloudflare Zero Trust → Access → Applications.
Skydda `/admin` eller hela manshockey.com om ni vill ha privat app.
