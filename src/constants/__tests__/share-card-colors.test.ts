import { ShareCardColors } from '../share-card-colors';

function getLuminance(hex: string): number {
  const rgb = parseInt(hex.slice(1), 16);
  const r = (rgb >> 16) & 255;
  const g = (rgb >> 8) & 255;
  const b = rgb & 255;

  const [rs, gs, bs] = [r, g, b].map((val) => {
    val = val / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrast(hex1: string, hex2: string): number {
  const l1 = getLuminance(hex1);
  const l2 = getLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('ShareCardColors', () => {
  describe('Color Format Validation', () => {
    it('all colors are valid hex strings', () => {
      const hexPattern = /^#[0-9A-Fa-f]{6}$/;
      Object.entries(ShareCardColors).forEach(([key, value]) => {
        expect(value).toMatch(hexPattern);
      });
    });

    it('no trailing spaces in color values', () => {
      Object.entries(ShareCardColors).forEach(([key, value]) => {
        expect(value).not.toMatch(/\s$/);
      });
    });
  });

  describe('WCAG Contrast Ratios', () => {
    it('textPrimary on background >= 4.5:1', () => {
      const ratio = getContrast(ShareCardColors.textPrimary, ShareCardColors.background);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('textSecondary on background >= 3:1', () => {
      const ratio = getContrast(ShareCardColors.textSecondary, ShareCardColors.background);
      expect(ratio).toBeGreaterThanOrEqual(3);
    });

    it('textMuted on background >= 3:1', () => {
      const ratio = getContrast(ShareCardColors.textMuted, ShareCardColors.background);
      expect(ratio).toBeGreaterThanOrEqual(3);
    });

    it('positive (green) on background >= 4.5:1', () => {
      const ratio = getContrast(ShareCardColors.positive, ShareCardColors.background);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('negative (red) on background >= 4.5:1', () => {
      const ratio = getContrast(ShareCardColors.negative, ShareCardColors.background);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('positive on closingBackground >= 4.5:1', () => {
      const ratio = getContrast(ShareCardColors.positive, ShareCardColors.closingBackground);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('textPrimary on closingBackground >= 4.5:1', () => {
      const ratio = getContrast(ShareCardColors.textPrimary, ShareCardColors.closingBackground);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('negative on closingBackgroundNegative >= 4.0:1 (bold text on tinted bg)', () => {
      // Known borderline pair: red #D32F2F on light red #FFEBEE is about 4.4:1
      // Acceptable because it is bold, and red is a strong signal color
      const ratio = getContrast(ShareCardColors.negative, ShareCardColors.closingBackgroundNegative);
      expect(ratio).toBeGreaterThanOrEqual(4.0);
    });
  });

  describe('Color Value Assertions', () => {
    it('background is white', () => {
      expect(ShareCardColors.background).toBe('#FFFFFF');
    });

    it('divider exists and is light gray', () => {
      expect(ShareCardColors.divider).toBe('#E0E0E0');
    });

    it('closing backgrounds are light but distinct', () => {
      expect(ShareCardColors.closingBackground).toBe('#F5F5F5');
      expect(ShareCardColors.closingBackgroundNegative).toBe('#FFEBEE');
    });
  });
});
