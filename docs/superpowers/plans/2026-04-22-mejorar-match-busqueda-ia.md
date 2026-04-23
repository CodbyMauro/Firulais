# Mejorar match de búsqueda con IA — Plan de implementación

> **Para agentes automatizados:** SKILL REQUERIDA: Usar superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans para ejecutar este plan tarea por tarea. Los pasos usan sintaxis de checkbox (`- [ ]`) para seguimiento.

**Goal:** Aumentar la precisión de la búsqueda de mascotas similares agregando filtros estructurales (especie + distancia geográfica dinámica), mejorando el prompt de descripción, y ampliando el universo de candidatos evaluados por Claude.

**Architecture:** Las 5 palancas actúan en capas distintas del pipeline: filtros SQL (especie + distancia haversine) recortan candidatos pre-vector, un prompt estructurado produce embeddings más consistentes, constantes ajustadas amplían el top K que llega a Claude, y batching de Claude procesa los 10 candidatos en 2 lotes paralelos. Todo esto requiere una migración SQL que agrega la columna `species`, reemplaza la RPC `find_similar_pets_by_id`, y exige regenerar embeddings de las mascotas existentes mediante un script one-shot.

**Tech Stack:** Supabase (Postgres + pgvector + Edge Functions Deno), Claude Haiku vía `@anthropic-ai/sdk`, OpenAI `text-embedding-3-small`, TypeScript/React en frontend, `tsx` para scripts locales.

**Spec de referencia:** [docs/superpowers/specs/2026-04-22-mejorar-match-busqueda-ia-design.md](../specs/2026-04-22-mejorar-match-busqueda-ia-design.md)

**Nota sobre testing:** este proyecto no tiene framework de tests automatizados (sin vitest/jest). La validación usa `tsc -b` para tipos, `SELECT` queries en Supabase para SQL, y `curl` para edge functions. Cada tarea incluye un comando de verificación concreto.

---

## Orden de ejecución

1. Tareas 1-5: cambios de código, commits locales
2. Tarea 6: deploy de migración SQL y edge functions
3. Tarea 7: ejecutar script de regeneración
4. Tarea 8: verificación end-to-end con búsqueda real

Este orden garantiza que al momento de aplicar la migración, las edge functions ya están listas para escribir `species` en pets nuevos, y el filtro `OR NULL` en la RPC mantiene compatibilidad mientras el script regenera los pets existentes.

---

## Task 1: Crear migración SQL con filtros de especie y distancia

**Files:**
- Create: `supabase/migrations/20260422_species_and_distance.sql`

- [ ] **Step 1: Crear el archivo de migración completo**

Crear `supabase/migrations/20260422_species_and_distance.sql` con el contenido:

```sql
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
```

- [ ] **Step 2: Verificar sintaxis SQL localmente**

Si tenés Supabase CLI instalado:

```bash
npx supabase db lint supabase/migrations/20260422_species_and_distance.sql
```

Si no, abrir el archivo y verificar que tiene exactamente: `ALTER TABLE`, `CREATE OR REPLACE FUNCTION`, apertura `$$` y cierre `$$`, y `LIMIT 30`.

