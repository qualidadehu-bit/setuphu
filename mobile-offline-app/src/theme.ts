/**
 * Mobile-first palette: off-whites, gray hierarchy, subtle pastel greens.
 */
export const theme = {
  colors: {
    bg: '#f5f5f2',
    bgElevated: '#fafaf8',
    surface: '#ffffff',
    border: '#e0e0db',
    borderStrong: '#d4d4ce',
    text: '#1c1f1c',
    textSecondary: '#5a5d58',
    textMuted: '#8c8f89',
    primary: '#6b9e82',
    primaryPressed: '#5a8a70',
    primaryMuted: '#e5efe8',
    success: '#7aab8c',
    successMuted: '#e8f2ec',
    danger: '#b85c5c',
    dangerMuted: '#f8ecec',
    overlay: 'rgba(28, 31, 28, 0.45)',
  },
  radii: { sm: 10, md: 14, lg: 18 },
  space: { xs: 8, sm: 12, md: 16, lg: 24, xl: 32 },
  touchMin: 48,
  fontSize: {
    body: 16,
    bodySmall: 14,
    title: 22,
    headline: 28,
  },
} as const;
