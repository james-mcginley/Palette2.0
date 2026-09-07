/**
 * AttributionFooter — Palette
 *
 * Ported from project/handoff/AttributionFooter.jsx (typed, otherwise
 * unchanged). Every third-party provider we draw artwork or metadata from
 * carries a legal obligation. This component is the single place that
 * obligation is expressed, so a media screen physically cannot render
 * provider artwork without the credit travelling with it.
 *
 * Usage:
 *   <AttributionFooter medium="FILM" />
 *   <AttributionFooter medium="VINYL" variant="compact" />
 *   <AttributionFooter providers={['tmdb']} />          // explicit override
 *
 * Also exported:
 *   ATTRIBUTION            — the registry, for the About screen
 *   ATTRIBUTION_BY_MEDIUM  — which providers each medium uses
 *   providersFor(medium)   — resolved provider objects
 *   ProviderMark           — the logo alone, for buttons and badges
 */

import React, { useCallback, useMemo } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import type { MediaType } from '@/lib/types/media';

export type ProviderId = 'tmdb' | 'spotify' | 'apple' | 'google' | 'openlibrary' | 'tvmaze' | 'wikipedia';

interface Provider {
  id: ProviderId;
  name: string;
  required: string;
  note: string;
  brand: string;
  url: string;
  linkLabel: string;
}

/* ---------------------------------------------------------------------------
 * Registry
 *
 * `required` is the wording the provider's terms oblige us to show, verbatim.
 * Do not paraphrase these strings — they are quoted from each provider's
 * branding or API terms and are the reason this file exists.
 * ------------------------------------------------------------------------- */

export const ATTRIBUTION: Record<ProviderId, Provider> = {
  tmdb: {
    id: 'tmdb',
    name: 'TMDB',
    required: 'This product uses the TMDB API but is not endorsed or certified by TMDB.',
    note: 'Posters, cast and ratings via The Movie Database.',
    brand: '#01B4E4',
    url: 'https://www.themoviedb.org/',
    linkLabel: 'themoviedb.org',
  },
  spotify: {
    id: 'spotify',
    name: 'Spotify',
    required: 'Content provided by Spotify. Spotify is a trademark of Spotify AB.',
    note: 'Album artwork and track links via the Spotify Web API.',
    brand: '#1DB954',
    url: 'https://www.spotify.com/',
    linkLabel: 'spotify.com',
  },
  apple: {
    id: 'apple',
    name: 'Apple',
    required: 'Apple, the Apple logo and Apple Podcasts are trademarks of Apple Inc.',
    note: 'Show artwork and audio previews via the iTunes Search API.',
    brand: '#FFFFFF',
    url: 'https://www.apple.com/apple-podcasts/',
    linkLabel: 'apple.com',
  },
  google: {
    id: 'google',
    name: 'Google Books',
    required: 'Book data powered by Google. Google is a trademark of Google LLC.',
    note: 'Editions, descriptions and covers via the Google Books API.',
    brand: '#4285F4',
    url: 'https://books.google.com/',
    linkLabel: 'books.google.com',
  },
  openlibrary: {
    id: 'openlibrary',
    name: 'Open Library',
    required: 'Data from Open Library, a project of the Internet Archive, used under an open data licence.',
    note: 'Covers and descriptions via the Open Library API.',
    brand: '#E1DCC5',
    url: 'https://openlibrary.org/',
    linkLabel: 'openlibrary.org',
  },
  tvmaze: {
    id: 'tvmaze',
    name: 'TVmaze',
    required: 'Series data provided by TVmaze, used under their API licence.',
    note: 'Episode and network data via the TVmaze API.',
    brand: '#3C948B',
    url: 'https://www.tvmaze.com/',
    linkLabel: 'tvmaze.com',
  },
  wikipedia: {
    id: 'wikipedia',
    name: 'Wikipedia',
    required: 'Text from Wikipedia, available under CC BY-SA 4.0.',
    note: 'Synopsis text via the Wikimedia API.',
    brand: '#C8C8C8',
    url: 'https://www.wikipedia.org/',
    linkLabel: 'wikipedia.org',
  },
};

/* Order matters: the primary source for a medium comes first. */
export const ATTRIBUTION_BY_MEDIUM: Record<MediaType, ProviderId[]> = {
  FILM: ['tmdb', 'wikipedia'],
  TV: ['tmdb', 'tvmaze'],
  BOOK: ['google', 'openlibrary'],
  VINYL: ['spotify', 'apple'],
  CAST: ['apple'],
  EVENT: [],
};

export function providersFor(medium?: MediaType): Provider[] {
  if (!medium) return [];
  return ATTRIBUTION_BY_MEDIUM[medium].map((id) => ATTRIBUTION[id]).filter(Boolean);
}

