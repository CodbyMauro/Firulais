import { supabase } from "./supabase";

export interface Pet {
  id: string;
  name: string | null;
  status: "lost" | "found";
  breed: string | null;
  age: string | null;
  color: string | null;
  description: string | null;
  location: string | null;
  lat: number | null;
  lng: number | null;
  reward: string | null;
  image_url: string | null;
  reporter_id: string | null;
  reporter_name: string | null;
  created_at: string;
}

export async function fetchPets(): Promise<Pet[]> {
  const { data, error } = await supabase
    .from("pets")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Pet[];
}

const PAGE_SIZE = 10;

const CAT_BREEDS = [
  "Gato común / Europeo", "Siamés", "Persa", "Maine Coon", "Bengalí", "Ragdoll", "Angora",
];
const DOG_BREEDS = [
  "Labrador Retriever", "Golden Retriever", "Pastor Alemán", "Bulldog Francés",
  "Poodle / Caniche", "Beagle", "Chihuahua", "Dachshund / Salchicha", "Boxer",
  "Rottweiler", "Husky Siberiano", "Shih Tzu", "Yorkshire Terrier", "Maltés",
  "Pug / Carlino", "Border Collie", "Cocker Spaniel", "Doberman",
  "Pitbull / Am. Stafford", "Schnauzer",
];

export interface FetchPetsOptions {
  page: number;
  status?: "lost" | "found";
  species?: "dog" | "cat";
  search?: string;
  days?: 1 | 3 | 7 | 30;
}

