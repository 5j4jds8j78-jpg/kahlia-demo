# 2D SVG — ЖК «Кахля»

All files are generated from `data/apartments.json` (+ geometry from `brief.md §3`).
Regenerate after the data changes:

```
python3 art2d/build_all.py          # all SVGs
python3 art2d/build_all.py --sheet  # + contact sheet art2d/_sheet.png
```

Sources: `art2d/plans.py`, `facade.py`, `floorplan.py`, `genplan.py`, `icons.py`, shared `common.py`.
Don't edit the SVGs by hand. Change the generator and rebuild.

**Inline the SVGs** (`inline_svg()` in app.py) to get hover, classes and the data attributes.
Each SVG has a scoped `<style>` (`svg.facade …`, `svg.floorplan …`, `svg.plan …`, `svg.genplan …`),
so several can sit on one page without clashing. Fonts come from CSS variables:
`--svg-font` (default Inter) and `--svg-mono` (default DejaVu Sans Mono).

## Apartment id
`"{section}-{floor:02d}-{position}"`, e.g. `A-06-2`. Same as `apartments[].id`.

## 1. Facades: `facade-A.svg`, `facade-B.svg`, `facade-*-outer.svg`, `facade-full.svg`

| file | what |
|---|---|
| `facade-A.svg` | Section A, south (courtyard) face |
| `facade-A-outer.svg` | Section A, north face (Naukova St); shows the parking ramp |
| `facade-B.svg` | Section B, west (courtyard) face, with the garden apartments on floor 1 |
| `facade-B-outer.svg` | Section B, east face (square) |
| `facade-full.svg` | Both courtyard faces side by side (overview / hero picker) |

Root: `<svg class="facade" data-section data-face>`. The artwork sits in `g.facade-art`. Interactive layer:

```html
<g class="facade-hit" data-section="A" data-face="Пд">
  <g class="fl" data-section="A" data-floor="6">
    <rect class="fl-hit"/>                       <!-- whole floor band -->
    <path class="apt" data-apt="A-06-2" data-section="A" data-floor="6"
          data-position="2" data-plan="L2"/>     <!-- one apartment's share of the face -->
  </g>
</g>
```

* Hovering a floor (`.fl:hover`) tints that floor's apartments by status. Hovering an apartment shows terracotta.
* Classes for the developer to add from the JSON: `.apt.is-free | .is-reserved | .is-sold`, plus `.apt.is-active`
  (and `.fl.is-active` if you style it). Colours are the brief's statuses.
* A face shows only the apartments whose `windows` include that direction. Corner flats appear on both
  long faces. **Position 5** (end-wall studio, windows Сх for A / Пн for B) is on neither long face.
  Reach it through the floor: click `.fl` → open `floor-<sec>.svg`. 164 of 183 apartments are on a facade,
  and every floor of both sections is clickable.
* Floor 1 of A (lobby + shops) has a `.fl` with no `.apt`. The top floor (set back, 4 flats) shows 2 per face.
* Floor numbers: `g.floor-numbers text.fl-num[data-floor]`.

## 2. Floor plates: `floor-A.svg`, `floor-B.svg` (typical 2…n-1), `floor-A-top.svg`, `floor-B-top.svg`, `floor-B-1.svg` (gardens)

Root: `<svg class="floorplan" data-section data-floor-type="typical|top|garden">`. The outer face is drawn on top
(A: street to the north; B: square to the east, so its north arrow points left).

```html
<path class="apt" data-apt-position="5" data-plan="L1" data-rooms="студія"
      data-area="26.4" data-windows="Сх"/>
<g class="apt-label" data-apt-position="5">…</g>   <!-- pointer-events: none -->
```

Build the id as `` `${section}-${String(floor).padStart(2,'0')}-${pos}` `` and add `is-free / is-reserved / is-sold / is-active`
(the colours are opaque and already in the SVG). The core (`.core`), stairs, lifts and corridor (`.corridor`) are not interactive.
Which file for which floor: floor 1 of B → `floor-B-1`, the last floor (`meta.sections[s].floors`) → `floor-<s>-top`,
everything else → `floor-<s>`.

## 3. Apartment plans: `plans/L1.svg … L8.svg`

Root: `<svg class="plan" data-plan-type="L4" data-area-total="57.9">`. Rooms: `rect.room.room--{kind}[data-room="Кухня"]`,
labels in `g.room-label[data-room]`. Names and areas come from `plan_types[].rooms_list`. Exterior walls are 520 mm,
partitions 100 mm. Overall dimensions are in mm. Furniture is in `g.furniture` (hide it with CSS for a "clean" plan).

**North arrow:** `g.north-arrow > g.north-arrow__rot` points up by default. The plans are drawn with the
window wall at the top. To orient the plan for a specific apartment, rotate the inner group to match `apartment.windows`:
window wall faces Пн → `rotate(0)`, Сх → `rotate(-90)`, Пд → `rotate(180)`, Зх → `rotate(90)`
(for corner flats take the first letter: `Пд-Зх` → Пд). Example: `svg.querySelector('.north-arrow__rot').setAttribute('transform','rotate(180)')`.
Mirrored flats on the floor are not mirrored in the plan. This is the usual "type plan" convention.

## 4. Site plan: `genplan.svg`

`g.bld[data-section="A|B"]` (hoverable, `.is-active` brightens it). Numbered pins `g.pin[data-pin="1…11"]` match
the legend inside the SVG (`g.legend`). Hide the legend with CSS and render your own if needed.

## 5. Icons: `icons/*.svg`

transport, school, kindergarten, park, parking, shelter, shop, pharmacy, generator, lift, ceiling, bike, courtyard, walk.
48×48, 1.3 stroke, `currentColor`; the accent detail has `class="ic-accent"` (e.g. `.ic-accent{color:#A5543A}`).
They have a fixed 48-unit grid, so they look best at 32–64 px.
