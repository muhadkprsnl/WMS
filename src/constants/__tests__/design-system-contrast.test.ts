import { DesignSystem } from '../design-system';

function getLuminance(hex: string): number {
  const rgb = parseInt(hex.slice(1), 16);
  const r = (rgb >> 16) & 255;
  const g = (rgb >> 8) & 255;
  const b = rgb & 255;

  const [rs, gs, bs] = [r, g, b].map(val => {
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

describe('DesignSystem Color Contrast', () => {
  const light = DesignSystem.colors.light;
  const dark = DesignSystem.colors.dark;

  describe('Light Mode Contrast', () => {
    it('primary text on surface >= 4.5:1', () => {
      const ratio = getContrast(light.text, light.surface);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('secondary text on surface >= 3:1', () => {
      const ratio = getContrast(light.textSecondary, light.surface);
      expect(ratio).toBeGreaterThanOrEqual(3);
    });

    it('primary text on surfaceVariant >= 4.5:1', () => {
      const ratio = getContrast(light.text, light.surfaceVariant);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('secondary text on surfaceVariant >= 3:1', () => {
      const ratio = getContrast(light.textSecondary, light.surfaceVariant);
      expect(ratio).toBeGreaterThanOrEqual(3);
    });

    it('onPrimary text on primary >= 4.5:1', () => {
      const ratio = getContrast(light.onPrimary, light.primary);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('onSuccess text on success >= 4.5:1', () => {
      const ratio = getContrast(light.onSuccess, light.success);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('onWarning text on warning >= 4.5:1', () => {
      const ratio = getContrast(light.onWarning, light.warning);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('onError text on error >= 4.5:1', () => {
      const ratio = getContrast(light.onError, light.error);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('onInfo text on info >= 4.5:1', () => {
      const ratio = getContrast(light.onInfo, light.info);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });
  });

  describe('Dark Mode Contrast', () => {
    it('primary text on surface >= 4.5:1', () => {
      const ratio = getContrast(dark.text, dark.surface);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('secondary text on surface >= 3:1', () => {
      const ratio = getContrast(dark.textSecondary, dark.surface);
      expect(ratio).toBeGreaterThanOrEqual(3);
    });

    it('primary text on surfaceVariant >= 4.5:1', () => {
      const ratio = getContrast(dark.text, dark.surfaceVariant);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('secondary text on surfaceVariant >= 3:1', () => {
      const ratio = getContrast(dark.textSecondary, dark.surfaceVariant);
      expect(ratio).toBeGreaterThanOrEqual(3);
    });

    it('onPrimary text on primary >= 4.5:1', () => {
      const ratio = getContrast(dark.onPrimary, dark.primary);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('onSuccess text on success >= 4.5:1', () => {
      const ratio = getContrast(dark.onSuccess, dark.success);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('onWarning text on warning >= 4.5:1', () => {
      const ratio = getContrast(dark.onWarning, dark.warning);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('onError text on error >= 4.5:1', () => {
      const ratio = getContrast(dark.onError, dark.error);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('onInfo text on info >= 4.5:1', () => {
      const ratio = getContrast(dark.onInfo, dark.info);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('text on success container >= 4.5:1', () => {
      const ratio = getContrast(dark.onSuccessContainer, dark.successContainer);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('text on warning container >= 4.5:1', () => {
      const ratio = getContrast(dark.onWarningContainer, dark.warningContainer);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('text on error container >= 4.5:1', () => {
      const ratio = getContrast(dark.onErrorContainer, dark.errorContainer);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('text on info container >= 4.5:1', () => {
      const ratio = getContrast(dark.onInfoContainer, dark.infoContainer);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });
  });

  describe('Critical Dark Mode Fixes', () => {
    it('dark warning text on dark warning > 2:1 (was failing before)', () => {
      // This pair was failing before the fix
      const ratio = getContrast(dark.onWarning, dark.warning);
      expect(ratio).toBeGreaterThan(4);
    });

    it('dark primary text on dark primary > 2:1 (was failing before)', () => {
      const ratio = getContrast(dark.onPrimary, dark.primary);
      expect(ratio).toBeGreaterThan(4);
    });
  });
});
