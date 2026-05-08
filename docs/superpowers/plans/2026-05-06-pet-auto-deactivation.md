# Pet Auto-Deactivation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pet reports automatically expire after 30 days, disappear from all public surfaces, and can be reactivated by the owner for another 30 days.

**Architecture:** Add `active_until: timestamptz` column to the `pets` table in Supabase. Public queries filter by `active_until > now()`. `fetchMyPets` skips the filter so owners see inactive pets. A new `reactivatePet()` function sets `active_until = now() + 30 days`. `MyReportsScreen` splits pets into active/inactive groups and shows a "Reactivar" button for inactive ones.

**Tech Stack:** Supabase (PostgreSQL), React, TypeScript

---

## File Structure

- **Supabase Dashboard** — run SQL migration (no file, done via Supabase SQL editor)
- **Modify:** `src/lib/petsService.ts` — Pet interface, fetchPets, fetchPetsPage, fetchMyPets, new reactivatePet()
- **Modify:** `src/pages/MyReportsScreen.tsx` — active/inactive split, UI badges, reactivation button

---

## Task 1: Run DB migration in Supabase

**Files:**
- Supabase SQL Editor (dashboard)

- [ ] **Step 1: Open the Supabase SQL editor**

Go to your Supabase project dashboard → SQL Editor → New query.

- [ ] **Step 2: Run the migration**

Paste and run this SQL:

```sql
-- Add active_until column with 30-day default for new pets
ALTER TABLE pets
  ADD COLUMN IF NOT EXISTS active_until timestamptz
  DEFAULT now() + interval '30 days';

-- Backfill existing pets: active_until = created_at + 30 days
UPDATE pets
SET active_until = created_at + interval '30 days'
WHERE active_until IS NULL;
```

- [ ] **Step 3: Verify the column exists**

Run in SQL Editor:

```sql
SELECT id, name, created_at, active_until
FROM pets
ORDER BY created_at DESC
LIMIT 5;
```

Expected: all rows have `active_until` set (not null), roughly 30 days after `created_at`.

---

## Task 2: Update Pet interface and petsService.ts — active_until field

**Files:**
- Modify: `src/lib/petsService.ts:3-19` (Pet interface)

- [ ] **Step 1: Add `active_until` to the Pet interface**

In `src/lib/petsService.ts`, find the `Pet` interface (lines 3-19) and add the field:

```typescript
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
  active_until: string | null;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/petsService.ts
git commit -m "feat: add active_until field to Pet interface"
```

---

## Task 3: Filter fetchPets to only return active pets

**Files:**
- Modify: `src/lib/petsService.ts:21-28` (fetchPets function)

- [ ] **Step 1: Find the fetchPets function**

Locate this code in `src/lib/petsService.ts`:

```typescript
export async function fetchPets(): Promise<Pet[]> {
  const { data, error } = await supabase
    .from("pets")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Pet[];
}
```

- [ ] **Step 2: Add the active_until filter**

Replace it with:

```typescript
export async function fetchPets(): Promise<Pet[]> {
  const { data, error } = await supabase
    .from("pets")
    .select("*")
    .gt("active_until", new Date().toISOString())
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Pet[];
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/petsService.ts
git commit -m "feat: filter fetchPets to only return active pets"
```

---

## Task 4: Filter fetchPetsPage to only return active pets

**Files:**
- Modify: `src/lib/petsService.ts:51-78` (fetchPetsPage function)

- [ ] **Step 1: Find the fetchPetsPage function**

Locate the query builder in `fetchPetsPage`. It starts with:

```typescript
let query: any = supabase
  .from("pets")
  .select("*")
  .order("created_at", { ascending: false })
  .range(from, to);
```

- [ ] **Step 2: Add the active_until filter right after `.range(from, to)`**

```typescript
let query: any = supabase
  .from("pets")
  .select("*")
  .order("created_at", { ascending: false })
  .range(from, to)
  .gt("active_until", new Date().toISOString());
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/petsService.ts
git commit -m "feat: filter fetchPetsPage to only return active pets"
```

---

## Task 5: Add reactivatePet function

**Files:**
- Modify: `src/lib/petsService.ts` (add after deletePet function)

- [ ] **Step 1: Find the deletePet function**

Locate this in `src/lib/petsService.ts`:

```typescript
export async function deletePet(id: string): Promise<void> {
  const { error } = await supabase.from("pets").delete().eq("id", id);
  if (error) throw error;
}
```

- [ ] **Step 2: Add reactivatePet immediately after deletePet**

```typescript
export async function reactivatePet(id: string): Promise<void> {
  const activeUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase
    .from("pets")
    .update({ active_until: activeUntil })
    .eq("id", id);
  if (error) throw error;
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/petsService.ts
git commit -m "feat: add reactivatePet function to petsService"
```

