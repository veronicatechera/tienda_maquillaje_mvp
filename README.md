# Tienda de maquillaje — React + Vite + Supabase

## 1. Base de datos (una sola vez)
En Supabase → **SQL Editor**, ejecutá en orden:
1. `supabase/01_schema.sql`
2. `supabase/02_settings.sql`

Luego creá tu usuario en **Authentication → Users → Add user** (con "Auto Confirm User") y ejecutá:

```sql
insert into public.admins (user_id)
select id from auth.users where email = 'tu@email.com';
```

## 2. Probar en tu computadora
Requiere [Node.js](https://nodejs.org) 18 o superior.

```bash
npm install
npm run dev
```
Abrí la dirección que muestra (normalmente http://localhost:5173).
El panel está en `http://localhost:5173/#/admin` (también hay un enlace "Administrar" en el pie de la tienda).

El archivo `.env` ya trae la URL y la clave **pública** de tu proyecto. Esa clave puede estar en el navegador; la seguridad la dan las reglas (RLS) del esquema. **Nunca** pongas la clave `secret`/`service_role` en este proyecto.

## 3. Publicar en Vercel
1. Subí esta carpeta al repositorio de GitHub (`.env` no se sube: está en `.gitignore`).
2. En Vercel: **Add New → Project →** elegí el repositorio (Framework: Vite).
3. En **Environment Variables** cargá `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` con los mismos valores de `.env`.
4. **Deploy**. Cada `git push` vuelve a publicar.
5. En Supabase → Authentication → URL Configuration, poné la dirección de Vercel como *Site URL*.

## Cómo funciona un pedido
El cliente arma la bolsa → la base de datos registra el pedido, calcula el total con los precios reales y descuenta el stock → se le ofrece abrir WhatsApp con el resumen. Aunque el cliente no envíe el mensaje, el pedido aparece en **Administrar → Pedidos**. Al cancelar un pedido, el stock vuelve a quedar disponible.

## Seguridad
- Los costos viven en una tabla aparte que solo ve la administradora.
- Los clientes no escriben en la base directamente: solo pueden llamar a `create_order`.
- Usá una contraseña larga y única para tu usuario administrador.
