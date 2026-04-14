-- ═══════════════════════════════════════════════════════════════════════════════
-- Migración: reemplazar embedding ViT (768 dims) por OpenAI text-embedding-3-small (1536 dims)
-- Ejecutar en Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Eliminar índice existente sobre la columna embedding
DROP INDEX IF EXISTS pets_embedding_idx;
DROP INDEX IF EXISTS pets_embedding_hnsw_idx;

-- 2. Cambiar dimensión de la columna
--    No hay cast directo entre vector(768) y vector(1536), se hace drop+add
ALTER TABLE pets DROP COLUMN IF EXISTS embedding;
ALTER TABLE pets ADD COLUMN embedding vector(1536);

-- 3. Agregar columna para la descripción generada por IA
ALTER TABLE pets ADD COLUMN IF NOT EXISTS ai_description text;

-- 4. Recrear índice HNSW (más rápido que IVFFlat para búsquedas en tiempo real)
--    m=16 y ef_construction=64 son valores recomendados para tablas medianas
CREATE INDEX pets_embedding_hnsw_idx
  ON pets USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- 5. Recrear la función RPC con filtro de status cruzado
--    Una mascota perdida solo busca entre las encontradas, y viceversa
CREATE OR REPLACE FUNCTION find_similar_pets_by_id(source_pet_id uuid)
RETURNS TABLE(
  id         uuid,
  name       text,
  status     text,
  image_url  text,
  similarity float
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    p.id,
    p.name,
    p.status,
    p.image_url,
    1 - (p.embedding <=> src.embedding) AS similarity
  FROM
    pets p,
    (SELECT embedding, status FROM pets WHERE id = source_pet_id) src
  WHERE
    p.id != source_pet_id
    AND p.embedding IS NOT NULL
    AND src.embedding IS NOT NULL
    -- Filtro cruzado: perdida busca encontradas, encontrada busca perdidas
    AND p.status != src.status
    AND p.status IN ('lost', 'found')
  ORDER BY p.embedding <=> src.embedding
  LIMIT 20;
$$;
