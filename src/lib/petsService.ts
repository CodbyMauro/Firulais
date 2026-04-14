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

  // Disparar generación de embedding en background — no bloquea el flujo principal
  if (pet.image_url) {
    triggerEmbedding(pet.id);
  }

  return pet;
}

function triggerEmbedding(petId: string): void {
  supabase.functions.invoke("generate-pet-embedding", { body: { petId } }).catch(() => {});
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
  /** La mascota aún no tiene embedding — se está generando en background */
  embedding_pending?: boolean;
};

async function callFindSimilar(petId: string, forceRefresh: boolean): Promise<SimilarPetsResponse> {
  const { data, error } = await supabase.functions.invoke("find-similar-pets", {
    body: { petId, forceRefresh },
  });

  if (error) {
    // FunctionsHttpError trae el status y body de la edge function
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const status = (error as any).status ?? (error as any).context?.status;
    if (status === 402) {
      const body = await (error as any).context?.json?.() ?? {};
      const exhausted = body.error === "searches_exhausted";
      return {
        ...body,
        results: body.results ?? [],
        premium_required: !exhausted,
        searches_exhausted: exhausted,
      };
    }
    throw new Error(error.message ?? "Error al buscar coincidencias");
  }

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
