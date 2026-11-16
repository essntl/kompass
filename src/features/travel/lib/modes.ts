import type { TransportMode } from '@shared/types';
import {
  Bike,
  Bus,
  BusFront,
  CircleDot,
  Footprints,
  Ship,
  TrainFront,
  TrainFrontTunnel,
  TramFront,
  type LucideIcon,
} from 'lucide-react';

/**
 * Colours, labels and icons per transport mode. Class names are written out in full so
 * Tailwind can see them (never build `bg-mode-${mode}` dynamically).
 */
export interface ModeColorClasses {
  /** Solid fill: route rail, mode dot, fallback line badge. */
  bg: string;
  /** Mode colour as text (icons on a neutral ground). */
  text: string;
  border: string;
  /**
   * Readable text on `bg`, in both themes. `text-surface` flips with the theme like the
   * mode colours do (dark text on the lighter dark-theme colours); orange metro uses the
   * accent ink, which is dark in both themes.
   */
  onBg: string;
}

const COLORS: Record<TransportMode, ModeColorClasses> = {
  foot: { bg: 'bg-mode-foot', text: 'text-mode-foot', border: 'border-mode-foot', onBg: 'text-surface' },
  bus: { bg: 'bg-mode-bus', text: 'text-mode-bus', border: 'border-mode-bus', onBg: 'text-surface' },
  tram: { bg: 'bg-mode-tram', text: 'text-mode-tram', border: 'border-mode-tram', onBg: 'text-surface' },
  metro: { bg: 'bg-mode-metro', text: 'text-mode-metro', border: 'border-mode-metro', onBg: 'text-accent-ink' },
  rail: { bg: 'bg-mode-rail', text: 'text-mode-rail', border: 'border-mode-rail', onBg: 'text-surface' },
  water: { bg: 'bg-mode-water', text: 'text-mode-water', border: 'border-mode-water', onBg: 'text-surface' },
  coach: { bg: 'bg-mode-coach', text: 'text-mode-coach', border: 'border-mode-coach', onBg: 'text-surface' },
  bicycle: { bg: 'bg-mode-bicycle', text: 'text-mode-bicycle', border: 'border-mode-bicycle', onBg: 'text-surface' },
  other: { bg: 'bg-mode-other', text: 'text-mode-other', border: 'border-mode-other', onBg: 'text-surface' },
};

export function modeColor(mode: TransportMode): ModeColorClasses {
  return COLORS[mode] ?? COLORS.other;
}

const LABELS: Record<TransportMode, string> = {
  foot: 'gange',
  bus: 'buss',
  tram: 'trikk',
  metro: 'T-bane',
  rail: 'tog',
  water: 'båt',
  coach: 'ekspressbuss',
  bicycle: 'sykkel',
  other: 'annet',
};

/** Norwegian label, lower case for running text: "buss", "T-bane". */
export function modeLabel(mode: TransportMode): string {
  return LABELS[mode] ?? LABELS.other;
}

/** Label for the start of a sentence or a chip: "Buss", "T-bane". */
export function modeTitle(mode: TransportMode): string {
  const label = modeLabel(mode);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

const ICONS: Record<TransportMode, LucideIcon> = {
  foot: Footprints,
  bus: Bus,
  tram: TramFront,
  metro: TrainFrontTunnel,
  rail: TrainFront,
  water: Ship,
  coach: BusFront,
  bicycle: Bike,
  other: CircleDot,
};

export function modeIcon(mode: TransportMode): LucideIcon {
  return ICONS[mode] ?? ICONS.other;
}

// ---------------------------------------------------------------- operator line colours

function parseHex(hex: string): [number, number, number] | null {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  let value = match[1]!;
  if (value.length === 3) value = [...value].map((c) => c + c).join('');
  const n = Number.parseInt(value, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance([r, g, b]: [number, number, number]): number {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: string, b: string): number {
  const ca = parseHex(a);
  const cb = parseHex(b);
  if (!ca || !cb) return 1;
  const [hi, lo] = [luminance(ca), luminance(cb)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Inline colours for a line badge from the operator's colours (the only raw colours in
 * the app, and they come from the API). The operator's text colour is kept when it is
 * readable (AA, 4.5:1); otherwise black or white, whichever reads better.
 * Returns null when there is no usable operator colour – use `modeColor()` then.
 */
export function lineBadgeColors(color?: string, textColor?: string): { background: string; color: string } | null {
  if (!color || !parseHex(color)) return null;
  if (textColor && parseHex(textColor) && contrastRatio(color, textColor) >= 4.5) {
    return { background: color, color: textColor };
  }
  const black = '#000000';
  const white = '#FFFFFF';
  return {
    background: color,
    color: contrastRatio(color, white) >= contrastRatio(color, black) ? white : black,
  };
}
