-- Bank movements without details (#132): some banks send only amount and date, so they all arrive as
-- "Movimento bancario". Their description and category may be inferred from the account history;
-- inferred_from keeps how many earlier movements backed the guess (null = not inferred), shown to
-- the user until they edit the movement.
alter table transactions add column inferred_from smallint check (inferred_from > 0);

-- The placeholder identifies nothing: a category match on it put every such payment in one category.
delete from account_category_matches where description_key = 'movimento bancario';