Expected: sin errores de sintaxis reportados.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260422_species_and_distance.sql
git commit -m "feat(db): agregar filtros de especie y distancia a find_similar_pets_by_id"
```

---

## Task 2: Actualizar generate-pet-embedding con prompt JSON y species

**Files:**
- Modify: `supabase/functions/generate-pet-embedding/index.ts:39-68` (función `describeAnimal`)
- Modify: `supabase/functions/generate-pet-embedding/index.ts:112-126` (handler — guardar `species`)

- [ ] **Step 1: Reemplazar la función `describeAnimal`**

En `supabase/functions/generate-pet-embedding/index.ts`, reemplazar la función `describeAnimal` completa (líneas 39-68) con:

```typescript
async function describeAnimal(imageUrl: string): Promise<{ species: string; description: string }> {
  const img = await fetchAsBase64(imageUrl);

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 400,
    messages: [{
      role: "user",
      content: [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: img.media_type as "image/jpeg" | "image/png" | "image/webp",
            data: img.data,
          },
        },
        {
          type: "text",
          text: `Analizá esta imagen de un animal y respondé SOLO con JSON válido con esta estructura exacta:
{"species":"dog"|"cat"|"other","description":"..."}

El campo "description" debe tener exactamente 5 oraciones en español, una por aspecto, en este orden:
1. Especie + raza o mix + tamaño (pequeño/mediano/grande).
2. Color principal + colores secundarios.
3. Patrones de pelaje (manchas, atigrado, bicolor, parches específicos en cara/pecho/patas).
4. Rasgos faciales (orejas caídas o paradas, hocico, ojos).
5. Pelaje (corto/largo/rizado) + cola + marcas únicas.

Respondé SOLO con el JSON, sin explicaciones, sin code fences, sin texto adicional.`,
        },
      ],
    }],
  });

  const block = message.content[0];
  const text = block.type === "text" ? block.text : "";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`describeAnimal: no JSON en respuesta: ${text}`);

  let parsed: { species: string; description: string };
  try {
    parsed = JSON.parse(match[0]) as { species: string; description: string };
  } catch (_) {
    throw new Error(`describeAnimal: JSON.parse falló. match=${match[0]}, raw=${text}`);
  }

  if (!parsed.description || typeof parsed.description !== "string") {
    throw new Error(`describeAnimal: campo 'description' ausente en JSON: ${match[0]}`);
  }

  if (!["dog", "cat", "other"].includes(parsed.species)) {
    console.warn(`[embedding] species inesperada "${parsed.species}", normalizando a "other"`);
    parsed.species = "other";
  }

  return parsed;
}
```

- [ ] **Step 2: Actualizar el handler para guardar `species`**

En `supabase/functions/generate-pet-embedding/index.ts`, reemplazar el bloque que llama a `describeAnimal` y hace el UPDATE (actualmente líneas 112-126) con:

```typescript
    console.log(`[embedding] procesando pet ${petId}`);

    const { species, description } = await describeAnimal(pet.image_url);
    console.log(`[embedding] species=${species}, descripción: ${description}`);

    const embedding = await getTextEmbedding(description);
    console.log(`[embedding] ${embedding.length} dims generados`);

    const { error: updateErr } = await supabase
      .from("pets")
      .update({
        embedding: `[${embedding.join(",")}]`,
        ai_description: description,
        species,
      })
      .eq("id", petId);

    if (updateErr) throw updateErr;
```

- [ ] **Step 3: Verificar presencia de los cambios clave**

```bash
grep -E "(species|description).*: string" supabase/functions/generate-pet-embedding/index.ts
grep -n "species," supabase/functions/generate-pet-embedding/index.ts
```

Expected:
- Primera línea: la signature de retorno de `describeAnimal` con `{ species: string; description: string }`.
- Segunda: la línea del `update({ ..., species })` dentro del handler.

(No hay comando local simple para type-checking de edge functions Deno sin `deno` instalado. La validación completa ocurre al deploy en Task 7.)

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/generate-pet-embedding/index.ts
git commit -m "feat(edge): describeAnimal retorna species+description en JSON estructurado"
```

---

## Task 3: Actualizar find-similar-pets con prompt + species + tipo SimilarPet

**Files:**
- Modify: `supabase/functions/find-similar-pets/index.ts:47-74` (función `describeAnimal`)
- Modify: `supabase/functions/find-similar-pets/index.ts:90-102` (función `generateAndSaveEmbedding`)
- Modify: `supabase/functions/find-similar-pets/index.ts:137-144` (tipo `SimilarPet`)

- [ ] **Step 1: Reemplazar `describeAnimal` con el mismo contenido que Task 2**

En `supabase/functions/find-similar-pets/index.ts`, reemplazar la función `describeAnimal` completa (líneas 47-74) con el **mismo código exacto** que se agregó en Task 2 Step 1. Reproducido para claridad:

