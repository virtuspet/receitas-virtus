-- Fornecedor e categoria do produto (casados com o catálogo da loja no
-- momento em que a receita é salva).
alter table receita_item add column if not exists fornecedor text;
alter table receita_item add column if not exists categoria  text;

create index if not exists receita_item_fornecedor_idx on receita_item (fornecedor);
create index if not exists receita_item_categoria_idx  on receita_item (categoria);
