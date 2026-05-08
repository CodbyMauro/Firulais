# Map Pins Emoji Design Specification

**Date:** 2026-05-05  
**Scope:** Update pet markers on MapScreen from simple geometric shapes to emoji-based pins with animal recognition and status indication.

## Overview

Replace the current red/green triangular pins with classic pin-shaped icons containing animal emojis. The design maintains the existing visual hierarchy and user experience while making pins more recognizable, friendly, and delightful.

### Current State

- **Lost pets:** Red triangular pin (solid color, no detail)
- **Found pets:** Green triangular pin (solid color, no detail)
- **User location:** Blue circle with pulsing ring
- **Visual distinction:** Color only; no animal type information visible

### Proposed State

- **Lost pets:** Classic pin shape with red background + 🐕 (dog) or 🐈 (cat) emoji
- **Found pets:** Classic pin shape with green background + 🐕 (dog) or 🐈 (cat) emoji
- **User location:** Unchanged (blue circle with ring)
- **Visual distinction:** Color (state) + emoji (animal type)

## Design Decisions

### Pin Shape
**Decision:** Classic pin shape (teardrop/marker)  
**Why:** Maintains the map's visual language while upgrading the emoji container. Users instantly recognize it as a map marker.  
**Rationale:** Tested alternatives (rounded, shield, heart) — classic pin felt most professional while remaining friendly.

### Emoji Selection
- **Dogs:** 🐕 (adult dog, more mature representation)
- **Cats:** 🐈 (cat face, friendly and recognizable)

**Why:** Chose adult dog over puppy and cat-face over cat emoji for consistency in maturity and personality representation.

### Color Coding
- **Red (#dc2626):** Lost pet status
- **Green (#059669):** Found pet status

**Why:** Consistent with current design; maintains accessibility and instant visual scanning on the map.

### Size & Styling
- **Pin dimensions:** ~36px × 45px (maintaining current visual footprint)
- **Emoji size:** 20px within the pin
- **Border:** 2px white stroke
- **Shadow:** `0 2px 4px rgba(0,0,0,0.3)` (consistent with current styling)

**Why:** Mediano en círculo pequeño requirement — emoji visibility without overshadowing the map UI.

## Implementation Scope

### Files to Modify
- `src/pages/MapScreen.tsx`

### Changes Required

1. **Pin Icon Creation**
   - Replace `lostIcon` DivIcon with emoji-based classic pin shape (SVG or HTML)
   - Replace `foundIcon` DivIcon with emoji-based classic pin shape
   - Map pet type (`pet.type`) to emoji: `"perro"` → 🐕, `"gato"` → 🐈

2. **Leaflet Integration**
   - Update icon HTML to render classic pin SVG with emoji inside
   - Ensure `iconSize`, `iconAnchor` match current (18, 18 for size; 9, 18 for anchor)
   - Maintain shadow and white border styling

3. **Styling**
   - Pin background color tied to `pet.status`: `"lost"` → #dc2626, `"found"` → #059669
   - Emoji rendered at consistent size within pin (font-size: 20px)

### No Changes Required
- User location pin (blue circle) — unchanged
- Range picker UI — unchanged
- Legend section (red/green indicators) — unchanged
- Bottom carousel — unchanged
- Popup content — unchanged

## Data Assumptions

- `pet.status` is always `"lost"` or `"found"` — assumption validated in current code
- `pet.type` is either `"perro"` (dog) or `"gato"` (cat) — current app scope
- `pet.lat` and `pet.lng` are present for mapped pets — assumption validated in current code

## Edge Cases & Fallbacks

**Unknown pet type:** If a new animal type is added before this feature updates, the emoji will be undefined. Mitigation: use a default emoji (🐾 or 🐶) for unmapped types, or log a warning for debugging.

**Emoji rendering:** Emoji support varies by platform. Tested on modern browsers (Chrome, Firefox, Safari); fallback is glyph placeholder if emoji unavailable (unlikely on modern devices).

## Testing Strategy

1. **Rendering:** Verify pins display correctly on the map for both lost and found pets
2. **Interaction:** Confirm clicking a pin still zooms and shows popup
3. **State change:** Test toggling between lost/found status updates pin color
4. **Animal type:** Verify correct emoji displays for each animal type
5. **Edge cases:** Test with missing emoji data or unknown animal types
6. **Mobile:** Verify pins remain clickable and visible on mobile viewports

## Accessibility

- Color contrast (red/green on white background) maintained from current design
- Emoji adds visual redundancy (not relying on color alone to distinguish animal type)
- No keyboard interaction changes required
- Screen readers will read emoji content if applicable (testing recommended post-implementation)

## Rollback Plan

If emoji rendering fails or causes issues:
1. Revert to DivIcon-based triangular pins (current code)
2. No data migration needed — only UI change
3. Low risk; can be toggled via feature flag if needed during testing

## Future Enhancements (Out of Scope)

- Animation on pins (pulse, bounce when nearby)
- More animal types (rabbit, bird, reptile, etc.)
- Custom emoji picker in pet creation flow
- Emoji tooltips on hover
