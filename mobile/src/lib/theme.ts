import { Platform } from 'react-native';

export const colors = {
  ink: '#221F18',
  muted: '#6E6A5C',
  faint: '#948E7C',
  /** Warm paper base. Nothing in the app sits on plain white. */
  background: '#F7F3EC',
  surface: '#FFFDF8',
  surfaceAlt: '#EFE7D8',
  primary: '#1E5C33',
  primaryDark: '#164426',
  primarySoft: '#DCE9DA',
  /** Text on the deep-green primary: warm cream. */
  cream: '#F5EFE2',
  creamMuted: '#CDDCCB',
  /** Light text for dark surfaces (primaryDark, ink). */
  onDark: '#F5EFE2',
  /** Secondary warm accent: terracotta, used sparingly (links, active marks). */
  tan: '#C07A3E',
  tanSoft: '#F3E2D2',
  lime: '#CFE66F',
  amber: '#8A6614',
  amberSoft: '#F6E8C4',
  danger: '#A3402F',
  dangerSoft: '#F6DCD2',
  border: '#E8E0CE',
  line: '#EDE7D8',
} as const;

/** Editorial display face for headings and big numerals. */
export const fonts = {
  display: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' }) as string,
};

/** Corner radii. Marketplace UI: compact, not bubbly. */
export const radius = {
  card: 10,
  control: 8,
} as const;

/** Tinted chip styling for order/request states, shared across screens. */
export const statusTint = {
  Pending: { bg: colors.amberSoft, fg: colors.amber },
  Accepted: { bg: '#DCE9DA', fg: '#1E5C33' },
  Declined: { bg: colors.dangerSoft, fg: colors.danger },
  Completed: { bg: '#E9E4D6', fg: '#55523F' },
} as const;

export const shadow = {
  shadowColor: '#2A2416',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 6,
  elevation: 1,
};
