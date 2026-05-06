# Map Pins Emoji Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace red/green triangular map pins with classic pin shapes containing animal emojis (🐕 for dogs, 🐈 for cats).

**Architecture:** Add two helper functions to MapScreen: one to map pet type to emoji, one to generate an SVG pin with emoji. Replace the current `lostIcon` and `foundIcon` DivIcon definitions with new versions that call these helpers. The icon assignment logic stays the same; only the HTML/SVG changes.

**Tech Stack:** React, Leaflet (react-leaflet), SVG for pin rendering, inline emoji

---

## File Structure

- **Modify:** `src/pages/MapScreen.tsx` (lines 19-38 where icons are defined, and icon assignment in marker rendering)

No new files. All changes are localized to icon definitions and emoji mapping.

---

## Task 1: Create emoji mapping helper

**Files:**
- Modify: `src/pages/MapScreen.tsx:1-40`

- [ ] **Step 1: Add emoji map constant before the icon definitions**

At the top of MapScreen, after the imports and before the `lostIcon` definition (around line 18), add:

```typescript
// Map pet types to emojis
const petTypeToEmoji: Record<string, string> = {
  perro: "🐕",
  gato: "🐈",
};

function getEmojiForPet(petType?: string): string {
  return petTypeToEmoji[petType || ""] || "🐾"; // fallback to paw print if unknown
}
```

- [ ] **Step 2: Verify syntax by checking the file opens**

Open `src/pages/MapScreen.tsx` and verify the new constant appears after imports. The file should have no TypeScript errors.

---

## Task 2: Create SVG pin generator helper

**Files:**
- Modify: `src/pages/MapScreen.tsx:20-50`

- [ ] **Step 1: Add SVG pin generator function after the emoji map**

After `getEmojiForPet()`, add:

```typescript
function createPinSvg(emoji: string, color: string): string {
  // SVG for classic pin shape with emoji inside
  return `<svg width="40" height="50" viewBox="0 0 40 50" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
    <path d="M 20 0 C 10 0 2 8 2 18 C 2 30 20 50 20 50 C 20 50 38 30 38 18 C 38 8 30 0 20 0 Z" fill="${color}" stroke="white" stroke-width="2"/>
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="20" dy="-2">${emoji}</text>
  </svg>`;
}
```

- [ ] **Step 2: Verify no syntax errors**

The TypeScript compiler should accept the template string. Check that the SVG is valid (matching open/close tags, valid attributes).

---

## Task 3: Replace lostIcon definition

**Files:**
- Modify: `src/pages/MapScreen.tsx:52-65`

- [ ] **Step 1: Find the current lostIcon definition**

