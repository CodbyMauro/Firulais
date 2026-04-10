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

async function removeBg(imageUrl: string): Promise<string> {
  try {
    // @ts-ignore – optional peer dep loaded dynamically
    const { removeBackground } = await import("@imgly/background-removal");
    const blob = await removeBackground(imageUrl, {
      model: "small",
      output: { type: "image/png" },
    });
    return URL.createObjectURL(blob);
  } catch {
    return imageUrl;
  }
}

const HIDDEN_SIZE = 768;

/** Precarga ambos modelos en background — llamar al iniciar la app */
export async function preloadModels(): Promise<void> {
  try {
    await getPipeline();
  } catch {
    // Silencioso — precarga opcional
  }
}

export async function generateImageEmbedding(imageUrl: string): Promise<number[]> {
  const cleanUrl = await removeBg(imageUrl);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pipe = await getPipeline() as any;
  const output = await pipe(cleanUrl);
  const data = output.data as Float32Array;
  const cls = Array.from(data.slice(0, HIDDEN_SIZE));
  if (cleanUrl !== imageUrl) URL.revokeObjectURL(cleanUrl);
  const norm = Math.sqrt(cls.reduce((s, v) => s + v * v, 0));
  return cls.map(v => v / norm);
}