---

## Task 6: Update MyReportsScreen — split active/inactive and add reactivation UI

**Files:**
- Modify: `src/pages/MyReportsScreen.tsx`

This is the largest task. Replace the screen's logic and rendering to handle two groups.

- [ ] **Step 1: Import reactivatePet**

At the top of `src/pages/MyReportsScreen.tsx`, update the import from petsService:

```typescript
import { fetchMyPets, deletePet, reactivatePet, type Pet } from "../lib/petsService";
```

- [ ] **Step 2: Add reactivating state**

Inside the `MyReportsScreen` component, after the existing state declarations, add:

```typescript
const [reactivatingId, setReactivatingId] = useState<string | null>(null);
```

- [ ] **Step 3: Add helper to compute days remaining**

Add this helper function inside the component (before the return):

```typescript
const daysRemaining = (activeUntil: string | null): number => {
  if (!activeUntil) return 0;
  return Math.ceil((new Date(activeUntil).getTime() - Date.now()) / 86400000);
};
```

- [ ] **Step 4: Add isActive helper**

```typescript
const isActive = (pet: Pet): boolean => {
  if (!pet.active_until) return false;
  return new Date(pet.active_until).getTime() > Date.now();
};
```

- [ ] **Step 5: Add reactivation handler**

```typescript
const handleReactivate = async (id: string) => {
  setReactivatingId(id);
  try {
    await reactivatePet(id);
    const activeUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    setPets((prev) =>
      prev.map((p) => (p.id === id ? { ...p, active_until: activeUntil } : p))
    );
  } finally {
    setReactivatingId(null);
  }
};
```

- [ ] **Step 6: Split pets into active and inactive groups**

Replace the `{pets.map(...)}` section in the JSX with this structure:

```tsx
{(() => {
  const activePets = pets.filter(isActive);
  const inactivePets = pets.filter((p) => !isActive(p));

  return (
    <>
      {activePets.map((pet) => renderPetCard(pet, true))}

      {inactivePets.length > 0 && (
        <>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Desactivadas
            </span>
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
          </div>
          {inactivePets.map((pet) => renderPetCard(pet, false))}
        </>
      )}
    </>
  );
})()}
```

- [ ] **Step 7: Extract renderPetCard helper**

Add this function inside the component (before the return), replacing the inline card JSX. This handles both active and inactive cards:

