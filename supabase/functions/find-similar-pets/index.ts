import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.27.0";

const SUPABASE_URL      = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY      = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const ANTHROPIC_KEY     = Deno.env.get("ANTHROPIC_API_KEY")!;
const OPENAI_KEY        = Deno.env.get("OPENAI_API_KEY")!;

const supabase  = createClient(SUPABASE_URL, SUPABASE_KEY);
const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY });

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TOP_K         = 10;
const AI_THRESHOLD  = 25;
const FREE_SEARCHES = 2;
const CLAUDE_BATCH_SIZE = 5;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

// ── Helpers compartidos ───────────────────────────────────────────────────────

async function fetchAsBase64(url: string) {
  const res    = await fetch(url);
  const buffer = await res.arrayBuffer();
  const bytes  = new Uint8Array(buffer);
  // Loop en lugar de spread para evitar stack overflow en imágenes grandes
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  const mime   = (res.headers.get("content-type") || "image/jpeg").split(";")[0];
  return { data: base64, media_type: mime };
}

// ── Generación de embedding (inlineado — evita llamadas HTTP internas) ────────

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

async function getTextEmbedding(text: string): Promise<number[]> {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: "text-embedding-3-small", input: text }),
  });
  if (!res.ok) throw new Error(`OpenAI error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.data[0].embedding as number[];
}

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

// ── Búsqueda visual con Claude ────────────────────────────────────────────────

async function getUserId(authHeader: string | null): Promise<string | null> {
  if (!authHeader) return null;
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data, error } = await userClient.auth.getUser();
  if (error) console.error("[auth] error:", error);
  return data.user?.id ?? null;
}

type ProfileData = {
  is_premium: boolean;
  premium_until: string | null;
  ai_searches_used: number;
};

async function getProfile(userId: string): Promise<ProfileData | null> {
  const { data } = await supabase
    .from("profiles")
    .select("is_premium, premium_until, ai_searches_used")
    .eq("id", userId)
    .single();
  return data ?? null;
}

function checkPremium(profile: ProfileData): boolean {
  if (profile.is_premium) return true;
  if (profile.premium_until && new Date(profile.premium_until) > new Date()) return true;
  return false;
}

export type SimilarPet = {
  id: string;
  name: string | null;
  status: string;
  image_url: string | null;
  similarity: number;
  ai_score: number;
  distance_km: number | null;
};

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
      text: `Compará cada candidato contra la mascota de referencia. Para cada uno, evaluá 4 atributos:
1. Raza o mix (pitbull, labrador, mestizo, siamés, etc.)
2. Color dominante del pelaje
3. Tamaño aproximado (pequeño/mediano/grande)
4. Marcas distintivas (manchas, parches, cicatrices, patrones)

RÚBRICA ESTRICTA — aplicá el score MÁS BAJO que corresponda:
- Raza claramente distinta (ej: pitbull vs mestizo mediano) → score máximo 30
- Color dominante distinto (ej: marrón vs gris, negro vs blanco) → score máximo 40
- Tamaño muy distinto (ej: chihuahua vs labrador) → score máximo 35
- Mismo tipo pero marcas/patrones distintos → score 50-70
- Coinciden raza, color, tamaño Y marcas principales → score 80-95
- Casi idénticos en todos los aspectos → score 96-100

Ser ESTRICTO: cuando hay duda, bajá el score. Un 85+ significa "es muy probable la misma mascota".

Respondé SOLO con JSON: [{"index":1,"score":85},{"index":2,"score":15},...]`,
    },
  ];

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 400,
    messages: [{ role: "user", content }],
  });

  const raw   = message.content[0].type === "text" ? message.content[0].text : "[]";
  const match = raw.match(/\[[\s\S]*\]/);
  let scores: { index: number; score: number }[] = [];
  if (match) {
    try {
      scores = JSON.parse(match[0]) as { index: number; score: number }[];
    } catch (err) {
      console.error("[runClaudeBatch] JSON.parse de scores falló:", err, "raw:", raw);
    }
  }

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

// ── Handler principal ─────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  let petId: string;
  let forceRefresh = false;

  try {
    const body  = await req.json();
    petId        = body.petId;
    forceRefresh = body.forceRefresh === true;
    if (!petId) throw new Error("petId requerido");
  } catch (err) {
    return json({ error: String(err) }, 400);
  }

  // ── Autenticación ─────────────────────────────────────────────────────────
  const userId = await getUserId(req.headers.get("Authorization"));
  if (!userId) return json({ error: "No autenticado" }, 401);

  // ── Perfil ────────────────────────────────────────────────────────────────
  const profile          = await getProfile(userId);
  const premium          = profile ? checkPremium(profile) : false;
  const searchesUsed     = profile?.ai_searches_used ?? 0;
  const searchesRemaining = premium ? null : Math.max(0, FREE_SEARCHES - searchesUsed);

  // ── Cache ─────────────────────────────────────────────────────────────────
  // El caché es indefinido: solo se invalida cuando el usuario pide forceRefresh.
  const { data: cache } = await supabase
    .from("pet_similarity_cache")
    .select("results, searched_at")
    .eq("pet_id", petId)
    .maybeSingle();

  const minutesAgo = cache
    ? Math.floor((Date.now() - new Date(cache.searched_at).getTime()) / 60_000)
    : null;

  if (cache) {
    if (!forceRefresh) {
      return json({ results: cache.results, fromCache: true, minutesAgo, searches_remaining: searchesRemaining });
    }
    const exhausted = !premium && searchesUsed >= FREE_SEARCHES;
    if (exhausted) {
      return json({
        error: "searches_exhausted",
        message: "Agotaste tus búsquedas gratuitas con IA. Actualizá a Premium para seguir buscando.",
        searches_remaining: 0,
        results: cache.results,
        fromCache: true,
        minutesAgo,
      }, 402);
    }
    await supabase.from("pet_similarity_cache").delete().eq("pet_id", petId);
  }

  // ── Límite de búsquedas gratuitas ────────────────────────────────────────
  if (!premium && searchesUsed >= FREE_SEARCHES) {
    return json({
      error: "searches_exhausted",
      message: "Agotaste tus búsquedas gratuitas con IA. Actualizá a Premium para seguir buscando.",
      searches_remaining: 0,
      results: [],
      fromCache: false,
      minutesAgo: null,
    }, 402);
  }

  // ── Obtener mascota fuente ────────────────────────────────────────────────
  const { data: source } = await supabase
    .from("pets")
    .select("id, image_url, embedding")
    .eq("id", petId)
    .single();

  if (!source?.image_url) {
    return json({ results: [], fromCache: false, minutesAgo: null, searches_remaining: searchesRemaining });
  }

  // ── Generar embedding si no existe (primera vez o post-migración) ─────────
  if (!source.embedding) {
    try {
      await generateAndSaveEmbedding(source.id, source.image_url);
    } catch (err) {
      console.error("[find-similar] falló generación de embedding:", err);
      return json({
        results: [],
        fromCache: false,
        minutesAgo: null,
        searches_remaining: searchesRemaining,
        embedding_pending: true,
      });
    }
  }

  // ── Buscar candidatos por similitud vectorial ────────────────────────────
  const { data: candidatesData } = await supabase.rpc("find_similar_pets_by_id", { source_pet_id: petId });
  const candidates = ((candidatesData ?? []) as SimilarPet[]).slice(0, TOP_K);

  if (!candidates.length) {
    return json({ results: [], fromCache: false, minutesAgo: null, searches_remaining: searchesRemaining });
  }

  // ── Scoring visual con Claude ────────────────────────────────────────────
  let results: SimilarPet[];
  try {
    results = await runClaudeSearch(source, candidates);
  } catch (err) {
    console.error("[find-similar] runClaudeSearch falló:", err);
    return json({
      error: "scoring_failed",
      message: "Error en el scoring visual. Intentá de nuevo.",
      results: [],
      fromCache: false,
      searches_remaining: searchesRemaining,
    }, 500);
  }

  if (!premium) {
    await supabase.from("profiles").update({ ai_searches_used: searchesUsed + 1 }).eq("id", userId);
  }

  await supabase.from("pet_similarity_cache").upsert({
    pet_id: petId,
    results,
    searched_at: new Date().toISOString(),
  });

  const newRemaining = premium ? null : Math.max(0, FREE_SEARCHES - (searchesUsed + 1));
  return json({ results, fromCache: false, minutesAgo: null, searches_remaining: newRemaining });
});
