import { supabase } from "./supabase";
import { foldAccents } from "./foldAccents";

/** Valores guardados en `pets.size` y usados en reportes / filtros. */
export const PET_SIZES = ["Pequeña", "Mediana", "Grande"] as const;
export type PetSize = (typeof PET_SIZES)[number];

export interface Pet {
  id: string;
  name: string | null;
  status: "lost" | "found";
  /** dog | cat cuando existe en DB */
  species?: string | null;
  breed: string | null;
  age: string | null;
  /** Pequeña | Mediana | Grande — solo si existe columna `size` en DB */
  size?: string | null;
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
  active_until: string | null;
}

export async function fetchPets(): Promise<Pet[]> {
  const { data, error } = await supabase
    .from("pets")
    .select("*")
    .gt("active_until", new Date().toISOString())
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Pet[];
}

export const PUBLIC_PET_PAGE_SIZE = 10;

const PAGE_SIZE = PUBLIC_PET_PAGE_SIZE;

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

/** Filtro ?species=dog|cat (misma idea que el formulario de reporte + columna `species`). */
export function matchUrlSpeciesFilter(pet: Pet, species: "dog" | "cat" | ""): boolean {
  if (!species) return true;
  if (species === "cat") {
    if (pet.species === "cat") return true;
    if (pet.species === "dog") return false;
    return CAT_BREEDS.includes(pet.breed ?? "");
  }
  if (species === "dog") {
    if (pet.species === "dog") return true;
    if (pet.species === "cat") return false;
    return DOG_BREEDS.includes(pet.breed ?? "");
  }
  return true;
}

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
    .range(from, to)
    .gt("active_until", new Date().toISOString());

  if (status) query = query.eq("status", status);
  if (species === "cat") {
    const inList = CAT_BREEDS.map(b => `"${String(b).replace(/"/g, '""')}"`).join(",");
    query = query.or(`species.eq.cat,and(species.is.null,breed.in.(${inList}))`);
  } else if (species === "dog") {
    const inList = DOG_BREEDS.map(b => `"${String(b).replace(/"/g, '""')}"`).join(",");
    query = query.or(`species.eq.dog,and(species.is.null,breed.in.(${inList}))`);
  }
  if (days) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    query = query.gte("created_at", since);
  }
  if (search?.trim()) {
    const folded = foldAccents(search.trim());
    if (folded) {
      // Columna generada search_fold (ver migración 20260513): unaccent + lower en DB
      query = query.ilike("search_fold", `%${folded}%`);
    }
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

export async function reactivatePet(id: string): Promise<void> {
  const activeUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase
    .from("pets")
    .update({ active_until: activeUntil })
    .eq("id", id);
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
  /** Distancia en km al reporte source. null si alguna de las dos mascotas no tiene coordenadas. Opcional para tolerar entries de cache generadas antes del cambio. */
  distance_km?: number | null;
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