/* ---------------------------------------------------------------------------
 * Logos
 *
 * Drawn as vectors rather than bundled bitmaps so they stay crisp at every
 * density and tint correctly on a dark surface.
 * ------------------------------------------------------------------------- */

export function ProviderMark({ id, size = 18 }: { id: ProviderId; size?: number }) {
  switch (id) {
    case 'tmdb':
      return (
        <Svg width={size * 1.38} height={size} viewBox="0 0 190 138">
          <Rect width="190" height="138" rx="12" fill="#01B4E4" />
          <Path
            d="M31 40h26v8h-9v42h-8V48h-9zM66 40h8l11 26 11-26h8v50h-8V58l-9 21h-5l-9-21v32h-7zM122 40h20c11 0 18 6 18 16 0 7-3 12-9 14l11 20h-9l-10-18h-13v18h-8zm8 8v16h11c6 0 10-3 10-8s-4-8-10-8z"
            fill="#0D253F"
          />
        </Svg>
      );
    case 'spotify':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            fill="#1DB954"
            d="M12 2a10 10 0 100 20 10 10 0 000-20zm4.6 14.4a.6.6 0 01-.9.2c-2.4-1.5-5.4-1.8-9-1a.6.6 0 11-.3-1.2c3.9-.9 7.3-.5 10 1.1.3.2.4.6.2.9zm1.2-2.7a.8.8 0 01-1 .3c-2.7-1.7-6.9-2.2-10.1-1.2a.8.8 0 11-.4-1.5c3.7-1.1 8.3-.6 11.4 1.3.3.2.4.7.1 1.1zm.1-2.8C14.7 8.9 9.4 8.7 6.3 9.6a.9.9 0 11-.5-1.8c3.6-1.1 9.4-.9 13.1 1.3a.9.9 0 01-.9 1.6z"
          />
        </Svg>
      );
    case 'apple':
      return (
        <Svg width={size * 0.88} height={size} viewBox="0 0 24 24">
          <Path
            fill="#FFFFFF"
            d="M17.05 12.54c.02-2.3 1.87-3.4 1.95-3.45-1.06-1.56-2.72-1.78-3.3-1.8-1.4-.14-2.74.82-3.45.82-.72 0-1.82-.8-3-.78-1.54.02-2.96.9-3.75 2.28-1.6 2.79-.41 6.9 1.15 9.16.76 1.1 1.67 2.34 2.86 2.3 1.15-.05 1.58-.74 2.97-.74 1.38 0 1.77.74 2.98.72 1.23-.02 2.02-1.12 2.78-2.23.87-1.27 1.23-2.5 1.25-2.57-.03-.01-2.4-.92-2.42-3.66zM14.9 5.4c.63-.76 1.05-1.82.94-2.88-.93.04-2.06.62-2.72 1.38-.59.68-1.1 1.76-.96 2.8 1.04.08 2.1-.53 2.74-1.3z"
          />
        </Svg>
      );
    case 'google':
      return (
        <Svg width={size} height={size} viewBox="0 0 48 48">
          <Path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.8-6.8C35.6 2.5 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.2C12.4 13.7 17.7 9.5 24 9.5z" />
          <Path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-2.8-.4-4.1H24v9.1h12.6c-.3 2.1-1.6 5.2-4.6 7.3l7.7 6c4.6-4.3 6.4-10.4 6.4-18.3z" />
          <Path fill="#FBBC05" d="M10.5 28.6A14.6 14.6 0 019.7 24c0-1.6.3-3.2.8-4.6l-7.9-6.2A24 24 0 000 24c0 3.9.9 7.5 2.6 10.8l7.9-6.2z" />
          <Path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.7-5.8l-7.7-6c-2.1 1.4-4.8 2.3-8 2.3-6.3 0-11.6-4.2-13.5-9.9l-7.9 6.2C6.5 42.6 14.6 48 24 48z" />
        </Svg>
      );
    case 'openlibrary':
      return (
        <Svg width={size * 1.15} height={size} viewBox="0 0 24 20">
          <Path
            d="M12 5.2C10.2 3.6 7.6 3 4 3.4v12.2c3.6-.4 6.2.2 8 1.8 1.8-1.6 4.4-2.2 8-1.8V3.4c-3.6-.4-6.2.2-8 1.8z"
            fill="none"
            stroke="#E1DCC5"
            strokeWidth={1.7}
            strokeLinejoin="round"
          />
          <Path d="M12 5.2v12.2" stroke="#E1DCC5" strokeWidth={1.7} />
        </Svg>
      );
    case 'tvmaze':
      return (
        <Svg width={size * 1.15} height={size} viewBox="0 0 24 20">
          <Rect x={2.5} y={5} width={19} height={13} rx={2.5} fill="none" stroke="#3C948B" strokeWidth={1.8} />
          <Path d="M8 5L12 1.8 16 5" fill="none" stroke="#3C948B" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case 'wikipedia':
      return (
        <Svg width={size * 1.15} height={size} viewBox="0 0 24 20">
          <Path
            fill="#C8C8C8"
            d="M1.6 5.2h6.2v1.1l-1.4.3c-.3.1-.4.3-.2.7l3.3 7.6 2.2-5.2-1-2.4c-.2-.5-.4-.6-.8-.7l-.9-.2V5.2h5.6v1.1l-1 .2c-.5.1-.5.4-.4.8l3.1 7.2 2.9-7.1c.2-.5 0-.8-.5-.9l-1-.2V5.2h4.7v1.1l-.8.2c-.6.1-.8.4-1.1 1L15.8 18h-1.3l-2.7-6.3L9 18H7.7L3.4 7.4c-.2-.6-.4-.8-1-.9l-.8-.2z"
          />
        </Svg>
      );
    default:
      return <View style={{ width: size, height: size }} />;
  }
}

