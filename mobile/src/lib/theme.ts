export const colors = {
  ink: '#221F18',
  muted: '#6E6A5C',
  faint: '#948E7C',
  /** Warm paper base. Nothing in the app sits on plain white. */
  background: '#F6F2EA',
  surface: '#FFFDF8',
  surfaceAlt: '#EFE8D9',
  primary: '#1F6B3A',
  primaryDark: '#164D2B',
  primarySoft: '#DFEBDD',
  /** Secondary warm accent: terracotta, used sparingly (links, active marks). */
  tan: '#B0713A',
  tanSoft: '#F3E2D2',
  lime: '#CFE66F',
  amber: '#8A6614',
  amberSoft: '#F6E8C4',
  danger: '#A3402F',
  dangerSoft: '#F6DCD2',
  border: '#E7E0CF',
  line: '#EDE7D8',
} as const;

/** Corner radii. Marketplace UI: compact, not bubbly. */
export const radius = {
  card: 10,
  control: 8,
} as const;

/** Tinted chip styling for order/request states, shared across screens. */
export const statusTint = {
  Pending: { bg: colors.amberSoft, fg: colors.amber },
  Accepted: { bg: '#DCE9DA', fg: colors.primaryDark },
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
