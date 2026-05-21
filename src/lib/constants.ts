export const DAY_COLORS = [
  "#f0a830", "#d96b3a", "#7fb069", "#5aa9e6", "#c879c7", "#e8c547", "#ef6f6c",
] as const;

const AVATAR_PALETTE = [
  "#f0a830", "#d96b3a", "#7fb069", "#5aa9e6", "#c879c7", "#e8c547", "#a3a3a3", "#ef6f6c",
];

export function avatarColor(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

export const TRIP_NAME = process.env.TRIP_NAME ?? "The Trip";
export const TRIP_DAYS = 7;

// Defaults when a user hasn't saved their own.
export const DEFAULT_CONSO_L100 = 5.5;
export const DEFAULT_FUEL_PRICE = 1.92;

// Upload cap.
export const MAX_GPX_BYTES = 2 * 1024 * 1024;
