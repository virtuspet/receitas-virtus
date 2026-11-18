-- Receitas Virtus Pet — esquema inicial
-- Ferramenta interna: qualquer usuário autenticado enxerga e edita tudo.

create extension if not exists "pgcrypto";

create table if not exists receita (
  id                uuid primary key default gen_random_uuid(),
  criado_em         timestamptz not null default now(),
  data_prescricao   date,
  data_recebimento  timestamptz not null default now(),
  clinica           text,
  vet_nome          text,
  vet_crmv          text,
  animal_nome       text,
  animal_especie    text,
  animal_raca       text,
  animal_sexo       text,
  animal_peso_kg    text,
  tutor_nome        text,
  conferido         boolean not null default false,
  foto_path         text,
  origem            text not null default 'foto' check (origem in ('foto','arquivo')),
  bruto             jsonb,
  criado_por        uuid references auth.users(id) on delete set null
);

create index if not exists receita_recebimento_idx on receita (data_recebimento desc);
create index if not exists receita_especie_idx      on receita (animal_especie);

create table if not exists receita_item (
  id              uuid primary key default gen_random_uuid(),
  receita_id      uuid not null references receita(id) on delete cascade,
  principio_ativo text,
  nome_comercial  text,
  concentracao    text,
  forma           text,
  via             text,
  frequencia      text,
  duracao_dias    int,
  quantidade      text,
  retencao        boolean not null default false
);

create index if not exists receita_item_receita_idx    on receita_item (receita_id);
create index if not exists receita_item_principio_idx  on receita_item (lower(principio_ativo));

-- ---------- RLS ----------
alter table receita       enable row level security;
alter table receita_item  enable row level security;

drop policy if exists receita_all on receita;
create policy receita_all on receita
  for all to authenticated using (true) with check (true);

drop policy if exists receita_item_all on receita_item;
create policy receita_item_all on receita_item
  for all to authenticated using (true) with check (true);

-- ---------- Storage ----------
insert into storage.buckets (id, name, public)
values ('receitas', 'receitas', false)
on conflict (id) do nothing;

drop policy if exists receitas_bucket_rw on storage.objects;
create policy receitas_bucket_rw on storage.objects
  for all to authenticated
  using (bucket_id = 'receitas')
  with check (bucket_id = 'receitas');
