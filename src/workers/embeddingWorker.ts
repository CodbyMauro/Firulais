// Solo corre el modelo ViT — sin background removal (usa DOM y no funciona en workers)
import { createClient } from "@supabase/supabase-js";

function getSupabase(accessToken: string) {
  return createClient(
    import.meta.env.VITE_SUPABASE_URL as string,
    import.meta.env.VITE_SUPABASE_ANON_KEY as string,
    { global: { headers: { Authorization: `Bearer ${accessToken}` } } },
  );
}

let _pipe: unknown = null;

async function getPipeline() {
  if (!_pipe) {
    // @ts-ignore – optional peer dep loaded dynamically
    const { pipeline, env } = await import("@xenova/transformers");
    env.allowLocalModels = false;
    env.useBrowserCache = true;
    _pipe = await pipeline("image-feature-extraction", "Xenova/vit-base-patch16-224-in21k");
  }
  return _pipe;
}

const HIDDEN_SIZE = 768;

// Recibe: { petId, imageUrl, accessToken }
self.onmessage = async (e: MessageEvent<{ petId: string; imageUrl: string; accessToken: string }>) => {
  const { petId, imageUrl, accessToken } = e.data;
  console.log("[worker] procesando embedding para pet:", petId);
  try {
    const pipe = await getPipeline();
    console.log("[worker] modelo listo, generando embedding...");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const output = await (pipe as any)(imageUrl) as { data: Float32Array };
    const data = output.data;
    const cls = Array.from(data.slice(0, HIDDEN_SIZE));
    const norm = Math.sqrt(cls.reduce((s, v) => s + v * v, 0));
    const embedding = cls.map(v => v / norm);

    const supabase = getSupabase(accessToken);
    const { error, data: updated } = await supabase
      .from("pets")
      .update({ embedding: `[${embedding.join(",")}]` })
      .eq("id", petId)
      .select("id");

    if (error) console.error("[worker] error guardando embedding:", error);
    else if (!updated?.length) console.warn("[worker] RLS bloqueó el update — 0 filas afectadas. petId:", petId);
    else console.log("[worker] embedding guardado correctamente para pet:", petId);
  } catch (err) {
    console.error("[worker] error:", err);
  }
};
