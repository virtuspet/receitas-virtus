-- Projetos novos do Supabase não concedem mais acesso automático às tabelas
-- do schema public para os papéis da API. Libera só para usuários logados;
-- o RLS continua valendo por cima disso.
grant select, insert, update, delete on table public.receita      to authenticated;
grant select, insert, update, delete on table public.receita_item to authenticated;
