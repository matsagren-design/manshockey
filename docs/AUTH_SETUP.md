# MansHockey 10.0 – inloggning

## 1. Kör SQL
Kör `schema/d1_schema.sql` i D1 Console.

## 2. Skapa första admin
I D1 Console, kör:

```sql
INSERT INTO users (email, name, password_hash, role)
VALUES ('DIN_EMAIL', 'Mats', 'manshockey-admin', 'admin');
```

I denna första version jämför systemet lösenordet direkt mot `password_hash`.
Använd alltså lösenordet:

```text
manshockey-admin
```

Byt lösenordet senare. Nästa steg är riktig hashning med PBKDF2/bcrypt-liknande Worker-logik.

## 3. Logga in
Gå till manshockey.com, klicka Login och använd e-post + lösenord.

## Viktigt
Detta är en fungerande inloggningsgrund, men inte slutlig säkerhetsnivå. Nästa säkerhetssteg:
- hashade lösenord
- SESSION_SECRET
- rate limiting
- forgot password/magic link
