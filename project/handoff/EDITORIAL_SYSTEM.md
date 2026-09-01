# Palette — Editorial System

Design specification for three features: the Discover grid, the Logbook
library, and the home-screen entry animation.

The reference is analog: indie film magazines, unbleached paper, printed
photographs, handwriting. The rule that follows from it — **nothing in this
system should look generated.** Corners are slightly off, grain is present,
type is set rather than defaulted.

---

## 0. Tokens

### Colour

Palette's existing green stays the action colour. What changes is the neutral
ramp — cool near-black becomes warm espresso — and a new amber that is
reserved for editorial surfaces.

```
/* Surfaces — espresso, not black. Every value carries a red/yellow bias so
   photography sits on the page rather than floating on a void. */
--surface-canvas   #100E0C   app background
--surface-base     #1A1714   cards
--surface-raised   #221E1A   elevated cards, sheets
--surface-sunken   #0B0A09   wells, inset areas

--border-soft      #272220   hairlines
--border-default   #332D27   card edges

/* Type */
--text-primary     #F7F3ED   warm white, never #FFF
--text-secondary   #A29B92   metadata
--text-dim         #756D64   timestamps, counts

/* Action — unchanged */
--accent           #1D8A62
--accent-hover     #25A375
--accent-soft      rgba(29,138,98,0.16)
--text-on-accent   #03110C

/* Editorial — amber. Carries no action, ever. */
--amber            #D9A441   feature tile eyebrows, collection rules
--amber-soft       rgba(217,164,65,0.14)
--amber-dim        #8A6B2E
--text-on-amber    #1A1207

/* Paper — logbook only */
--paper            #F4F1EA
--paper-shade      #E7E1D5   page edge, gutter shadow
--paper-line       rgba(90,74,58,0.13)
--ink              #2B2620
--ink-soft         #5C5348
--ink-pencil       #6B6154   annotations
```

**The amber rule matters.** Two accent colours normally means users cannot tell
what is tappable. It works here only because the division is absolute: green is
interactive, amber is editorial chrome. An amber element is never a button. If
a feature tile needs a CTA, the CTA is green.

### Type

Two families. A high-contrast serif for editorial voice, a neutral sans for
everything functional.

```
--font-editorial  'Newsreader', 'Playfair Display', Georgia, serif
--font-ui         'Roboto', -apple-system, system-ui, sans-serif
--font-mono       'Roboto Mono', ui-monospace, monospace
--font-hand       'Caveat', 'Bradley Hand', cursive     /* logbook only */
```

| Token | Value | Use |
|---|---|---|
| `editorial-hero` | 400 34px/1.12 serif, -0.02em | Feature tile titles |
| `editorial-lg` | 400 26px/1.16 serif, -0.015em | Collection headers |
| `editorial-md` | 400 20px/1.25 serif | Card titles |
| `editorial-quote` | 400 italic 17px/1.5 serif | Pull-quotes, curator notes |
| `ui-title` | 600 15px/1.3 sans | Item titles in lists |
| `ui-body` | 400 14px/1.55 sans | Body copy |
| `ui-meta` | 400 12px/1.4 sans | Secondary metadata |
| `stamp` | 500 9.5px/1.3 mono, 0.16em, uppercase | Eyebrows, tags, counts |
| `hand-note` | 400 17px/1.35 hand | Logbook annotations |

Serif for what a person wrote. Sans for what the system knows. A runtime,
a rating count and a page number are never set in serif.

### Grain

The single texture that ties the aesthetic together. One SVG turbulence,
applied as an overlay, `pointer-events: none`.

```css
.grain::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.16;
  mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}
```

Opacity by context: `0.16` on imagery, `0.08` on flat surfaces, `0.05` on
paper. Above ~0.2 it reads as a broken screen rather than film.

**Performance:** render the noise once to a canvas and reuse it as a texture.
Do not attach a live SVG filter to a scrolling list — it re-rasterises per
frame and will drop the scroll to single-digit fps on older devices.

### Spacing & shape

8px base. Gutters 20px, card padding 16px, section gap 28px.

Radii are subtly asymmetric — `14px 6px 12px 8px` — so tiles read as cut paper
rather than CSS. Circles stay circles. Anything over 24px on one corner starts
to look like a mistake rather than an intention.

---

## 1. Discover — the editorial grid

Structured like a magazine's contents page, not a shop.

### Tile taxonomy

Four tile types. Anything that does not fit one of them does not belong on
Discover.

