-- Búsqueda insensible a tildes: columna generada + extensión unaccent (Supabase / Postgres).
-- La app filtra con .ilike('search_fold', ...) usando el mismo criterio que foldAccents() en cliente.

CREATE EXTENSION IF NOT EXISTS unaccent;

ALTER TABLE pets DROP COLUMN IF EXISTS search_fold;

ALTER TABLE pets ADD COLUMN search_fold text GENERATED ALWAYS AS (
  lower(
    unaccent(
      'unaccent',
      trim(
        coalesce(name, '') || ' ' ||
        coalesce(breed, '') || ' ' ||
        coalesce(color, '') || ' ' ||
        coalesce(location, '')
      )
    )
  )
) STORED;
