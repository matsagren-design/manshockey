# MansHockey 11 Admin CMS

Ny adminstruktur:
- Sidomeny
- Dashboard
- Tabellvy för CMS
- Formulär i högerpanel
- CRUD mot D1
- Inloggning med session-cookie
- Förberedda roller

## Viktigt
Kör `schema/d1_schema.sql` i D1 Console om tabeller saknas.

Första admin:
```sql
INSERT INTO users (email, name, password_hash, role)
VALUES ('DIN_EMAIL', 'Mats Ågren', 'manshockey-admin', 'admin');
```