**A · Feature (full-bleed, 2-col span, 4:5)**
One dominant image, heavily graded. Title set in serif over the lower third,
sitting on a gradient scrim, not a solid bar.

```
┌──────────────────────────────┐
│                              │
│      [full-bleed image,      │
│       graded + grained]      │
│                              │
│  ─────────────────────────   │  ← scrim begins ~55%
│  THE ESSAY            ·amber │  ← stamp, tracked
│  Succession:                 │  ← editorial-hero, serif
│  a Shakespearean tragedy     │     italic on the subtitle line
│  6 films · 4 books           │  ← ui-meta
└──────────────────────────────┘
```

Grading: `saturate(0.82) contrast(1.08) brightness(0.86)` plus a
`rgba(217,164,65,0.06)` warm wash. This is what makes a stock still look like
a frame from a print.

**B · Cross-media collection (2-col span, 3:2)**
The signature tile — the one the moodboard is actually about. Three covers
fanned on a warm ground under a single vibe header.

```
┌──────────────────────────────┐
│  WITH SIMILAR VIBES   ·amber │
│  Urban Loneliness            │  ← editorial-lg, serif
│                              │
│   ┌───┐  ┌───┐  ┌───┐        │  ← film / book / record
│   │   │ ┌│   │ ┌│   │        │     each rotated -4°, 2°, -2°
│   └───┘ └└───┘ └└───┘        │     overlapping ~18px
│    FILM   BOOK   LP          │  ← stamp under each
└──────────────────────────────┘
```

The three covers are the *content*, not decoration — each is independently
tappable and opens its own detail sheet. Tapping the tile background opens the
collection.

Rotation is per-item and fixed, derived from the item id, not random per
render — a card that reshuffles its angle on every scroll looks broken.

**C · Ranked list (1-col, 4:5)**
Cover with a large mono numeral bottom-left, half-off the image edge.
For "100 Essential Thrillers" and similar.

**D · Standard item (1-col, 2:3)**
Cover, title, one line of metadata. The workhorse.

### Grid rhythm

Two columns, 12px gutter. Never more than two consecutive rows of the same
tile type — the variety is the editorial feel.

```
A A          feature
C  D         ranked + item
B B          collection
D  D         two items
A A          feature
```

### Section headers

```
┌──────────────────────────────┐
│  ───────────────  ·amber 1px │
│  Films that feel like A24    │  ← editorial-lg
│  Chosen by the Cameo         │  ← ui-meta
└──────────────────────────────┘
```

A 1px amber rule above the header, 32px wide, not full width. Small detail,
does most of the magazine work.

### States

| State | Treatment |
|---|---|
| Rest | Grain 0.16, grade applied |
| Press | `scale(0.985)`, 120ms, grade lifts to `brightness(0.94)` |
| Loading | Skeleton at `--surface-base`, shimmer 1.4s, **no spinner** |
| No image | Amber-dim ground, title set large in serif, centred |
| Saved | Small amber corner fold, top-right, 18px |

The no-image fallback is important — APIs return coverless items constantly,
and a grey box with a broken-image glyph destroys the aesthetic instantly. A
title set well on a coloured ground looks deliberate.

---

## 2. Logbook — the A5 spread

Unlocks at 10 logged items. Before that the toggle is hidden, not disabled —
a greyed control invites a question you have to answer.

### Surface

Desk ground `#1C1815` with a soft radial warm light from top-left. Page is
`--paper` with a `--paper-line` dot grid at 24px. Gutter is a 40px vertical
gradient — `paper-shade` at the spine falling to transparent — which is what
sells two pages as one physical spread.

Page shadow: `0 24px 60px rgba(0,0,0,0.5)`, plus a 1px `--paper-shade` inner
edge on the outer margins.

### Anatomy

```
┌─────────────────┬─────────────────┐
│ 2026.08 ─ WEEK 3│                 │  ← mono, ink-soft
│                 │   ┌─────────┐   │
│  ┌────────┐     │   │ [cover] │   │  ← "taped" photo
│  │[cover] │╱    │   │         │   │     rotate(1.5deg)
│  │        │     │   └─────────┘   │     + tape strip
│  └────────┘     │    ★★★★☆        │
│   ★★★★★         │                 │
│                 │  ~ the harp     │  ← hand-note, ink-pencil
│  ~ finished on  │    comes in     │
│    the train ~  │    and the flat │
│                 │    changes      │
│      ↘ doodle   │    temperature  │
│                 │                 │
│  ─── 14 ───     │   ─── 15 ───    │  ← folio, mono
└─────────────────┴─────────────────┘
```