Locate this code (around line 19):
```typescript
const lostIcon = new L.DivIcon({
  className: "",
  html: `<div style="background:#dc2626;width:18px;height:18px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,.3)"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 18],
});
```

- [ ] **Step 2: Replace with dynamic icon that uses SVG**

Replace the entire `lostIcon` definition with:

```typescript
// Lost icon will be created dynamically based on pet type
// We'll create it inline in the marker rendering below
```

Remove the old static `lostIcon` definition entirely (delete those lines).

---

## Task 4: Replace foundIcon definition

**Files:**
- Modify: `src/pages/MapScreen.tsx:66-79`

- [ ] **Step 1: Find the current foundIcon definition**

Locate this code (around line 26):
```typescript
const foundIcon = new L.DivIcon({
  className: "",
  html: `<div style="background:#059669;width:18px;height:18px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,.3)"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 18],
});
```

- [ ] **Step 2: Replace with placeholder comment**

Replace the entire `foundIcon` definition with:

```typescript
// Found icon will be created dynamically based on pet type
// We'll create it inline in the marker rendering below
```

Remove the old static `foundIcon` definition entirely (delete those lines).

---

## Task 5: Update marker rendering to use dynamic icons

**Files:**
- Modify: `src/pages/MapScreen.tsx:210-266` (the Marker map section)

- [ ] **Step 1: Find the marker rendering code**

Locate the markers map (around line 210):
```typescript
{markers.map(({ pet, lat, lng }) => (
  <Marker
    key={pet.id}
    position={[lat, lng]}
    icon={pet.status === "lost" ? lostIcon : foundIcon}
    eventHandlers={{ click: () => setFlyTo({ coords: [lat, lng], zoom: 16, trigger: Date.now() }) }}
  >
```

- [ ] **Step 2: Create dynamic icon inline**

Replace the `icon` prop line with:

```typescript
icon={new L.DivIcon({
  className: "",
  html: createPinSvg(
    getEmojiForPet(pet.type),
    pet.status === "lost" ? "#dc2626" : "#059669"
  ),
  iconSize: [40, 50],
  iconAnchor: [20, 50],
})}
```

This creates a new icon for each marker using:
- Emoji from pet type via `getEmojiForPet(pet.type)`
- Color from pet status: red (#dc2626) for lost, green (#059669) for found
- Icon size now 40x50 to match SVG viewBox
- Icon anchor adjusted to 20, 50 (center horizontal, bottom vertical for pin shape)

- [ ] **Step 3: Verify the marker still has all other props**

Ensure the Marker still has `key`, `position`, `eventHandlers`, and `<Popup>` child. Only the `icon` prop changed.

---

## Task 6: Remove unused imports

**Files:**
- Modify: `src/pages/MapScreen.tsx:1-10`

- [ ] **Step 1: Check if lostIcon or foundIcon are referenced elsewhere**

Search the entire file for `lostIcon` or `foundIcon`. If they only appeared in the old definitions (which you deleted in Tasks 3-4), no imports need changes.

- [ ] **Step 2: No changes needed if not referenced**

If search returns no results outside the deleted definitions, you're done. The L.DivIcon import stays (still used for dynamic icons).

---

## Task 7: Manual testing on dev server

**Files:**
- Test: `src/pages/MapScreen.tsx` (visual rendering)

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

Expected: Dev server starts on http://localhost:5173 (or similar). No TypeScript errors in console.

- [ ] **Step 2: Navigate to the map**

Open the app and navigate to the Map screen. (You may need to login/setup first depending on your app flow.)

- [ ] **Step 3: Verify pins display correctly**

Check for these visuals:
- Lost pets show red classic pin shapes with emoji (🐕 or 🐈)
- Found pets show green classic pin shapes with emoji (🐕 or 🐈)
- User location pin (blue circle) unchanged
- Pins are clickable (click one to zoom)
- Popup shows when pin is clicked

- [ ] **Step 4: Verify emoji matches pet type**

If you have test data with both dog and cat pets in the carousel/map:
- Dogs show 🐕 inside pin
- Cats show 🐈 inside pin

- [ ] **Step 5: Verify colors**

- Red pins for any pet with status="lost"
- Green pins for any pet with status="found"

- [ ] **Step 6: Test edge case (optional)**

If your test data includes a pet with unknown type, verify:
- The pin renders without crashing
- Fallback emoji (🐾) displays
- No console errors

---

## Task 8: Commit changes

**Files:**
- Modified: `src/pages/MapScreen.tsx`

- [ ] **Step 1: Stage changes**

```bash
git add src/pages/MapScreen.tsx
```

- [ ] **Step 2: Commit**

```bash
git commit -m "feat: replace map pins with emoji-based classic pin shapes

- Map pet types to emojis: perro→🐕, gato→🐈
- Create classic pin SVG with emoji inside
- Dynamic icon generation based on pet status and type
- Lost pets: red pin, Found pets: green pin
- Fallback to 🐾 for unknown pet types"
```

- [ ] **Step 3: Verify commit**

```bash
git log --oneline -1
```

Expected: Shows your new commit with the message above.

---

## Task 9: Visual testing on mobile (optional but recommended)

**Files:**
- Test: `src/pages/MapScreen.tsx` (responsive rendering)

- [ ] **Step 1: Open DevTools and enable mobile view**

In your browser, press F12, then toggle device toolbar (Ctrl+Shift+M or Cmd+Shift+M).

- [ ] **Step 2: Select a mobile device preset**

Choose iPhone 12 or similar from the dropdown.

- [ ] **Step 3: Verify pins are still visible and clickable**

- Pins should be appropriately sized on mobile
- Clicking a pin should still work
- No overflow or layout issues

- [ ] **Step 4: Check landscape orientation (optional)**

Rotate the device (in DevTools, there's a rotate button). Verify the map and pins adjust correctly.

---

## Self-Review Checklist

✓ **Spec coverage:**
- ✓ Pin shape: Classic SVG pin created in `createPinSvg()`
- ✓ Emoji selection: `petTypeToEmoji` map with 🐕 (perro) and 🐈 (gato)
- ✓ Color coding: Dynamic color based on `pet.status` (red for lost, green for found)
- ✓ Size & styling: SVG 40x50 viewBox, emoji 20px, white border, shadow
- ✓ Data mapping: `pet.type` and `pet.status` used correctly
- ✓ Edge cases: Fallback emoji (🐾) for unknown types
- ✓ No unintended changes: User location pin, legend, carousel unchanged

✓ **No placeholders:** All code is complete and exact. No "TODO", "TBD", or "add error handling" placeholders.

✓ **Type consistency:**
- `petTypeToEmoji` is `Record<string, string>` (map of type strings to emoji strings)
- `getEmojiForPet(petType?: string): string` returns emoji string
- `createPinSvg(emoji: string, color: string): string` returns SVG HTML string
- Icon assignment uses both helpers consistently

✓ **File changes:**
- Only `src/pages/MapScreen.tsx` modified (as specified)
- Old static `lostIcon` and `foundIcon` removed
- New dynamic icon creation in marker rendering
- All other code untouched

---

## Testing Notes

- **Manual testing** is the validation here (not unit tests) since this is UI rendering
- Test on your dev server with real data from your app
- Check both lost and found pets, and if possible, both dog and cat types
- Mobile view is important since this is a mobile-first app

---

## Rollback

If anything breaks:

```bash
git reset --hard HEAD~1
```

This reverts the commit and restores the old triangular pins. The change is non-destructive (UI only, no data changes).
