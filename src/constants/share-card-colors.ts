/**
 * Share card color palette
 *
 * Colors for the shareable Water Bill and Member Payment Status cards.
 * These cards are rendered as white (#FFFFFF) backgrounds and must be readable
 * regardless of the app's theme. All text must have explicit, theme-independent colors.
 */

export const ShareCardColors = {
  background: '#FFFFFF',
  textPrimary: '#212121',
  textSecondary: '#616161',
  textMuted: '#757575',
  positive: '#1B5E20',
  negative: '#D32F2F',
  divider: '#E0E0E0',
  closingBackground: '#F5F5F5',
  closingBackgroundNegative: '#FFEBEE',
} as const;