```typescript
async function describeAnimal(imageUrl: string): Promise<{ species: string; description: string }> {
  const img = await fetchAsBase64(imageUrl);

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 400,
    messages: [{
      role: "user",
      content: [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: img.media_type as "image/jpeg" | "image/png" | "image/webp",
            data: img.data,
          },
        },
        {
          type: "text",
          text: `Analizá esta imagen de un animal y respondé SOLO con JSON válido con esta estructura exacta:
{"species":"dog"|"cat"|"other","description":"..."}

El campo "description" debe tener exactamente 5 oraciones en español, una por aspecto, en este orden:
1. Especie + raza o mix + tamaño (pequeño/mediano/grande).
2. Color principal + colores secundarios.
3. Patrones de pelaje (manchas, atigrado, bicolor, parches específicos en cara/pecho/patas).
4. Rasgos faciales (orejas caídas o paradas, hocico, ojos).
5. Pelaje (corto/largo/rizado) + cola + marcas únicas.

Respondé SOLO con el JSON, sin explicaciones, sin code fences, sin texto adicional.`,
        },
      ],
    }],
  });

  const block = message.content[0];
  const text = block.type === "text" ? block.text : "";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`describeAnimal: no JSON en respuesta: ${text}`);

  let parsed: { species: string; description: string };
  try {
    parsed = JSON.parse(match[0]) as { species: string; description: string };
  } catch (_) {
    throw new Error(`describeAnimal: JSON.parse falló. match=${match[0]}, raw=${text}`);
  }

  if (!parsed.description || typeof parsed.description !== "string") {
    throw new Error(`describeAnimal: campo 'description' ausente en JSON: ${match[0]}`);
  }

  if (!["dog", "cat", "other"].includes(parsed.species)) {
    console.warn(`[embedding] species inesperada "${parsed.species}", normalizando a "other"`);
    parsed.species = "other";
  }

  return parsed;
}
```

- [ ] **Step 2: Actualizar `generateAndSaveEmbedding` para guardar `species`**

Reemplazar la función `generateAndSaveEmbedding` (líneas 90-102) con:

```typescript
async function generateAndSaveEmbedding(petId: string, imageUrl: string): Promise<void> {
  const { species, description } = await describeAnimal(imageUrl);
  const embedding = await getTextEmbedding(description);
  const { error } = await supabase
    .from("pets")
    .update({
      embedding: `[${embedding.join(",")}]`,
      ai_description: description,
      species,
    })
    .eq("id", petId);
  if (error) throw error;
  console.log(`[embedding] generado para pet ${petId} (species=${species}): ${description}`);
}
```

- [ ] **Step 3: Actualizar el tipo `SimilarPet` para incluir `distance_km`**

Reemplazar el tipo `SimilarPet` (líneas 137-144) con:

