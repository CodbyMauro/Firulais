// @ts-ignore – optional peer dep
import { pipeline, env } from "@xenova/transformers";
// @ts-ignore – optional peer dep
import { removeBackground } from "@imgly/background-removal";

env.allowLocalModels = false;
env.useBrowserCache = true;

type Pipeline = Awaited<ReturnType<typeof pipeline>>;
let _pipe: Pipeline | null = null;

async function getPipeline(): Promise<Pipeline> {
  if (!_pipe) {
    _pipe = await pipeline("image-feature-extraction", "Xenova/vit-base-patch16-224-in21k");
  }
  return _pipe;
}

/**
 * Elimina el fondo usando @imgly/background-removal (ONNX/WASM, 100% en browser, gratis).
 * Devuelve un blob URL con solo el animal. Si falla, devuelve la URL original.
 */
async function removeBg(imageUrl: string): Promise<string> {
  try {
    const blob = await removeBackground(imageUrl, {
      model: "small", // modelo liviano, ~4x más rápido
      output: { type: "image/png" },
    });
    return URL.createObjectURL(blob);
  } catch {
    return imageUrl;
  }
}

const HIDDEN_SIZE = 768;

/**
 * Genera un embedding de 768 dims a partir de la imagen SIN fondo.
 * 1. @imgly/background-removal elimina el fondo en el browser (sin API key)
 * 2. ViT-B/16 genera el vector del animal aislado
 */
/** Precarga ambos modelos en background — llamar al iniciar la app */
export async function preloadModels(): Promise<void> {
  try {
    await Promise.all([
      getPipeline(),
      // Precalentar background removal con una imagen mínima
      removeBackground("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", { model: "small" }).catch(() => {}),
    ]);
  } catch {
    // Silencioso — precarga opcional
  }
}

export async function generateImageEmbedding(imageUrl: string): Promise<number[]> {
  const cleanUrl = await removeBg(imageUrl);
  const pipe = await getPipeline();
  const output = await pipe(cleanUrl);
  const data = output.data as Float32Array;
  const cls = Array.from(data.slice(0, HIDDEN_SIZE));
  if (cleanUrl !== imageUrl) URL.revokeObjectURL(cleanUrl);
  const norm = Math.sqrt(cls.reduce((s, v) => s + v * v, 0));
  return cls.map(v => v / norm);
}
