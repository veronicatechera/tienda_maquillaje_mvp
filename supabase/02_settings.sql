-- =====================================================================
-- Parte 2: ajustes de la tienda y estados de pedido
-- Ejecutar DESPUÉS de schema.sql (SQL Editor → New query → Run).
-- =====================================================================

-- Datos públicos de la tienda (nombre, WhatsApp, pie, foto de portada)
create table if not exists public.settings (
  id             integer primary key default 1 check (id = 1),   -- una sola fila
  name           text not null default 'Nombre de la tienda',
  phone          text not null default '',                       -- solo números, con código de país
  tagline        text not null default 'Una tienda independiente de maquillaje.',
  location       text not null default 'Colonia · Uruguay',
  hero_image_url text
);

insert into public.settings (id) values (1) on conflict (id) do nothing;

alter table public.settings enable row level security;

drop policy if exists settings_public_read on public.settings;
create policy settings_public_read on public.settings
  for select to anon, authenticated using (true);

drop policy if exists settings_admin_write on public.settings;
create policy settings_admin_write on public.settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Cambiar el estado de un pedido. Al cancelar, devuelve el stock.
create or replace function public.set_order_status(p_order_id uuid, p_status text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_old text;
begin
  if not public.is_admin() then
    raise exception 'No autorizado';
  end if;
  if p_status not in ('pendiente','confirmado','entregado','cancelado') then
    raise exception 'Estado inválido';
  end if;

  select status into v_old from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Pedido no encontrado';
  end if;
  if v_old = 'cancelado' and p_status <> 'cancelado' then
    raise exception 'Un pedido cancelado no se puede reactivar';
  end if;

  if p_status = 'cancelado' and v_old <> 'cancelado' then
    update public.products p
       set stock = p.stock + oi.q
      from (select product_id, sum(qty)::integer as q
              from public.order_items
             where order_id = p_order_id and mode = 'stock' and product_id is not null
             group by product_id) oi
     where p.id = oi.product_id;
  end if;

  update public.orders set status = p_status where id = p_order_id;
end;
$$;

revoke all on function public.set_order_status(uuid, text) from public;
grant execute on function public.set_order_status(uuid, text) to authenticated;
