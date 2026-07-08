# Cloudflare setup för MansHockey 7.0

## D1
1. Cloudflare → Workers & Pages → D1 → Create database.
2. Namn: `manshockey-db`.
3. Kör SQL från `schema/d1_schema.sql`.
4. Kopiera database_id.
5. Lägg tillbaka D1-bindningen i `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "manshockey-db"
database_id = "DIN_D1_DATABASE_ID"
```

## R2
1. Cloudflare → R2 → Create bucket.
2. Namn: `manshockey-files`.
3. Lägg tillbaka R2-bindningen i `wrangler.toml`:

```toml
[[r2_buckets]]
binding = "FILES"
bucket_name = "manshockey-files"
```

## Inloggning
Rekommenderad första lösning: Cloudflare Access framför `/admin`.
