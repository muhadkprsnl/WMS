import { useColorScheme } from 'react-native';
import { DesignSystem } from '@/constants/design-system';

export function useColors() {
  const scheme = useColorScheme();
  const theme = scheme === 'unspecified' ? 'light' : scheme;
  return DesignSystem.colors[theme];
}
