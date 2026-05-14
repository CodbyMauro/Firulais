/**
 * Texto comparable en búsquedas: minúsculas y sin diacríticos (á→a, é→e, ó→o, etc.).
 * Debe coincidir en la práctica con la columna `pets.search_fold` (Postgres `unaccent`).
 */
const COMBINING_MARKS = /[\u0300-\u036f]/g;

export function foldAccents(value: string | null | undefined): string {
  if (value == null || value === "") return "";
  return value.normalize("NFD").replace(COMBINING_MARKS, "").toLowerCase();
}

/** true si needle (vacío = sin filtrar) aparece en haystack, ignorando mayúsculas y tildes */
export function foldAccentsContains(haystack: string | null | undefined, needle: string): boolean {
  const n = foldAccents(needle);
  if (!n) return true;
  return foldAccents(haystack).includes(n);
}
