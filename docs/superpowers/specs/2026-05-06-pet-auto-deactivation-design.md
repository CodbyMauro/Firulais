# Pet Auto-Deactivation Design Specification

**Date:** 2026-05-06
**Scope:** Logical deactivation of pet reports after 30 days of inactivity, with owner-triggered reactivation.

---

## Overview

Pet reports automatically expire after 30 days. Expired pets disappear from all public surfaces (map, home, search). The owner can see their expired pets in "Mis Reportes" and reactivate them at any time for another 30 days. No cron job required — expiry is determined at query time.

---

## Database

### New column: `active_until` (timestamptz, nullable)

Added to the `pets` table in Supabase.

- **On pet creation:** `active_until = now() + interval '30 days'` (set as DB default)
- **On reactivation:** `active_until = now() + interval '30 days'` (UPDATE)
- **On expiry check:** queries filter `active_until > now()`

### Migration for existing pets

```sql
ALTER TABLE pets ADD COLUMN active_until timestamptz;

UPDATE pets
SET active_until = created_at + interval '30 days';
```

Pets whose `created_at + 30 days` is in the past will have an `active_until` in the past — they are immediately treated as inactive. This is intentional: old stale reports should be deactivated.

### DB default for new pets

```sql
ALTER TABLE pets
ALTER COLUMN active_until SET DEFAULT now() + interval '30 days';
```

---

## Backend / petsService.ts

### Pet interface update

Add `active_until: string | null` to the `Pet` interface.

### fetchPets() — public listing

Add filter so only active pets are returned:
```typescript
.gt("active_until", new Date().toISOString())
```

### fetchPetsPage() — paginated public listing

Same filter applied to all public queries (home, search, filters).

### fetchMyPets() — owner view

**No filter.** Owner sees all their pets — active and inactive — so they can reactivate expired ones.

### New: reactivatePet(id)

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

### Out of scope

- Manual deactivation by owner (not implemented — owner cannot deactivate, only reactivate)
- Manual deletion by owner (planned for a future feature)

---

## UI — MyReportsScreen

### Sorting

Pets are sorted into two groups:
1. **Active pets** (top) — `active_until > now()`
2. **Inactive pets** (bottom) — `active_until <= now()` or null

Each group is displayed in reverse chronological order.

### Section separator

Between groups, a section label:
```
--- Desactivadas ---
```
Only shown if there is at least one inactive pet.

### Active pet card

Same as current design, plus a small line below the pet info:
```
Activa · vence en X días
```
Where X = `Math.ceil((new Date(pet.active_until).getTime() - Date.now()) / 86400000)`.

If less than 3 days remain, the text turns amber as a warning.

### Inactive pet card

- Card has reduced opacity (`opacity-60`) to signal it's inactive
- Status badge replaced with a gray "Desactivada" badge
- Action buttons row shows only **"Reactivar"** (no delete button for now)
- On tap: calls `reactivatePet(pet.id)` → optimistically moves card back to active group

### Reactivation flow

1. User taps "Reactivar"
2. Button shows loading spinner
3. `reactivatePet(id)` called
4. On success: pet's `active_until` updated locally, card moves to top of active group
5. On error: show brief error toast, button returns to normal

---

## Surfaces not affected (auto-updated via query filter)

| Screen | Change needed |
|---|---|
| HomeScreen | None — uses fetchPetsPage(), filter applied automatically |
| MapScreen | None — uses fetchPets() via usePets hook, filter applied automatically |
| AllReportsScreen | None — uses fetchPetsPage() |
| FiltersScreen | None — uses fetchPetsPage() |
| PetDetailScreen | None — still shows individual pet by ID (no expiry enforcement on direct link) |

---

## Edge Cases

**Pet expires while user is browsing:** The pet will disappear on next page load or query refresh. No real-time removal needed.

**active_until is null (legacy data):** Treated as inactive. The migration sets `active_until` for all existing pets, so nulls should only exist if migration failed. Queries use `.gt("active_until", ...)` which excludes nulls safely.

**Reactivation while already active:** Allowed — resets the 30-day timer. No UX restriction needed.

**PetDetailScreen on expired pet:** Shows the pet normally (no enforcement). This is acceptable — direct links still work.

---

## Testing Strategy

1. **DB migration:** Verify `active_until` column exists with correct default
2. **Query filter:** Verify `fetchPets()` excludes pets with `active_until` in the past
3. **fetchMyPets:** Verify owner still sees inactive pets
4. **Reactivation:** Verify `reactivatePet()` sets `active_until = now() + 30d`
5. **MyReportsScreen UI:** Verify active/inactive grouping, "Activa · vence en X días" text, "Desactivada" badge, "Reactivar" button
6. **Amber warning:** Verify pets with < 3 days remaining show amber text
7. **Optimistic update:** Verify reactivated pet moves to active group without reload

---

## Out of Scope

- Push notifications when a pet is about to expire
- Admin ability to extend or override active_until
- Pets page showing expired count statistics
- Manual deletion by owner (separate future feature)