/* ---------------------------------------------------------------------------
 * Footer
 *
 * `full`    — logo, name and the required sentence. Media detail screens.
 * `compact` — a single row of logos with one shared line. Search results,
 *             carousels, anywhere the credit must be present but must not
 *             pull focus from the content.
 * ------------------------------------------------------------------------- */

interface AttributionFooterProps {
  medium?: MediaType;
  providers?: ProviderId[];
  variant?: 'full' | 'compact';
}

export function AttributionFooter({ medium, providers, variant = 'full' }: AttributionFooterProps) {
  const list = useMemo(() => {
    if (providers && providers.length) {
      return providers.map((p) => ATTRIBUTION[p]).filter(Boolean);
    }
    return providersFor(medium);
  }, [medium, providers]);

  const open = useCallback((url: string) => {
    Linking.openURL(url).catch(() => undefined);
  }, []);

  if (!list.length) return null;

  if (variant === 'compact') {
    return (
      <View style={s.compactWrap}>
        <View style={s.compactMarks}>
          {list.map((p) => (
            <View key={p.id} style={s.compactMark}>
              <ProviderMark id={p.id} size={13} />
            </View>
          ))}
        </View>
        <Text style={s.compactText} numberOfLines={2}>
          {list.map((p) => p.name).join(' · ')}
        </Text>
      </View>
    );
  }

  return (
    <View style={s.wrap}>
      <Text style={s.heading}>Data &amp; artwork</Text>

      {list.map((p) => (
        <Pressable
          key={p.id}
          onPress={() => open(p.url)}
          accessibilityRole="link"
          accessibilityLabel={`${p.name}. ${p.required}`}
          style={({ pressed }) => [s.row, pressed && s.rowPressed]}
        >
          <View style={s.markSlot}>
            <ProviderMark id={p.id} size={18} />
          </View>
          <View style={s.rowBody}>
            <Text style={s.name}>{p.name}</Text>
            <Text style={s.required}>{p.required}</Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

/* Palette tokens for this component specifically — kept local rather than
   importing theme/tokens.ts so the required-copy styling can't accidentally
   drift when the app-wide palette is retuned; the legal text itself must
   stay legible on any surface it's dropped onto. */
const C = {
  slate: '#809B8E',
  slateDim: '#5E7568',
  alabaster: '#FAF8F5',
  border: 'rgba(29,138,98,0.22)',
};

const s = StyleSheet.create({
  wrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
    paddingTop: 14,
    gap: 11,
  },
  heading: {
    fontFamily: 'RobotoMono-Regular',
    fontSize: 8.5,
    letterSpacing: 1.5,
    color: C.slateDim,
    textTransform: 'uppercase',
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  rowPressed: { opacity: 0.6 },
  markSlot: { width: 19, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  rowBody: { flex: 1, minWidth: 0 },
  name: { fontFamily: 'Roboto-Medium', fontSize: 11.5, fontWeight: '600', color: C.slate },
  required: { fontFamily: 'Roboto-Regular', fontSize: 10.5, lineHeight: 15, color: C.slateDim, marginTop: 2 },

  compactWrap: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  compactMarks: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  compactMark: { opacity: 0.75 },
  compactText: {
    fontFamily: 'RobotoMono-Regular',
    fontSize: 8.5,
    letterSpacing: 1.2,
    color: C.slateDim,
    textTransform: 'uppercase',
    flexShrink: 1,
  },
});
