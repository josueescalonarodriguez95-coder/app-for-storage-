-- Storage Control (Bodega Ramos) — esquema de Supabase
-- Se puede correr entero las veces que haga falta (es idempotente): pegar todo en el SQL
-- Editor de Supabase y darle Run, ya sea la primera vez o para traer cambios nuevos.
-- Reemplaza la IndexedDB local por una base compartida: lo que se guarda desde un iPad
-- lo ven los demás.

create table if not exists clientes (
  id text primary key,
  nombre text not null,
  tipo text not null,
  contacto text not null default ''
);

create table if not exists usuarios (
  id text primary key,
  nombre text not null,
  iniciales text not null,
  rol text not null,
  turno text not null
);

create table if not exists objetos (
  id text primary key,
  tipo text not null,
  descripcion text not null,
  cliente_id text not null references clientes(id),
  ubicacion jsonb,
  medidas jsonb not null,
  peso_kg numeric,
  foto_url text,
  estado text not null,
  fecha_entrada timestamptz not null,
  fecha_salida timestamptz,
  contenedor_id text references objetos(id),
  ref text
);
create index if not exists objetos_contenedor_id_idx on objetos(contenedor_id);
create index if not exists objetos_cliente_id_idx on objetos(cliente_id);

create table if not exists movimientos (
  id text primary key,
  objeto_id text not null references objetos(id),
  evento text not null,
  fecha_hora timestamptz not null,
  nota text not null default '',
  usuario_id text not null references usuarios(id),
  recibe_nombre text,
  recibe_doc text,
  firma_url text,
  mudanza_id text
);
create index if not exists movimientos_objeto_id_idx on movimientos(objeto_id);

create table if not exists mudanzas (
  codigo text primary key,
  cliente_id text not null references clientes(id),
  fecha timestamptz not null,
  tipo text not null default 'Traslado',
  origen text not null default '',
  destino text not null,
  cuadrilla text not null,
  estado text not null
);
-- Por si la tabla ya existía de antes de agregar tipo/origen (columnas nuevas): re-correr este
-- archivo en una base ya creada no falla, sólo agrega lo que falte.
alter table mudanzas add column if not exists tipo text not null default 'Traslado';
alter table mudanzas add column if not exists origen text not null default '';

create table if not exists mudanza_objetos (
  mudanza_id text not null references mudanzas(codigo),
  objeto_id text not null references objetos(id),
  estado_carga text not null,
  primary key (mudanza_id, objeto_id)
);
create index if not exists mudanza_objetos_mudanza_id_idx on mudanza_objetos(mudanza_id);
create index if not exists mudanza_objetos_objeto_id_idx on mudanza_objetos(objeto_id);

-- RLS — la app todavía no tiene login propio (sólo un selector de "usuario en turno"), así
-- que se deja lectura/escritura abierta a quien tenga la anon key (la misma que va en el
-- código público del sitio). Es el mismo nivel de "seguridad" que hoy, que todo vive suelto
-- en el iPad: cualquiera con el link de la app puede leer/escribir. Si más adelante se agrega
-- login real, esto se puede endurecer con policies por usuario autenticado.
alter table clientes enable row level security;
alter table usuarios enable row level security;
alter table objetos enable row level security;
alter table movimientos enable row level security;
alter table mudanzas enable row level security;
alter table mudanza_objetos enable row level security;

drop policy if exists "anon all clientes" on clientes;
create policy "anon all clientes" on clientes for all using (true) with check (true);
drop policy if exists "anon all usuarios" on usuarios;
create policy "anon all usuarios" on usuarios for all using (true) with check (true);
drop policy if exists "anon all objetos" on objetos;
create policy "anon all objetos" on objetos for all using (true) with check (true);
drop policy if exists "anon all movimientos" on movimientos;
create policy "anon all movimientos" on movimientos for all using (true) with check (true);
drop policy if exists "anon all mudanzas" on mudanzas;
create policy "anon all mudanzas" on mudanzas for all using (true) with check (true);
drop policy if exists "anon all mudanza_objetos" on mudanza_objetos;
create policy "anon all mudanza_objetos" on mudanza_objetos for all using (true) with check (true);

-- Realtime — para que un iPad se entere al toque de lo que se guardó en otro.
do $$
begin
  alter publication supabase_realtime add table objetos, movimientos, mudanzas, mudanza_objetos, clientes, usuarios;
exception when duplicate_object then
  null;
end $$;

-- Storage — bucket público para las fotos de objetos y las firmas de salida.
insert into storage.buckets (id, name, public)
values ('fotos', 'fotos', true)
on conflict (id) do nothing;

drop policy if exists "fotos publicas de lectura" on storage.objects;
create policy "fotos publicas de lectura" on storage.objects for select using (bucket_id = 'fotos');
drop policy if exists "fotos publicas de escritura" on storage.objects;
create policy "fotos publicas de escritura" on storage.objects for insert with check (bucket_id = 'fotos');

-- RPC atómico — crea el objeto (y sus piezas si es guacal) más su primer movimiento de
-- historial en una sola transacción, igual que hacía la transacción de IndexedDB.
create or replace function crear_objeto_con_entrada(
  p_objeto jsonb,
  p_piezas jsonb,
  p_movimiento jsonb
) returns void language plpgsql as $$
begin
  insert into objetos select * from jsonb_populate_record(null::objetos, p_objeto);
  if jsonb_array_length(p_piezas) > 0 then
    insert into objetos select * from jsonb_populate_recordset(null::objetos, p_piezas);
  end if;
  insert into movimientos select * from jsonb_populate_record(null::movimientos, p_movimiento);
end;
$$;

-- RPC atómico — pasa el objeto a "Fuera" y agrega el movimiento de salida al historial en
-- una sola transacción (README, "Registrar salida").
create or replace function confirmar_salida(
  p_objeto_id text,
  p_fecha_salida timestamptz,
  p_movimiento jsonb
) returns void language plpgsql as $$
begin
  update objetos set estado = 'Fuera', fecha_salida = p_fecha_salida, ubicacion = null where id = p_objeto_id;
  insert into movimientos select * from jsonb_populate_record(null::movimientos, p_movimiento);
end;
$$;

-- RPC atómico — borra un objeto por error junto con sus piezas, su historial y sus vínculos
-- de mudanza (borrado en cascada, igual que la transacción que había en IndexedDB).
create or replace function eliminar_objeto_cascada(p_id text) returns void language plpgsql as $$
begin
  delete from mudanza_objetos where objeto_id = p_id or objeto_id in (select id from objetos where contenedor_id = p_id);
  delete from movimientos where objeto_id = p_id or objeto_id in (select id from objetos where contenedor_id = p_id);
  delete from objetos where contenedor_id = p_id;
  delete from objetos where id = p_id;
end;
$$;

grant execute on function crear_objeto_con_entrada(jsonb, jsonb, jsonb) to anon, authenticated;
grant execute on function confirmar_salida(text, timestamptz, jsonb) to anon, authenticated;
grant execute on function eliminar_objeto_cascada(text) to anon, authenticated;