export async function fetchPetsPage(options: FetchPetsOptions): Promise<{ pets: Pet[]; hasMore: boolean }> {
  const { page, status, species, search, days } = options;
  const from = page * PAGE_SIZE;
  const to   = from + PAGE_SIZE - 1;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from("pets")
    .select("*")
    .order("created_at", { ascending: false })
    .range(from, to);

  if (status) query = query.eq("status", status);
  if (species === "cat") query = query.in("breed", CAT_BREEDS);
  else if (species === "dog") query = query.in("breed", DOG_BREEDS);
  if (days) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    query = query.gte("created_at", since);
  }
  if (search?.trim()) {
    const q = search.trim();
    query = query.or(`name.ilike.%${q}%,breed.ilike.%${q}%,color.ilike.%${q}%,location.ilike.%${q}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return { pets: data as Pet[], hasMore: (data as Pet[]).length === PAGE_SIZE };
}

export async function fetchPetById(id: string): Promise<Pet | null> {
  const { data, error } = await supabase
    .from("pets")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return null;
  return data as Pet;
}

async function compressImage(file: File, maxSize = 1200, quality = 0.82): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxSize || height > maxSize) {
        if (width > height) { height = Math.round((height * maxSize) / width); width = maxSize; }
        else { width = Math.round((width * maxSize) / height); height = maxSize; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Error al comprimir imagen")), "image/jpeg", quality);
    };
    img.onerror = reject;
    img.src = url;
  });
}

export async function uploadPetImage(file: File, userId: string): Promise<string> {
  const compressed = await compressImage(file);
  const path = `${userId}/${Date.now()}.jpg`;
  const { error } = await supabase.storage.from("pet-images").upload(path, compressed, { contentType: "image/jpeg" });
  if (error) throw error;
  const { data } = supabase.storage.from("pet-images").getPublicUrl(path);
  return data.publicUrl;
}

export interface CreatePetInput {
  name: string;
  status: "lost" | "found";
  breed: string;
  age: string;
  color: string;
  description: string;
  location: string;
  lat: number | null;
  lng: number | null;
  reward: string;
  image_url: string | null;
  reporter_id: string;
  reporter_name: string;
}

export async function deletePet(id: string): Promise<void> {
  const { error } = await supabase.from("pets").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchMyPets(userId: string): Promise<Pet[]> {
  const { data, error } = await supabase
    .from("pets")
    .select("*")
    .eq("reporter_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Pet[];
}

export async function createPet(input: CreatePetInput): Promise<Pet> {
  const { data, error } = await supabase
    .from("pets")
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  const pet = data as Pet;

  // Generar embedding en background — no bloquea el flujo principal
  if (pet.image_url) {
    generateAndSaveEmbedding(pet.id, pet.image_url);
  }

  return pet;
}

let _worker: Worker | null = null;

function getEmbeddingWorker(): Worker | null {
  if (!_worker) {
    try {
      _worker = new Worker(
        new URL("../workers/embeddingWorker.ts", import.meta.url),
        { type: "module" },
      );
    } catch {
      console.warn("[embedding] Worker no disponible en este entorno");
      return null;
    }
  }
  return _worker;
}

/**
 * Después de remover el fondo, recorta al bounding box real del animal.
 * Elimina las áreas transparentes que agregan ruido al embedding.
 */
function cropToBoundingBox(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const blobUrl = URL.createObjectURL(blob);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(blobUrl);

      const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let minX = width, maxX = 0, minY = height, maxY = 0;

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (data[(y * width + x) * 4 + 3] > 10) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      if (minX >= maxX || minY >= maxY) {
        // Fallback: sin animal detectado, usar blob original
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
        return;
      }

      // Padding de 5% del tamaño para no cortar bordes
      const pad = Math.round(Math.min(width, height) * 0.05);
      const x = Math.max(0, minX - pad);
      const y = Math.max(0, minY - pad);
      const w = Math.min(width, maxX + pad) - x;
      const h = Math.min(height, maxY + pad) - y;

      const cropped = document.createElement("canvas");
      cropped.width = w;
      cropped.height = h;
      cropped.getContext("2d")!.drawImage(canvas, x, y, w, h, 0, 0, w, h);

      cropped.toBlob((croppedBlob) => {
        if (!croppedBlob) { reject(new Error("crop failed")); return; }
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(croppedBlob);
      }, "image/png");
    };
    img.onerror = reject;
    img.src = blobUrl;
  });
}

/**
 * Genera el embedding en background:
 * 1. Background removal → solo el animal
 * 2. Crop al bounding box → elimina transparencias
 * 3. ViT inference en Web Worker (no bloquea la UI)
 */
export function generateAndSaveEmbedding(petId: string, imageUrl: string): void {
  const run = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      console.warn("[embedding] sin sesión activa, cancelando embedding");
      return;
    }

    let dataUrl = imageUrl;
    try {
      // @ts-ignore – optional peer dep not installed in all envs
      const { removeBackground } = await import("@imgly/background-removal");
      console.log("[embedding] removiendo fondo...");
      const blob = await removeBackground(imageUrl, { model: "isnet_quint8", output: { format: "image/png" } });
      console.log("[embedding] recortando al animal...");
      dataUrl = await cropToBoundingBox(blob);
      console.log("[embedding] listo, enviando al worker...");
    } catch (err) {
      console.warn("[embedding] preprocesamiento falló, usando imagen original:", err);
    }
    getEmbeddingWorker()?.postMessage({ petId, imageUrl: dataUrl, accessToken: session.access_token });
  };

  if (typeof requestIdleCallback !== "undefined") {
    requestIdleCallback(() => run(), { timeout: 2000 });
  } else {
    setTimeout(run, 500);
  }
}

export type SimilarPet = {
  id: string;
  name: string | null;
  status: string;
  image_url: string | null;
  similarity: number;
  ai_score?: number;
};

export type SimilarPetsResponse = {
  results: SimilarPet[];
  fromCache: boolean;
  minutesAgo: number | null;
  error?: string;
  /** Búsquedas gratuitas restantes (null = premium, sin límite) */
  searches_remaining?: number | null;
  /** Solo presente cuando error === "premium_required" */
  premium_required?: boolean;
  /** Solo presente cuando error === "searches_exhausted" */
  searches_exhausted?: boolean;
};

async function callFindSimilar(petId: string, forceRefresh: boolean): Promise<SimilarPetsResponse> {
  const { data: { session } } = await supabase.auth.getSession();

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/find-similar-pets`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ petId, forceRefresh }),
    },
  );

  const data = await res.json();
  if (res.status === 402) {
    const exhausted = data.error === "searches_exhausted";
    return {
      ...data,
      results: data.results ?? [],
      premium_required: !exhausted,
      searches_exhausted: exhausted,
    };
  }
  if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
  return data as SimilarPetsResponse;
}

/** Primera búsqueda — usa cache si existe */
export async function findSimilarPets(petId: string): Promise<SimilarPetsResponse> {
  return callFindSimilar(petId, false);
}

/** Re-búsqueda forzada — solo para usuarios premium */
export async function refreshSimilarPets(petId: string): Promise<SimilarPetsResponse> {
  return callFindSimilar(petId, true);
}
