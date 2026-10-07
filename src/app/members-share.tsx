import { useCallback, useState, useRef } from 'react';
import { View, Alert } from 'react-native';
import { useFocusEffect, useLocalSearchParams, router } from 'expo-router';
import ViewShot from 'react-native-view-shot';
import { Screen, AppHeader, LoadingState, ErrorState, PrimaryButton } from '@/components/ui';
import { getMonthPaymentStatus, type MonthPaymentStatus } from '@/services/memberPaymentStatusService';
import { shareMemberPaymentStatus } from '@/services/memberPaymentStatusShareService';
import { MemberPaymentStatusCard } from '@/components/member-payment-status-card';

export default function MembersShareScreen() {
  const { month } = useLocalSearchParams<{ month: string }>();
  const shareRef = useRef(null);

  const [paymentStatus, setPaymentStatus] = useState<MonthPaymentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  const loadPaymentStatus = useCallback(async () => {
    if (!month) {
      setError('No month selected');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const status = await getMonthPaymentStatus(month);
      setPaymentStatus(status);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payment status');
    } finally {
      setLoading(false);
    }
  }, [month]);

  useFocusEffect(
    useCallback(() => {
      loadPaymentStatus();
    }, [loadPaymentStatus])
  );

  const handleShare = useCallback(async () => {
    if (!paymentStatus || isSharing) return;

    try {
      setIsSharing(true);

      if (!shareRef.current) {
        Alert.alert('Error', 'Payment status card not ready. Please try again.');
        return;
      }

      const imageUri = await (shareRef.current as any)?.capture?.();

      if (!imageUri) {
        Alert.alert('Error', 'Failed to capture payment status image. Please try again.');
        return;
      }

      await shareMemberPaymentStatus(imageUri, month!);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to share payment status';
      console.error('Share error:', err);
      Alert.alert('Share Error', message);
    } finally {
      setIsSharing(false);
    }
  }, [paymentStatus, isSharing, month]);

  if (loading) {
    return (
      <Screen>
        <AppHeader title="Send Payment Status" onBack={() => router.back()} />
        <LoadingState message="Loading payment status..." />
      </Screen>
    );
  }

  if (error || !paymentStatus) {
    return (
      <Screen>
        <AppHeader title="Send Payment Status" onBack={() => router.back()} />
        <View style={{ paddingHorizontal: 16, paddingTop: 16, flex: 1 }}>
          <ErrorState
            title="Error"
            description={error || 'Payment status not found'}
            action={<PrimaryButton onPress={loadPaymentStatus}>Retry</PrimaryButton>}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scrollable>
      <AppHeader title="Send Payment Status" onBack={() => router.back()} />

      <View style={{ paddingVertical: 16 }}>
        <ViewShot ref={shareRef} options={{ format: 'png', quality: 0.9 }}>
          <MemberPaymentStatusCard data={paymentStatus} />
        </ViewShot>
      </View>

      <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
        <PrimaryButton onPress={handleShare} loading={isSharing} fullWidth>
          Send
        </PrimaryButton>
      </View>
    </Screen>
  );
}