```typescript
export type SimilarPet = {
  id: string;
  name: string | null;
  status: string;
  image_url: string | null;
  similarity: number;
  ai_score: number;
  distance_km: number | null;
};
```

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/find-similar-pets/index.ts
git commit -m "feat(edge): sincronizar describeAnimal + agregar distance_km a SimilarPet"
```

---

## Task 4: find-similar-pets — ajustar constantes y agregar batching

**Files:**
- Modify: `supabase/functions/find-similar-pets/index.ts:19-21` (constantes)
- Modify: `supabase/functions/find-similar-pets/index.ts:146-185` (función `runClaudeSearch`)

- [ ] **Step 1: Actualizar constantes `TOP_K` y `AI_THRESHOLD`**

En `supabase/functions/find-similar-pets/index.ts`, reemplazar las constantes (líneas 19-21) con:

```typescript
const TOP_K         = 10;
const AI_THRESHOLD  = 25;
const FREE_SEARCHES = 2;
const CLAUDE_BATCH_SIZE = 5;
```

- [ ] **Step 2: Refactorizar `runClaudeSearch` para soportar batching**

Reemplazar la función `runClaudeSearch` completa (líneas 146-185) con las dos funciones siguientes:

```typescript
async function runClaudeBatch(
  sourceImg: { data: string; media_type: string },
  batch: SimilarPet[],
): Promise<SimilarPet[]> {
  const withImage = batch.filter(c => c.image_url);
  if (!withImage.length) return [];

  const candidateImgs = await Promise.all(withImage.map(c => fetchAsBase64(c.image_url!)));

  // deno-lint-ignore no-explicit-any
  const content: any[] = [
    { type: "image", source: { type: "base64", media_type: sourceImg.media_type, data: sourceImg.data } },
    { type: "text", text: "Esta es la mascota de referencia. Comparala con cada candidato:" },
    ...withImage.flatMap((_, i) => [
      { type: "text", text: `Candidato ${i + 1}:` },
      { type: "image", source: { type: "base64", media_type: candidateImgs[i].media_type, data: candidateImgs[i].data } },
    ]),
    {
      type: "text",
      text: `Analizá raza, color, marcas, forma de cara/orejas. ¿Cuál es la misma mascota?
Respondé SOLO con JSON: [{"index":1,"score":85},{"index":2,"score":10},...]
Score 0 = definitivamente NO, 100 = casi seguro que SÍ.`,
    },
  ];

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 400,
    messages: [{ role: "user", content }],
  });

  const raw    = message.content[0].type === "text" ? message.content[0].text : "[]";
  const match  = raw.match(/\[[\s\S]*\]/);
  const scores = match ? JSON.parse(match[0]) as { index: number; score: number }[] : [];

  return withImage.map((pet, i) => ({
    ...pet,
    ai_score: scores.find(s => s.index === i + 1)?.score ?? 0,
  }));
}

async function runClaudeSearch(sourcePet: { image_url: string }, candidates: SimilarPet[]): Promise<SimilarPet[]> {
  if (!candidates.length) return [];

  const sourceImg = await fetchAsBase64(sourcePet.image_url);

  const batches: SimilarPet[][] = [];
  for (let i = 0; i < candidates.length; i += CLAUDE_BATCH_SIZE) {
    batches.push(candidates.slice(i, i + CLAUDE_BATCH_SIZE));
  }

  const batchResults = await Promise.all(batches.map(b => runClaudeBatch(sourceImg, b)));

  return batchResults
    .flat()
    .filter(p => p.ai_score >= AI_THRESHOLD)
    .sort((a, b) => b.ai_score - a.ai_score);
}
```

- [ ] **Step 3: Verificar integridad del archivo**

Leer el archivo y confirmar que:
- La constante `CLAUDE_BATCH_SIZE = 5` existe
- `TOP_K = 10` y `AI_THRESHOLD = 25`
- Existen dos funciones: `runClaudeBatch` y `runClaudeSearch`
- El tipo `SimilarPet` tiene `distance_km: number | null`

Comando:

```bash
grep -E "(TOP_K|AI_THRESHOLD|CLAUDE_BATCH_SIZE|runClaudeBatch|distance_km)" supabase/functions/find-similar-pets/index.ts
```

Expected: al menos 6 líneas de output con las referencias esperadas.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/find-similar-pets/index.ts
git commit -m "feat(edge): TOP_K=10, threshold=25, batching paralelo de Claude en lotes de 5"
```

---

## Task 5: Actualizar tipo SimilarPet en petsService.ts

**Files:**
- Modify: `src/lib/petsService.ts:174-181` (tipo `SimilarPet`)

- [ ] **Step 1: Agregar `distance_km` al tipo**

En `src/lib/petsService.ts`, reemplazar el tipo `SimilarPet` (líneas 174-181) con:

```typescript
export type SimilarPet = {
  id: string;
  name: string | null;
  status: string;
  image_url: string | null;
  similarity: number;
  ai_score?: number;
  /** Distancia en km al reporte source. null si alguna de las dos mascotas no tiene coordenadas. Opcional para tolerar entries de cache generadas antes del cambio. */
  distance_km?: number | null;
};
```

- [ ] **Step 2: Verificar compilación TypeScript**

```bash
npx tsc -b --noEmit
```

