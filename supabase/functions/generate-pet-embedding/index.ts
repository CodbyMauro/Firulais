import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.27.0";

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY  = Deno.env.get("SERVICE_ROLE_KEY")!;
const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const OPENAI_KEY    = Deno.env.get("OPENAI_API_KEY")!;

const supabase  = createClient(SUPABASE_URL, SUPABASE_KEY);
const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY });

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

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

async function describeAnimal(imageUrl: string): Promise<string> {
  const img = await fetchAsBase64(imageUrl);

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 200,
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
          text: `Describí este animal para identificarlo si está perdido.
Incluí: especie (perro/gato/otro), raza o características de raza, color principal del pelaje, colores secundarios o patrones (manchas, bicolor, tricolor, atigrado), marcas distintivas (parches de color, manchas en cara/pecho/patas), tamaño aproximado (pequeño/mediano/grande), y forma de orejas y cola si son visibles.
Solo la descripción, sin introducción ni comentarios. Máximo 3 oraciones.`,
        },
      ],
    }],
  });

  const block = message.content[0];
  return block.type === "text" ? block.text : "";
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

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: CORS });

  let petId: string;

  try {
    const body = await req.json();
    petId = body.petId ?? body.record?.id;
    if (!petId) throw new Error("petId requerido");
  } catch (err) {
    return json({ error: String(err) }, 400);
  }

  try {
    // Siempre leer la imagen desde la DB — no confiar en el cliente
    const { data: pet, error: fetchErr } = await supabase
      .from("pets")
      .select("image_url")
      .eq("id", petId)
      .single();

    if (fetchErr) throw fetchErr;
    if (!pet?.image_url) return json({ skipped: true, reason: "sin imagen", petId });

    console.log(`[embedding] procesando pet ${petId}`);

    const description = await describeAnimal(pet.image_url);
    console.log(`[embedding] descripción: ${description}`);

    const embedding = await getTextEmbedding(description);
    console.log(`[embedding] ${embedding.length} dims generados`);

    const { error: updateErr } = await supabase
      .from("pets")
      .update({
        embedding: `[${embedding.join(",")}]`,
        ai_description: description,
      })
      .eq("id", petId);

    if (updateErr) throw updateErr;

    console.log(`[embedding] guardado para pet ${petId}`);
    return json({ success: true, petId });

  } catch (err) {
    console.error(`[embedding] error:`, err);
    return json({ error: String(err), petId }, 500);
  }
});
