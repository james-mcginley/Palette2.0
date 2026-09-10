/**
 * Design tokens — ported from the CSS custom properties actually shipping in
 * project/Palette.dc.html (lines ~31-130): near-black canvas, all-Roboto (no
 * serif), green accent, uniform rounded corners in place of the brand's
 * original asymmetric "pebble" radii.
 *
 * This is the CONFIRMED final direction, not a guess. The originally-bound
 * design system (obsidian/emerald/terracotta, Playfair Display + Inter,
 * pebble radii) and project/handoff/EDITORIAL_SYSTEM.md (an espresso/amber
 * repaint with a Newsreader serif) both look like plausible alternatives if
 * you only read those documents — but chats/chat1.md records both being
 * explicitly superseded: Roboto was a deliberate request ("YouTube's UI is
 * Roboto... applying that across the app", chat1.md:4225), the black
 * canvas/uniform radii came from an explicit "make it like the app GROOVE"
 * request (chat1.md:4879), and the espresso/amber/serif repaint was
 * generated once, then explicitly rejected the same session — "Not exactly
 * what I wanted... keeping roughly the existing colour scheme. Revert"
 * (chat1.md:5850) — with only its Discover/Logbook/entry-animation
 * *structure* kept, reskinned into this same green/black/Roboto palette.
 * Full trace in PLAN.md's "Visual direction — resolved" section.
 */

export const colors = {
  surfaceCanvas: '#100E0C',
  surfaceBase: '#1A1714',
  surfaceRaised: '#221E1A',
  surfaceSunken: '#0B0A09',

  borderDefault: '#332D27',
  borderSoft: '#272220',

  // Tab bar only — the design's `--emerald-deep`, darker than surfaceBase.
  emeraldDeep: '#141210',

  accent: '#1D8A62',
  accentHover: '#25A375',
  accentPress: '#166F4E',
  accentSoft: 'rgba(29,138,98,0.16)',
  textOnAccent: '#03110C',
  textLink: '#1D8A62',

  // Editorial secondary — marks curatorial surfaces only, never a CTA.
  amber: '#D9A441',
  amberSoft: 'rgba(217,164,65,0.14)',
  amberDim: '#8A6B2E',
  textOnAmber: '#1A1207',

  danger: '#C4523E',
  dangerSoft: 'rgba(196,82,62,0.16)',

  // Paper ramp — logbook / A5-spread surfaces only.
  deskGround: '#1C1815',
  paper: '#F4F1EA',
  paperShade: '#E7E1D5',
  paperLine: 'rgba(90,74,58,0.13)',
  paperPrint: '#FCFBF7',
  paperTape: 'rgba(196,178,142,0.55)',
  paperInk: '#241F1B',
  paperPencil: '#5E4A32',
  paperMeta: '#9A8C74',
  paperDash: 'rgba(120,102,74,0.34)',
  ink: '#2B2620',
  inkSoft: '#5C5348',
  inkPencil: '#6B6154',

  textPrimary: '#F7F3ED',
  textSecondary: '#A29B92',
  textDim: '#756D64',
} as const;

export const radii = {
  sm: 12,
  md: 16,
  lg: 20,
  full: 999,
} as const;

export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 24,
  6: 32,
  7: 48,
  8: 64,
  9: 96,
} as const;

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.55,
    shadowRadius: 14,
    elevation: 6,
  },
  glowAccent: {
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 26,
    elevation: 10,
  },
} as const;

/**
 * Font family names as they must be registered with `expo-font` /
 * `useFonts` — Roboto throughout (Medium/Bold for titles, Regular for
 * metadata), Roboto Mono for stamps/tags/timestamps, Caveat for handwritten
 * logbook annotations only.
 */
export const fonts = {
  display: 'Roboto',
  body: 'Roboto',
  mono: 'RobotoMono',
  hand: 'Caveat',
} as const;

export const textStyles = {
  displayXl: { fontFamily: fonts.display, fontWeight: '700', fontSize: 64, lineHeight: 68, letterSpacing: -0.02 },
  displayLg: { fontFamily: fonts.display, fontWeight: '700', fontSize: 44, lineHeight: 48 },
  displayMd: { fontFamily: fonts.display, fontWeight: '700', fontSize: 32, lineHeight: 37 },
  headingLg: { fontFamily: fonts.display, fontWeight: '700', fontSize: 24, lineHeight: 29 },
  headingMd: { fontFamily: fonts.display, fontWeight: '500', fontSize: 20, lineHeight: 26 },
  bodyLg: { fontFamily: fonts.body, fontWeight: '400', fontSize: 18, lineHeight: 28 },
  bodyMd: { fontFamily: fonts.body, fontWeight: '400', fontSize: 16, lineHeight: 25 },
  bodyStrong: { fontFamily: fonts.body, fontWeight: '600', fontSize: 16, lineHeight: 24 },
  bodySm: { fontFamily: fonts.body, fontWeight: '400', fontSize: 14, lineHeight: 21 },
  caption: { fontFamily: fonts.body, fontWeight: '500', fontSize: 12, lineHeight: 17 },
  monoMd: { fontFamily: fonts.mono, fontWeight: '500', fontSize: 13, lineHeight: 18 },
  monoSm: { fontFamily: fonts.mono, fontWeight: '500', fontSize: 11, lineHeight: 15 },
  handNote: { fontFamily: fonts.hand, fontWeight: '400', fontSize: 17, lineHeight: 23 },
} as const;
