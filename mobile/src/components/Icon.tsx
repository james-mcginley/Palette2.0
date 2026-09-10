import React from 'react';
import Svg, { Path } from 'react-native-svg';

/**
 * Stroke-path icon set, ported verbatim from `ICONS` in
 * project/Palette.dc.html (24x24 viewBox, round caps/joins) — the design's
 * actual glyphs, not a lookalike icon-library substitute.
 */
export const ICON_PATHS = {
  plus: ['M12 5v14', 'M5 12h14'],
  search: ['M3 11a8 8 0 1 0 16 0a8 8 0 1 0 -16 0', 'M21 21l-4.35-4.35'],
  bookmark: ['M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z'],
  users: [
    'M16 11a3 3 0 100-6 3 3 0 000 6z',
    'M8 11a3 3 0 100-6 3 3 0 000 6z',
    'M2 21v-2a4 4 0 014-4h0a4 4 0 014 4v2',
    'M14 21v-2a4 4 0 014-4h0a4 4 0 014 4v2',
  ],
  rss: [
    'M4 4v4a12 12 0 0112 12h4A16 16 0 004 4z',
    'M4 12v4a4 4 0 014 4h4a8 8 0 00-8-8z',
    'M3.5 19a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0',
  ],
  gear: [
    'M12 15a3 3 0 100-6 3 3 0 000 6z',
    'M19.4 13a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.9 2.9l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.6V19a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1-1.6 1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 11-2.9-2.9l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.6-1H4a2 2 0 110-4h.1a1.7 1.7 0 001.6-1 1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 112.9-2.9l.1.1a1.7 1.7 0 001.9.3H10a1.7 1.7 0 001-1.6V4a2 2 0 114 0v.1a1.7 1.7 0 001 1.6 1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.9 2.9l-.1.1a1.7 1.7 0 00-.3 1.9V10a1.7 1.7 0 001.6 1H20a2 2 0 110 4h-.1a1.7 1.7 0 00-1.6 1z',
  ],
} as const;

export type IconName = keyof typeof ICON_PATHS;

interface IconProps {
  name: IconName;
  size?: number;
  color: string;
  strokeWidth?: number;
}

export function Icon({ name, size = 20, color, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {ICON_PATHS[name].map((d) => (
        <Path
          key={d}
          d={d}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </Svg>
  );
}