```tsx
const renderPetCard = (pet: Pet, active: boolean) => {
  const days = daysRemaining(pet.active_until);
  const nearExpiry = active && days <= 3;

  return (
    <div
      key={pet.id}
      className={`bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-100 dark:border-slate-700 shadow-sm dark:shadow-slate-900/50 ${!active ? "opacity-60" : ""}`}
    >
      <div
        className="flex gap-3 p-3 cursor-pointer"
        onClick={() => navigate(`/pet/${pet.id}`)}
      >
        <div className="w-20 h-20 rounded-xl bg-slate-100 dark:bg-slate-700 overflow-hidden shrink-0">
          {pet.image_url
            ? <img src={pet.image_url} alt={pet.name ?? ""} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center">
                <span className="material-symbols-outlined text-[32px] text-slate-300 dark:text-slate-500">pets</span>
              </div>
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {active ? (
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${pet.status === "lost" ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600"}`}>
                {pet.status === "lost" ? "Perdido" : "Encontrado"}
              </span>
            ) : (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                Desactivada
              </span>
            )}
          </div>
          <h3 className="font-bold text-base mt-1 truncate">
            {pet.status === "lost" ? (pet.name ?? "Sin nombre") : (pet.breed ?? "Sin raza")}
          </h3>
          <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-xs mt-0.5">
            <span className="material-symbols-outlined shrink-0" style={{ fontSize: 18, width: 18, height: 18, lineHeight: 1 }}>location_on</span>
            <span className="truncate">{pet.location}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1.5">
            <UserAvatar
              name={myProfile?.full_name ?? user?.email ?? ""}
              avatarData={myProfile?.avatar_data}
              avatarUrl={myProfile?.avatar_url}
              size={18}
            />
            <p className="text-xs text-slate-400 dark:text-slate-500">{formatDate(pet.created_at)}</p>
          </div>
          {active && (
            <p className={`text-[10px] font-semibold mt-1 ${nearExpiry ? "text-amber-500" : "text-slate-400 dark:text-slate-500"}`}>
              Activa · vence en {days} día{days !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>
      <div className="border-t border-slate-100 dark:border-slate-700 flex">
        <button
          onClick={() => navigate(`/pet/${pet.id}`)}
          className="flex-1 py-3 text-xs font-semibold text-[#2b9dee] flex items-center justify-center gap-1"
        >
          <span className="material-symbols-outlined text-[16px]">visibility</span>
          Ver detalle
        </button>
        <div className="w-px bg-slate-100 dark:bg-slate-700" />
        {active ? (
          <button
            onClick={() => setConfirmId(pet.id)}
            className="flex-1 py-3 text-xs font-semibold text-red-500 flex items-center justify-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">delete</span>
            Eliminar
          </button>
        ) : (
          <button
            onClick={() => handleReactivate(pet.id)}
            disabled={reactivatingId === pet.id}
            className="flex-1 py-3 text-xs font-semibold text-emerald-600 flex items-center justify-center gap-1 disabled:opacity-50"
          >
            {reactivatingId === pet.id ? (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
            ) : (
              <span className="material-symbols-outlined text-[16px]">refresh</span>
            )}
            Reactivar
          </button>
        )}
      </div>
    </div>
  );
};
```

- [ ] **Step 8: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 9: Verify the app builds**

```bash
npm run build
```

Expected: build succeeds with no errors.

- [ ] **Step 10: Commit**

```bash
git add src/pages/MyReportsScreen.tsx
git commit -m "feat: show active/inactive pet groups with reactivation UI in MyReportsScreen"
```

---

## Task 7: Manual testing

**Files:**
- Test: `src/pages/MyReportsScreen.tsx`, `src/lib/petsService.ts`

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Test active pets display correctly**

Navigate to "Mis Reportes". Verify:
- Active pets show at the top
- Each active pet shows "Activa · vence en X días" below the location
- Pets with ≤ 3 days remaining show that text in amber
- Active pets show "Eliminar" button as before

- [ ] **Step 3: Test inactive pets section**

In the Supabase SQL Editor, manually expire a test pet:

```sql
UPDATE pets
SET active_until = now() - interval '1 day'
WHERE id = '<your-test-pet-id>';
```

Reload "Mis Reportes". Verify:
- The expired pet appears in the "Desactivadas" section at the bottom
- Card has reduced opacity
- Shows gray "Desactivada" badge instead of red/green
- Shows "Reactivar" button instead of "Eliminar"

- [ ] **Step 4: Test reactivation**

Tap "Reactivar" on the inactive pet. Verify:
- Button shows spinner while loading
- Pet moves back to active group after success
- Pet now shows "Activa · vence en 30 días"

- [ ] **Step 5: Test public surfaces no longer show expired pets**

Navigate to Home, Map, and All Reports. Verify the manually expired pet does NOT appear in any of these screens.

- [ ] **Step 6: Verify new pets auto-get active_until**

Create a new pet report. Check in Supabase SQL Editor:

```sql
SELECT id, name, created_at, active_until
FROM pets
ORDER BY created_at DESC
LIMIT 1;
```

Expected: `active_until` is approximately 30 days after `created_at`.

---

## Self-Review

**Spec coverage:**
- ✅ DB column `active_until` — Task 1
- ✅ Pet interface updated — Task 2
- ✅ `fetchPets` filters active — Task 3
- ✅ `fetchPetsPage` filters active — Task 4
- ✅ `fetchMyPets` no filter (owner sees all) — not changed, already returns all, only fetchPets/fetchPetsPage are filtered
- ✅ `reactivatePet` function — Task 5
- ✅ MyReportsScreen active/inactive split — Task 6
- ✅ "Desactivada" badge — Task 6 Step 7
- ✅ "Activa · vence en X días" text — Task 6 Step 7
- ✅ Amber warning for ≤ 3 days — Task 6 Step 7
- ✅ "Reactivar" button with spinner — Task 6 Step 7
- ✅ Inactive pets sorted to bottom — Task 6 Step 6
- ✅ Section separator "Desactivadas" — Task 6 Step 6
- ✅ Optimistic update on reactivation — Task 6 Step 5
- ✅ No manual deactivation by owner — confirmed, not in plan
- ✅ New pets get active_until from DB default — Task 1 sets DEFAULT, no ReportScreen changes needed

**No placeholders:** All steps have complete code.

**Type consistency:**
- `reactivatePet(id: string): Promise<void>` — defined in Task 5, imported in Task 6 Step 1 ✅
- `Pet.active_until: string | null` — defined in Task 2, used in Task 6 helpers ✅
- `isActive(pet: Pet): boolean` — defined and used in Task 6 ✅
- `daysRemaining(activeUntil: string | null): number` — defined and used in Task 6 ✅
- `handleReactivate(id: string)` — defined and called in Task 6 ✅
- `reactivatingId` state — defined in Task 6 Step 2, used in Task 6 Step 7 ✅
