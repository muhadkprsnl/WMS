import React from 'react';
import { View } from 'react-native';
import { ShareCardText } from './share-card-text';
import { ShareCardColors } from '@/constants/share-card-colors';
import { MonthlyWaterBill } from '@/services/monthlyBalanceService';

interface MonthlyWaterBillCardProps {
  data: MonthlyWaterBill;
  memberCount?: number;
}

/**
 * Monthly water bill card: visible on dashboard and shareable via ViewShot
 *
 * Shows:
 * - Opening balance (with minus sign if negative)
 * - Collection (+)
 * - Water purchases by type and price (-)
 * - Closing balance (with minus sign if negative, red if negative)
 *
 * Uses ThemedText with explicit palette colors (no theme inheritance).
 * Readable in any app theme (light or dark mode).
 */

export const MonthlyWaterBillCard = React.forwardRef<View, MonthlyWaterBillCardProps>(
  ({ data, memberCount = 0 }, ref) => {
    const formatMoney = (fils: number): string => {
      const isNegative = fils < 0;
      const abs = Math.abs(fils) / 100;
      const sign = isNegative ? '-' : '';
      return `${sign}AED ${abs.toFixed(2)}`;
    };

    const formatMonth = (monthStr: string) => {
      const [year, month] = monthStr.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    };

    // Calculate quantities by type for the invoice summary
    const wholesaleQty = data.waterLines
      .filter((line) => line.type === 'wholesale')
      .reduce((sum, line) => sum + line.quantity, 0);
    const retailQty = data.waterLines
      .filter((line) => line.type === 'retail')
      .reduce((sum, line) => sum + line.quantity, 0);
    const totalQty = wholesaleQty + retailQty;

    const closingIsNegative = data.closingBalance < 0;
    const openingIsNegative = data.openingBalance < 0;

    return (
      <View
        ref={ref}
        style={{
          backgroundColor: ShareCardColors.background,
          padding: 20,
          borderRadius: 8,
          gap: 12,
          overflow: 'hidden',
        }}
      >
        {/* Title */}
        <View style={{ marginBottom: 4 }}>
          <ShareCardText type="titleSmall" style={{ fontWeight: '600', color: ShareCardColors.textPrimary }}>
            Water Bill
          </ShareCardText>
          <ShareCardText type="bodySmall" style={{ color: ShareCardColors.textMuted, marginTop: 4 }}>
            {formatMonth(data.month)}
          </ShareCardText>
        </View>

        {/* Opening Balance */}
        <View style={{ flexDirection: 'row', paddingVertical: 8 }}>
          <ShareCardText type="bodySmall" style={{ color: ShareCardColors.textSecondary, flex: 1 }} numberOfLines={1}>
            Opening balance
          </ShareCardText>
          <ShareCardText
            type="bodySmall"
            style={{
              fontWeight: '600',
              color: openingIsNegative ? ShareCardColors.negative : ShareCardColors.textPrimary,
              flexShrink: 0,
              textAlign: 'right',
            }}
            numberOfLines={1}
          >
            {formatMoney(data.openingBalance)}
          </ShareCardText>
        </View>

        {/* Collection */}
        {memberCount > 0 && (
          <View style={{ flexDirection: 'row', paddingVertical: 8 }}>
            <ShareCardText type="bodySmall" style={{ color: ShareCardColors.textSecondary, flex: 1 }} numberOfLines={1}>
              Collection {memberCount} × {(data.collection / Math.max(memberCount, 1) / 100).toFixed(0)}
            </ShareCardText>
            <ShareCardText type="bodySmall" style={{ fontWeight: '600', color: ShareCardColors.positive, flexShrink: 0, textAlign: 'right' }} numberOfLines={1}>
              + {formatMoney(data.collection)}
            </ShareCardText>
          </View>
        )}
        {memberCount === 0 && (
          <View style={{ flexDirection: 'row', paddingVertical: 8 }}>
            <ShareCardText type="bodySmall" style={{ color: ShareCardColors.textSecondary, flex: 1 }} numberOfLines={1}>
              Collection
            </ShareCardText>
            <ShareCardText type="bodySmall" style={{ fontWeight: '600', color: ShareCardColors.positive, flexShrink: 0, textAlign: 'right' }} numberOfLines={1}>
              + {formatMoney(data.collection)}
            </ShareCardText>
          </View>
        )}

        {/* Water Purchased - Quantity Summary Section */}
        <View style={{ marginTop: 4 }}>
          <ShareCardText type="bodySmall" style={{ color: ShareCardColors.textMuted, fontWeight: '600', marginBottom: 8 }}>
            Water purchased
          </ShareCardText>

          {/* Wholesale row */}
          <View style={{ flexDirection: 'row', paddingVertical: 6 }}>
            <ShareCardText type="bodySmall" style={{ color: ShareCardColors.textSecondary, flex: 1 }} numberOfLines={1}>
              Wholesale
            </ShareCardText>
            <ShareCardText type="bodySmall" style={{ fontWeight: '600', color: ShareCardColors.textPrimary, flexShrink: 0, textAlign: 'right' }} numberOfLines={1}>
              {wholesaleQty} units
            </ShareCardText>
          </View>

          {/* Retail row */}
          <View style={{ flexDirection: 'row', paddingVertical: 6 }}>
            <ShareCardText type="bodySmall" style={{ color: ShareCardColors.textSecondary, flex: 1 }} numberOfLines={1}>
              Retail
            </ShareCardText>
            <ShareCardText type="bodySmall" style={{ fontWeight: '600', color: ShareCardColors.textPrimary, flexShrink: 0, textAlign: 'right' }} numberOfLines={1}>
              {retailQty} units
            </ShareCardText>
          </View>

          {/* Total purchased row */}
          <View style={{ flexDirection: 'row', paddingVertical: 8, borderTopWidth: 1, borderTopColor: ShareCardColors.divider, paddingTop: 8 }}>
            <ShareCardText type="bodySmall" style={{ color: ShareCardColors.textSecondary, fontWeight: '600', flex: 1 }} numberOfLines={1}>
              Total
            </ShareCardText>
            <ShareCardText type="bodySmall" style={{ fontWeight: '700', color: ShareCardColors.textPrimary, flexShrink: 0, textAlign: 'right' }} numberOfLines={1}>
              {totalQty} units
            </ShareCardText>
          </View>
        </View>

        {/* Water Cost Lines - itemized by price */}
        {data.waterLines.length > 0 && (
          <View style={{ marginTop: 4 }}>
            <ShareCardText type="bodySmall" style={{ color: ShareCardColors.textMuted, fontWeight: '600', marginBottom: 8 }}>
              Water cost
            </ShareCardText>

            {data.waterLines.map((line, idx) => {
              const typeLabel =
                line.type === 'wholesale'
                  ? `Wholesale ${line.quantity} × ${(line.unitPrice / 100).toFixed(1)}`
                  : `Retail ${line.quantity} × ${(line.unitPrice / 100).toFixed(1)}`;
              return (
                <View key={idx} style={{ flexDirection: 'row', paddingVertical: 6 }}>
                  <ShareCardText type="bodySmall" style={{ color: ShareCardColors.textSecondary, flex: 1 }} numberOfLines={1}>
                    {typeLabel}
                  </ShareCardText>
                  <ShareCardText type="bodySmall" style={{ fontWeight: '600', color: ShareCardColors.negative, flexShrink: 0, textAlign: 'right' }} numberOfLines={1}>
                    - {formatMoney(line.subtotal)}
                  </ShareCardText>
                </View>
              );
            })}

            {/* Total Water */}
            <View style={{ flexDirection: 'row', paddingVertical: 8, borderTopWidth: 1, borderTopColor: ShareCardColors.divider, paddingTop: 8 }}>
              <ShareCardText type="bodySmall" style={{ color: ShareCardColors.textSecondary, fontWeight: '600', flex: 1 }} numberOfLines={1}>
                Total water
              </ShareCardText>
              <ShareCardText type="bodySmall" style={{ fontWeight: '700', color: ShareCardColors.negative, flexShrink: 0, textAlign: 'right' }} numberOfLines={1}>
                - {formatMoney(data.totalWater)}
              </ShareCardText>
            </View>
          </View>
        )}

        {/* Closing Balance */}
        <View
          style={{
            flexDirection: 'row',
            paddingVertical: 12,
            paddingHorizontal: 12,
            backgroundColor: closingIsNegative ? ShareCardColors.closingBackgroundNegative : ShareCardColors.closingBackground,
            borderRadius: 6,
            marginTop: 8,
          }}
        >
          <ShareCardText
            type="bodySmall"
            style={{
              fontWeight: '600',
              color: closingIsNegative ? ShareCardColors.negative : ShareCardColors.textPrimary,
              flex: 1,
            }}
            numberOfLines={1}
          >
            Closing balance
          </ShareCardText>
          <ShareCardText
            type="titleSmall"
            style={{
              fontWeight: '700',
              color: closingIsNegative ? ShareCardColors.negative : ShareCardColors.positive,
              flexShrink: 0,
              textAlign: 'right',
            }}
            numberOfLines={1}
          >
            {formatMoney(data.closingBalance)}
          </ShareCardText>
        </View>
      </View>
    );
  }
);

MonthlyWaterBillCard.displayName = 'MonthlyWaterBillCard';
