import { View, ViewProps, ActivityIndicator, useColorScheme } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { DesignSystem } from '@/constants/design-system';

interface StateContainerProps extends ViewProps {
  children: React.ReactNode;
}

function StateContainer({ children, style, ...rest }: StateContainerProps) {
  return (
    <View
      style={[
        {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: DesignSystem.spacing.lg,
        },
        style,
      ]}
      {...rest}>
      {children}
    </View>
  );
}

interface LoadingStateProps extends ViewProps {
  message?: string;
}

export function LoadingState({ message = 'Loading...', style, ...rest }: LoadingStateProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? DesignSystem.colors.dark : DesignSystem.colors.light;

  return (
    <StateContainer style={style} {...rest}>
      <ActivityIndicator size="large" color={colors.primary} style={{ marginBottom: DesignSystem.spacing.md }} />
      <ThemedText type="bodyMedium" style={{ textAlign: 'center' }}>
        {message}
      </ThemedText>
    </StateContainer>
  );
}

interface EmptyStateProps extends ViewProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, action, style, ...rest }: EmptyStateProps) {
  return (
    <StateContainer style={style} {...rest}>
      <ThemedText type="titleMedium" style={{ textAlign: 'center', marginBottom: DesignSystem.spacing.md }}>
        {title}
      </ThemedText>
      {description && (
        <ThemedText
          themeColor="textSecondary"
          type="bodyMedium"
          style={{ textAlign: 'center', marginBottom: DesignSystem.spacing.lg }}>
          {description}
        </ThemedText>
      )}
      {action}
    </StateContainer>
  );
}

interface ErrorStateProps extends ViewProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export function ErrorState({
  title = 'Something went wrong',
  description,
  action,
  style,
  ...rest
}: ErrorStateProps) {
  const colorScheme = useColorScheme();
  const colors = DesignSystem.colors[colorScheme === 'dark' ? 'dark' : 'light'];

  return (
    <StateContainer style={style} {...rest}>
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: colors.error,
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: DesignSystem.spacing.md,
        }}>
        <ThemedText type="titleLarge" style={{ color: colors.onError }}>
          !
        </ThemedText>
      </View>
      <ThemedText type="titleMedium" style={{ textAlign: 'center', marginBottom: DesignSystem.spacing.md }}>
        {title}
      </ThemedText>
      {description && (
        <ThemedText
          themeColor="textSecondary"
          type="bodyMedium"
          style={{ textAlign: 'center', marginBottom: DesignSystem.spacing.lg }}>
          {description}
        </ThemedText>
      )}
      {action}
    </StateContainer>
  );
}
