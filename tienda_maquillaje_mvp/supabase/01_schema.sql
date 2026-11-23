-- =====================================================================
-- Tienda de maquillaje — esquema inicial para Supabase
-- Pegar completo en: Supabase → SQL Editor → New query → Run
-- Es seguro volver a ejecutarlo (usa IF NOT EXISTS / OR REPLACE).
-- =====================================================================

-- ---------- Tablas ----------

create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name        text not null check (length(trim(name)) > 0),
  brand       text,
  category    text not null check (category in
              ('Rostro','Ojos','Labios','Uñas','Accesorios','Cuidado facial','Otros')),
  description text,
  price       integer not null check (price > 0),          -- UYU, enteros
  stock       integer not null default 0 check (stock >= 0),
  mode        text not null default 'stock' check (mode in ('stock','order')),
  image_url   text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Costo privado: tabla aparte, sin acceso público.
create table if not exists public.product_costs (
  product_id uuid primary key references public.products(id) on delete cascade,
  cost       integer not null default 0 check (cost >= 0)
);

create table if not exists public.orders (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  customer_name  text not null,
  customer_phone text,
  delivery       text not null,
  address        text,
  note           text,
  total          integer not null default 0,
  status         text not null default 'pendiente'
                 check (status in ('pendiente','confirmado','entregado','cancelado'))
);

create table if not exists public.order_items (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  name       text not null,       -- copia del nombre al momento de la compra
  unit_price integer not null,    -- copia del precio al momento de la compra
  qty        integer not null check (qty > 0),
  mode       text not null
);

create index if not exists order_items_order_idx on public.order_items(order_id);
create index if not exists orders_created_idx    on public.orders(created_at desc);

-- Administradoras: quienes figuran acá pueden editar la tienda.
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

-- ---------- Función de permisos ----------

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- ---------- Seguridad por fila (RLS) ----------

alter table public.products      enable row level security;
alter table public.product_costs enable row level security;
alter table public.orders        enable row level security;
alter table public.order_items   enable row level security;
alter table public.admins        enable row level security;

drop policy if exists products_public_read on public.products;
create policy products_public_read on public.products
  for select to anon, authenticated using (active);

drop policy if exists products_admin_all on public.products;
create policy products_admin_all on public.products
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists costs_admin_all on public.product_costs;
create policy costs_admin_all on public.product_costs
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists orders_admin_all on public.orders;
create policy orders_admin_all on public.orders
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists order_items_admin_all on public.order_items;
create policy order_items_admin_all on public.order_items
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists admins_self_read on public.admins;
create policy admins_self_read on public.admins
  for select to authenticated using (user_id = auth.uid());

-- Los clientes NO insertan en orders directamente: solo vía create_order().

-- ---------- Crear pedido (precios y stock se calculan en el servidor) ----------

create or replace function public.create_order(
  p_name     text,
  p_phone    text,
  p_delivery text,
  p_address  text,
  p_note     text,
  p_items    jsonb      -- [{"product_id":"<uuid>","qty":2}, ...]
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_order_id uuid;
  v_total    integer := 0;
  v_item     jsonb;
  v_prod     public.products%rowtype;
  v_qty      integer;
  v_lines    jsonb := '[]'::jsonb;
begin
  if coalesce(trim(p_name), '') = '' then
    raise exception 'Falta el nombre';
  end if;
  if p_delivery not in ('Retiro coordinado', 'Envío (coordinar costo)') then
    raise exception 'Modalidad de entrega inválida';
  end if;
  if p_delivery like 'Envío%' and coalesce(trim(p_address), '') = '' then
    raise exception 'Falta la dirección para el envío';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 50 then
    raise exception 'Pedido inválido';
  end if;

  insert into public.orders (customer_name, customer_phone, delivery, address, note)
  values (left(trim(p_name), 120), left(trim(coalesce(p_phone,'')), 40), p_delivery,
          left(trim(coalesce(p_address,'')), 300), left(trim(coalesce(p_note,'')), 500))
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'qty')::integer;
    if v_qty is null or v_qty < 1 or v_qty > 99 then
      raise exception 'Cantidad inválida';
    end if;

    select * into v_prod from public.products
     where id = (v_item->>'product_id')::uuid and active
     for update;
    if not found then
      raise exception 'Un producto ya no está disponible';
    end if;

    if v_prod.mode = 'stock' then
      if v_prod.stock < v_qty then
        raise exception 'Stock insuficiente de: %', v_prod.name;
      end if;
      update public.products set stock = stock - v_qty where id = v_prod.id;
    end if;

    insert into public.order_items (order_id, product_id, name, unit_price, qty, mode)
    values (v_order_id, v_prod.id, v_prod.name, v_prod.price, v_qty, v_prod.mode);

    v_total := v_total + v_prod.price * v_qty;
    v_lines := v_lines || jsonb_build_object(
      'name', v_prod.name, 'qty', v_qty,
      'subtotal', v_prod.price * v_qty, 'mode', v_prod.mode);
  end loop;

  update public.orders set total = v_total where id = v_order_id;

  return jsonb_build_object('order_id', v_order_id, 'total', v_total, 'items', v_lines);
end;
$$;

revoke all on function public.create_order(text,text,text,text,text,jsonb) from public;
grant execute on function public.create_order(text,text,text,text,text,jsonb) to anon, authenticated;

-- ---------- Fotos de productos (Storage) ----------

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists product_images_admin_write on storage.objects;
create policy product_images_admin_write on storage.objects
  for all to authenticated
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());

-- ---------- Productos de ejemplo (borrarlos cuando cargues los reales) ----------

with ins as (
  insert into public.products (slug, name, category, description, price, stock, mode) values
   ('mascara-de-pestanas','Máscara de pestañas','Ojos','Definición y volumen para completar tu mirada.',220,4,'stock'),
   ('gloss-labial','Gloss labial','Labios','Brillo y acabado luminoso. Consultá tonos disponibles.',190,0,'order'),
   ('rubor-compacto','Rubor compacto','Rostro','Un toque de color para tu rutina diaria.',260,2,'stock'),
   ('paleta-de-sombras','Paleta de sombras','Ojos','Selección de tonos para crear distintos looks.',390,0,'order'),
   ('esponja-de-maquillaje','Esponja de maquillaje','Accesorios','Accesorio práctico para aplicar y difuminar.',120,6,'stock'),
   ('crema-facial','Crema facial','Cuidado facial','Producto sujeto a disponibilidad del proveedor.',280,0,'order')
  on conflict (slug) do nothing
  returning id, slug
)
insert into public.product_costs (product_id, cost)
select ins.id, v.cost
from ins join (values
  ('mascara-de-pestanas',130),('gloss-labial',105),('rubor-compacto',155),
  ('paleta-de-sombras',245),('esponja-de-maquillaje',65),('crema-facial',170)
) as v(slug, cost) on v.slug = ins.slug;

-- =====================================================================
-- DESPUÉS de ejecutar esto:
-- 1) Authentication → Users → Add user (tu email + contraseña fuerte,
--    marcá "Auto Confirm User").
-- 2) Ejecutá, cambiando el email por el tuyo:
--      insert into public.admins (user_id)
--      select id from auth.users where email = 'tu@email.com';
-- =====================================================================
