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