**Taped photo.** Cover at 2px `--paper` border, `0 3px 10px rgba(0,0,0,0.22)`,
rotated ±1–2° (fixed per item id). A 34×14px translucent tape strip at one
corner, `rgba(240,232,214,0.55)`, rotated against the photo.

**Star stamps.** Not a clean glyph row — slightly uneven baseline (±1px) and
`opacity: 0.88`, as if pressed by hand.

**Annotations.** `--font-hand` in `--ink-pencil`, set at a 1–2° tilt, in the
margin rather than in the column. Pulled from the user's own review text; if
they wrote nothing, the margin stays empty. **Never generate a fake handwritten
note** — the entire premise is that this is their book.

### Page turn

The interaction that makes it worth building.

- Horizontal drag, or tap the outer third of either page
- `transform-origin` at the spine, `rotateY` follows the finger 0→-180°
- `perspective: 1600px` on the container
- Back face carries `--paper-shade` and a `brightness(0.94)` — paper is opaque
- Release past 35% completes; under 35% springs back
- 420ms, `cubic-bezier(0.22, 0.61, 0.36, 1)`
- Haptic `impactLight` at the moment the page passes 90°

**Fallback:** below 60fps, or with reduce-motion set, replace with a 180ms
cross-fade and slide. The gesture and the chronology still work; only the
flourish goes.

### Chronology

Pages are weeks, not fixed counts — a heavy week fills a spread, a quiet week
leaves white space. That variation is the point: an honest record of how much
you actually consumed. Never pad a sparse page.

A pinch-out zooms to a year view: twelve spread thumbnails in a grid.

---

## 3. Entry animation — the polaroid draw

Four seconds at most, skippable on first touch. It runs on cold launch only —
warm resume goes straight to the feed. An animation you cannot skip is a
delight for one week and a tax forever.

### Sequence

**0.0–0.4s · Dark**
Espresso ground. A single warm light blooms from top-left,
`radial-gradient(rgba(217,164,65,0.10), transparent 60%)`.

**0.4–1.6s · The draw**
Five recent covers, stacked face-down and slightly fanned, are drawn upward
out of frame-bottom as if pulled from a sleeve. Each is `translateY(120% → 0)`
with `rotate` easing to its resting angle (-6°, 3°, -2°, 5°, -3°), staggered
90ms apart, `cubic-bezier(0.16, 1, 0.3, 1)`.

Each card carries a moving specular sweep — a 30°-angled white gradient at
`0.12` opacity crossing as it rises. That highlight is what reads as *gloss on
a physical print*.

**1.6–2.4s · Settle**
The stack breathes: a 2° oscillation damping to rest over 800ms. Grain fades
in to 0.16.

**2.4–3.2s · Spread**
Cards fan into their feed positions and the UI chrome fades up beneath them.
Haptic `impactMedium` on the first card landing, `impactLight` on the rest.

### Interactive rest state

The stack stays touch-reactive on the feed until first scroll:

- Drag: top card follows with rotation proportional to horizontal offset
- Release past 40% width: card flicks away, next rises — a physical discard
- Warm light shifts with device tilt, ±8px parallax off the accelerometer
- Long-press: card lifts `scale(1.04)` with shadow deepening, haptic `selection`

### Constraints

| Rule | Why |
|---|---|
| Skip on any touch | Respect for the returning user |
| Cold launch only | Nobody wants ceremony on every resume |
| Reduce-motion → 200ms fade | Accessibility, non-negotiable |
| Real covers, not placeholders | Uses the last five they logged |
| Never blocks data fetch | Feed loads behind it; animation is not a loader |

Preload the five covers before the sequence starts. A card that pops in
mid-animation is worse than no animation.

---

## Handover notes

**Build order.** Discover first — it is the highest-traffic surface and the
tokens it establishes carry everywhere else. Entry animation second, since it
depends on those tokens and on real logged data. Logbook last: it is the most
technically involved and the least critical, and it needs 10+ items before a
user ever sees it.

**Risks worth naming.**
- Grain is the single biggest performance hazard. Canvas-render once; never a
  live filter on a scroll surface.
- The page turn will need a native driver (Reanimated worklet or equivalent).
  A JS-thread implementation drops frames on mid-range Android and the whole
  effect collapses.
- Two accent colours only survives if the green/amber division is enforced in
  review. The first amber button undoes it.
- Serif at small sizes is a legibility problem. Nothing below 17px is set in
  the editorial face — metadata is sans, always.
