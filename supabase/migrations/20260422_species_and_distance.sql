-- ═══════════════════════════════════════════════════════════════════════════════
-- Migración: agregar columna species + reemplazar find_similar_pets_by_id
-- con filtros de especie y distancia geográfica dinámica
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Agregar columna species (idempotente)
ALTER TABLE pets ADD COLUMN IF NOT EXISTS species text;

-- 2. Reemplazar la RPC con nuevos filtros + columna distance_km en el output
-- DROP previo porque agregamos distance_km al RETURNS TABLE:
-- CREATE OR REPLACE no permite cambiar return type.
DROP FUNCTION IF EXISTS find_similar_pets_by_id(uuid);

CREATE OR REPLACE FUNCTION find_similar_pets_by_id(source_pet_id uuid)
RETURNS TABLE(
  id          uuid,
  name        text,
  status      text,
  image_url   text,
  similarity  float,
  distance_km float
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    p.id,
    p.name,
    p.status,
    p.image_url,
    1 - (p.embedding <=> src.embedding) AS similarity,
    CASE
      WHEN src.lat IS NULL OR src.lng IS NULL OR p.lat IS NULL OR p.lng IS NULL THEN NULL
      ELSE 2 * 6371 * asin(sqrt(
        power(sin(radians((p.lat - src.lat) / 2)), 2) +
        cos(radians(src.lat)) * cos(radians(p.lat)) *
        power(sin(radians((p.lng - src.lng) / 2)), 2)
      ))
    END AS distance_km
  FROM
    pets p,
    (SELECT embedding, status, species, lat, lng, created_at FROM pets WHERE id = source_pet_id) src
  WHERE
    p.id != source_pet_id
    AND p.embedding IS NOT NULL
    AND src.embedding IS NOT NULL
    AND p.status != src.status
    AND p.status IN ('lost', 'found')
    -- Filtro por especie (OR NULL = retrocompat con pets sin species poblada)
    AND (p.species = src.species OR src.species IS NULL OR p.species IS NULL)
    -- Filtro por distancia dinámica: min(max(días*10, 10), 30) km
    -- Los días se cuentan SIEMPRE desde la mascota con status='lost' del par
    AND (
      src.lat IS NULL OR src.lng IS NULL OR p.lat IS NULL OR p.lng IS NULL
      OR
      2 * 6371 * asin(sqrt(
        power(sin(radians((p.lat - src.lat) / 2)), 2) +
        cos(radians(src.lat)) * cos(radians(p.lat)) *
        power(sin(radians((p.lng - src.lng) / 2)), 2)
      )) <= LEAST(
        GREATEST(
          EXTRACT(EPOCH FROM (
            NOW() - CASE
              WHEN src.status = 'lost' THEN src.created_at
              ELSE p.created_at
            END
          )) / 86400 * 10,
          10
        ),
        30
      )
    )
  ORDER BY p.embedding <=> src.embedding
  LIMIT 30;
$$;