Expected: salida vacía (sin errores). Si aparecen errores en archivos que consumen `SimilarPet` (como `PetDetailScreen.tsx` o similares), significa que hay código que espera el tipo viejo. Revisar cada uso y actualizar si es necesario, luego volver a correr tsc.

- [ ] **Step 3: Commit**

```bash
git add src/lib/petsService.ts
git commit -m "feat(types): agregar distance_km a SimilarPet"
```

---

## Task 6: Crear script de regeneración de embeddings

**Files:**
- Create: `scripts/regenerate-embeddings.ts`

- [ ] **Step 1: Verificar que existe `.env` con las credenciales necesarias**

```bash
grep -E "^(SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY)=" .env 2>/dev/null || echo "FALTAN VARIABLES"
```

Expected: dos líneas con las variables. Si dice `FALTAN VARIABLES`, agregar al `.env`:
- `SUPABASE_URL=https://<project-ref>.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY=<service-role-key-de-dashboard>`

No commitear `.env`. Verificar que está en `.gitignore`:

```bash
grep -E "^\.env$" .gitignore
```

Expected: `.env` listado.

- [ ] **Step 2: Crear el script**

Crear `scripts/regenerate-embeddings.ts`:

```typescript
/**
 * Regenera embedding, ai_description y species para todas las mascotas existentes
 * invocando la edge function generate-pet-embedding actualizada.
 *
 * Uso:
 *   npx tsx scripts/regenerate-embeddings.ts
 *
 * Requiere en .env:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const CONCURRENCY = 3;

type RegenResult = { ok: boolean; petId: string; error?: string };

async function regeneratePet(petId: string): Promise<RegenResult> {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-pet-embedding`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ petId }),
    });
    if (!res.ok) return { ok: false, petId, error: `HTTP ${res.status}: ${await res.text()}` };
    return { ok: true, petId };
  } catch (err) {
    return { ok: false, petId, error: String(err) };
  }
}

