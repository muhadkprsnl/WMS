
export const DesignSystem = {
  colors: {
    light: {
      primary: '#208AEF',
      primaryDark: '#1565C0',
      success: '#4CAF50',
      warning: '#FF9800',
      error: '#F44336',
      info: '#2196F3',

      surface: '#FFFFFF',
      surfaceVariant: '#F5F5F5',
      surfaceAlt: '#F0F0F3',

      text: '#000000',
      textSecondary: '#60646C',
      textTertiary: '#B0B4BA',
      textDisabled: '#9CA3AF',

      border: '#E5E7EB',
      borderLight: '#F3F4F6',

      onPrimary: '#FFFFFF',
      onSuccess: '#FFFFFF',
      onWarning: '#FFFFFF',
      onError: '#FFFFFF',
      onInfo: '#FFFFFF',

      successContainer: '#E8F5E9',
      onSuccessContainer: '#1B5E20',
      warningContainer: '#FFF3E0',
      onWarningContainer: '#E65100',
      errorContainer: '#FFEBEE',
      onErrorContainer: '#B71C1C',
      infoContainer: '#E3F2FD',
      onInfoContainer: '#0D47A1',

      overlay: 'rgba(0, 0, 0, 0.5)',
      overlayLight: 'rgba(0, 0, 0, 0.08)',
    },
    dark: {
      primary: '#64B5F6',
      primaryDark: '#2196F3',
      success: '#81C784',
      warning: '#FFB74D',
      error: '#EF5350',
      info: '#64B5F6',

      surface: '#121212',
      surfaceVariant: '#1E1E1E',
      surfaceAlt: '#212225',

      text: '#FFFFFF',
      textSecondary: '#B0B4BA',
      textTertiary: '#60646C',
      textDisabled: '#4F5359',

      border: '#2E3135',
      borderLight: '#3A3F47',

      onPrimary: '#000000',
      onSuccess: '#000000',
      onWarning: '#000000',
      onError: '#000000',
      onInfo: '#000000',

      successContainer: '#1B5E20',
      onSuccessContainer: '#C8E6C9',
      warningContainer: '#E65100',
      onWarningContainer: '#FFE0B2',
      errorContainer: '#B71C1C',
      onErrorContainer: '#FFCDD2',
      infoContainer: '#0D47A1',
      onInfoContainer: '#BBDEFB',

      overlay: 'rgba(0, 0, 0, 0.7)',
      overlayLight: 'rgba(255, 255, 255, 0.1)',
    },
  },

  typography: {
    displayLarge: {
      fontSize: 57,
      lineHeight: 64,
      fontWeight: '400' as const,
      letterSpacing: 0,
    },
    displayMedium: {
      fontSize: 45,
      lineHeight: 52,
      fontWeight: '400' as const,
      letterSpacing: 0,
    },
    displaySmall: {
      fontSize: 36,
      lineHeight: 44,
      fontWeight: '400' as const,
      letterSpacing: 0,
    },
    headlineLarge: {
      fontSize: 32,
      lineHeight: 40,
      fontWeight: '600' as const,
      letterSpacing: 0,
    },
    headlineMedium: {
      fontSize: 28,
      lineHeight: 36,
      fontWeight: '600' as const,
      letterSpacing: 0,
    },
    headlineSmall: {
      fontSize: 24,
      lineHeight: 32,
      fontWeight: '600' as const,
      letterSpacing: 0,
    },
    titleLarge: {
      fontSize: 22,
      lineHeight: 28,
      fontWeight: '600' as const,
      letterSpacing: 0,
    },
    titleMedium: {
      fontSize: 18,
      lineHeight: 26,
      fontWeight: '600' as const,
      letterSpacing: 0,
    },
    titleSmall: {
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '600' as const,
      letterSpacing: 0,
    },
    bodyLarge: {
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '500' as const,
      letterSpacing: 0,
    },
    bodyMedium: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '500' as const,
      letterSpacing: 0,
    },
    bodySmall: {
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '500' as const,
      letterSpacing: 0,
    },
    labelLarge: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '600' as const,
      letterSpacing: 0.1,
    },
    labelMedium: {
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '600' as const,
      letterSpacing: 0.1,
    },
    labelSmall: {
      fontSize: 11,
      lineHeight: 16,
      fontWeight: '600' as const,
      letterSpacing: 0.5,
    },
  },

  spacing: {
    none: 0,
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    max: 64,
  },

  borderRadius: {
    none: 0,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },

  elevation: {
    none: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 4,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.14,
      shadowRadius: 6,
      elevation: 6,
    },
    xl: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.16,
      shadowRadius: 8,
      elevation: 8,
    },
  },

  touchTargets: {
    min: 44,
    comfortable: 48,
    large: 56,
  },

  sizing: {
    icon: {
      xs: 16,
      sm: 20,
      md: 24,
      lg: 32,
      xl: 40,
    },
  },
};

export type DesignSystemType = typeof DesignSystem;
