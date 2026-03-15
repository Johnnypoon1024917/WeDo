import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import type { PurchasesPackage } from 'react-native-purchases';
import { useAppStore } from '../store/appStore';
import {
  getLifetimePackage,
  purchase,
  restorePurchases,
} from '../services/purchaseService';

type Props = NativeStackScreenProps<RootStackParamList, 'PaywallModal'>;

export default function PaywallModal({ navigation }: Props) {
  const isPremium = useAppStore((s) => s.isPremium);
  const [pkg, setPkg] = useState<PurchasesPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getLifetimePackage()
      .then(setPkg)
      .finally(() => setLoading(false));
  }, []);

  // Auto-dismiss when premium is unlocked
  useEffect(() => {
    if (isPremium) {
      navigation.goBack();
    }
  }, [isPremium]);

  const handlePurchase = async () => {
    if (!pkg) return;
    setError(null);
    setPurchasing(true);
    const result = await purchase(pkg);
    setPurchasing(false);
    if (result.error) {
      setError(result.error);
    }
    // If success, isPremium change triggers auto-dismiss above
  };

  const handleRestore = async () => {
    setError(null);
    setRestoring(true);
    const result = await restorePurchases();
    setRestoring(false);
    if (!result.restored && result.message) {
      setError(result.message);
    }
  };

  const priceLabel =
    pkg?.product?.priceString ?? '$4.99';

  return (
    <View className="flex-1 bg-charcoal px-6 pt-16 pb-10 justify-between">
      {/* Header */}
      <View>
        <Pressable
          onPress={() => navigation.goBack()}
          className="self-end mb-4"
          accessibilityRole="button"
          accessibilityLabel="Close paywall"
        >
          <Text className="text-gray-400 text-base">Close</Text>
        </Pressable>

        <Text className="text-white text-3xl font-bold text-center mt-4">
          Unlock WeDo Premium
        </Text>
        <Text className="text-gray-400 text-base text-center mt-3 leading-6">
          One purchase. Lifetime access. No subscriptions.
        </Text>
      </View>

      {/* Feature list */}
      <View className="mt-8 gap-4">
        {[
          'Unlimited Bucket List items',
          'Audio voice notes on memories',
          'Deep Connection conversation deck',
          'Custom photo stickers',
          'Premium widget themes',
        ].map((feature) => (
          <View key={feature} className="flex-row items-center gap-3">
            <Text className="text-teal text-lg">✓</Text>
            <Text className="text-white text-base">{feature}</Text>
          </View>
        ))}
      </View>

      {/* Purchase section */}
      <View className="mt-auto pt-6">
        {error && (
          <Text className="text-red-400 text-sm text-center mb-3">
            {error}
          </Text>
        )}

        {loading ? (
          <ActivityIndicator color="#FF7F50" size="large" />
        ) : (
          <>
            <Pressable
              onPress={handlePurchase}
              disabled={purchasing || !pkg}
              className="bg-soft-coral rounded-2xl py-4 items-center"
              accessibilityRole="button"
              accessibilityLabel={`Purchase premium for ${priceLabel}`}
            >
              {purchasing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white text-lg font-bold">
                  Get Premium — {priceLabel}
                </Text>
              )}
            </Pressable>

            <Pressable
              onPress={handleRestore}
              disabled={restoring}
              className="mt-4 items-center py-2"
              accessibilityRole="button"
              accessibilityLabel="Restore previous purchases"
            >
              {restoring ? (
                <ActivityIndicator color="#40E0D0" size="small" />
              ) : (
                <Text className="text-teal text-sm">
                  Restore Purchases
                </Text>
              )}
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}