async function main() {
  const { data: pets, error } = await supabase
    .from("pets")
    .select("id")
    .not("image_url", "is", null);

  if (error) throw error;
  if (!pets || pets.length === 0) {
    console.log("No hay mascotas para regenerar.");
    return;
  }

  console.log(`Regenerando ${pets.length} mascotas (concurrency=${CONCURRENCY})...`);

  let done = 0;
  let failed = 0;
  const queue = [...pets];

  async function worker() {
    while (queue.length > 0) {
      const pet = queue.shift();
      if (!pet) return;
      const result = await regeneratePet(pet.id as string);
      done++;
      if (!result.ok) {
        failed++;
        console.error(`[${done}/${pets.length}] FALLO ${result.petId}: ${result.error}`);
      } else {
        console.log(`[${done}/${pets.length}] OK ${result.petId}`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  console.log(`\nCompletado. ${done - failed} ok, ${failed} fallos.`);
  if (failed > 0) process.exit(1);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 3: Instalar `dotenv` y `tsx` si no están**

Verificar y agregar como devDependencies:

```bash
npm install --save-dev tsx dotenv
```

Expected: `package.json` actualizado con ambos paquetes. (`dotenv` es una dep necesaria del script, `tsx` para ejecutarlo.)

- [ ] **Step 4: Verificar compilación del script**

```bash
npx tsc --noEmit --target es2022 --module esnext --moduleResolution bundler scripts/regenerate-embeddings.ts
```

Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add scripts/regenerate-embeddings.ts package.json package-lock.json
git commit -m "feat(scripts): script one-shot para regenerar embeddings con prompt nuevo"
```

---

## Task 7: Deploy — aplicar migración SQL y edge functions

> **Esta tarea no produce commits nuevos** — todo el código ya está versionado. Esto es deploy a Supabase.

- [ ] **Step 1: Aplicar migración SQL**

Opción A (recomendada, requiere Supabase CLI linkeado al proyecto):

```bash
npx supabase db push
```

Opción B (manual, vía dashboard): abrir [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql), pegar el contenido completo de `supabase/migrations/20260422_species_and_distance.sql` y ejecutar.

Expected: mensajes "ALTER TABLE" y "CREATE FUNCTION" sin errores.

- [ ] **Step 2: Verificar que la migración se aplicó**

Ejecutar en Supabase SQL Editor:

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'pets' AND column_name = 'species';

SELECT pg_get_functiondef('find_similar_pets_by_id(uuid)'::regprocedure);
```

Expected: primera query devuelve una fila con `species`. Segunda devuelve la definición nueva de la función que contiene `distance_km` y `LEAST(GREATEST(...))`.

- [ ] **Step 3: Deploy edge function `generate-pet-embedding`**

```bash
npx supabase functions deploy generate-pet-embedding
```

Expected: mensaje de deploy exitoso. Verificar con:

```bash
curl -i -X POST "$SUPABASE_URL/functions/v1/generate-pet-embedding" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"petId":"<id-de-una-mascota-con-imagen>"}'
```

(Reemplazar `<id-de-una-mascota-con-imagen>` por un UUID real de la tabla `pets`.)

Expected: `HTTP 200` con body `{"success":true,"petId":"..."}`. En la tabla `pets` esa fila ahora tiene `species` poblado.

- [ ] **Step 4: Deploy edge function `find-similar-pets`**

```bash
npx supabase functions deploy find-similar-pets
```

Expected: mensaje de deploy exitoso. Probar con:

```bash
curl -i -X POST "$SUPABASE_URL/functions/v1/find-similar-pets" \
  -H "Authorization: Bearer <JWT-de-usuario-autenticado>" \
  -H "Content-Type: application/json" \
  -d '{"petId":"<id-de-una-mascota>","forceRefresh":true}'
```

Expected: `HTTP 200` con body `{"results":[...],"fromCache":false,...}`. Los `results` pueden incluir `distance_km`.

Nota: `find-similar-pets` tiene `verify_jwt = false` pero la función verifica auth internamente leyendo el header, así que necesitás un JWT real de usuario (no service_role).

---

## Task 8: Ejecutar regeneración masiva

> **Esta tarea no produce commit** — solo ejecuta el script.

- [ ] **Step 1: Backup rápido antes de regenerar**

Antes de correr el script, dejar constancia del estado actual en caso de que haga falta revertir:

```sql
-- Ejecutar en Supabase SQL Editor
SELECT id, ai_description, species FROM pets WHERE image_url IS NOT NULL ORDER BY created_at DESC LIMIT 5;
```

Guardar la salida en un archivo temporal local (pegarlo en un `.txt` fuera del repo) por si hay que comparar.

- [ ] **Step 2: Ejecutar el script**

```bash
npx tsx scripts/regenerate-embeddings.ts
```

Expected: líneas `[N/total] OK <uuid>` por cada mascota, terminando con `Completado. X ok, 0 fallos.`. Si hay fallos, revisar los logs de Supabase Edge Functions para la causa.

- [ ] **Step 3: Verificar que todas las mascotas tienen `species` poblada**

En Supabase SQL Editor:

```sql
SELECT
  COUNT(*) FILTER (WHERE species IS NOT NULL) AS con_species,
  COUNT(*) FILTER (WHERE species IS NULL) AS sin_species,
  COUNT(*) FILTER (WHERE ai_description IS NOT NULL) AS con_descripcion,
  COUNT(*) AS total
FROM pets
WHERE image_url IS NOT NULL;
```

Expected: `con_species = total` y `sin_species = 0`. Si no, identificar qué mascotas fallaron:

```sql
SELECT id, image_url FROM pets
WHERE image_url IS NOT NULL AND species IS NULL;
```

Re-ejecutar el script (re-procesa todas, es idempotente) o disparar manualmente `generate-pet-embedding` para los IDs faltantes.

- [ ] **Step 4: Verificar consistencia del nuevo prompt**

```sql
SELECT id, species, ai_description FROM pets
WHERE image_url IS NOT NULL
ORDER BY RANDOM() LIMIT 3;
```

Expected: descripciones con aproximadamente 5 oraciones estructuradas cada una, y `species` en `{'dog','cat','other'}`.

---

## Task 9: Verificación end-to-end

> **Esta tarea no produce commit de código** — solo valida que el match mejoró.

- [ ] **Step 1: Identificar dos mascotas de prueba que deberían matchear**

Elegir dos mascotas en la BD que representen el mismo perro/gato (una `lost` y una `found`, misma especie, cercanas geográficamente). Anotar los dos UUIDs.

Comando útil:

```sql
SELECT id, name, status, species, location, lat, lng, created_at
FROM pets
ORDER BY created_at DESC LIMIT 10;
```

- [ ] **Step 2: Ejecutar búsqueda desde la mascota "lost"**

Desde la app o vía curl (necesita JWT de usuario):

```bash
curl -X POST "$SUPABASE_URL/functions/v1/find-similar-pets" \
  -H "Authorization: Bearer <JWT-usuario>" \
  -H "Content-Type: application/json" \
  -d '{"petId":"<uuid-mascota-lost>","forceRefresh":true}' | jq
```

- [ ] **Step 3: Validar el resultado**

Esperar en el JSON `results`:

- La mascota que esperabas matchear aparece en `results[]`
- Cada resultado incluye `distance_km` (número o null)
- Cada resultado tiene `ai_score >= 25`
- El orden es descendente por `ai_score`

Si la mascota correcta aparece: **las 5 palancas están funcionando**. Registrar el score obtenido.

Si no aparece: revisar en los logs de Edge Functions qué filtro la descartó:
- ¿Misma especie detectada? (chequear `species` de ambas en BD)
- ¿Distancia dentro del radio permitido? (calcular con la fórmula haversine a mano o vía SQL)
- ¿Embedding generado correctamente? (chequear `embedding IS NOT NULL`)

- [ ] **Step 4: Documentar el resultado en el repo**

Agregar al archivo de spec una sección al final:

```markdown
## Resultado de la validación (post-deploy)

**Fecha:** [fecha actual]
**Baseline pre-cambio:** [score/posición de la mascota esperada en la búsqueda vieja, o "no aparecía"]
**Post-cambio:** [score/posición actual]
**Conclusión:** [match mejoró / no cambió / empeoró — y breve motivo]
```

Commit:

```bash
git add docs/superpowers/specs/2026-04-22-mejorar-match-busqueda-ia-design.md
git commit -m "docs(spec): registrar resultado de validación post-deploy"
```

---

## Rollback (si el resultado es peor)

Si la validación muestra que el match empeoró, los cambios son reversibles sin perder datos:

1. **Revertir constantes** en `find-similar-pets/index.ts`: `TOP_K=5`, `AI_THRESHOLD=40`. Redeploy.
2. **Relajar filtro de distancia** subiendo el cap en la RPC (30 → 100 km) o removiéndolo completo.
3. **Volver al prompt viejo**: el prompt viejo no retornaba JSON, así que habría que también revertir el parseo en ambas edge functions. Alternativa: mantener el prompt nuevo pero solo revertir constantes/batching.
4. **Columna `species`**: no hace falta dropearla — el filtro `OR NULL` la vuelve inocua si se llenan todas con NULL (pero eso rompe el filtro de especie).

Cada rollback es un redeploy simple. La migración SQL se puede recrear con la definición vieja de la RPC desde `20260413_embedding_openai.sql`.

---

## Resumen de commits esperados

1. `feat(db): agregar filtros de especie y distancia a find_similar_pets_by_id` (Task 1)
2. `feat(edge): describeAnimal retorna species+description en JSON estructurado` (Task 2)
3. `feat(edge): sincronizar describeAnimal + agregar distance_km a SimilarPet` (Task 3)
4. `feat(edge): TOP_K=10, threshold=25, batching paralelo de Claude en lotes de 5` (Task 4)
5. `feat(types): agregar distance_km a SimilarPet` (Task 5)
6. `feat(scripts): script one-shot para regenerar embeddings con prompt nuevo` (Task 6)
7. `docs(spec): registrar resultado de validación post-deploy` (Task 9)

Tasks 7 y 8 son deploy/ejecución, sin commit de código.
