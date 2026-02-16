import React, { useState } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { useSubscription } from '@/hooks/useSubscription';

interface AdBannerProps {
  unitId: string;
  size?: BannerAdSize;
  style?: StyleProp<ViewStyle>;
}

export default function AdBanner({ unitId, size = BannerAdSize.BANNER, style }: AdBannerProps) {
  const { isPro } = useSubscription();
  const [failed, setFailed] = useState(false);

  if (isPro || failed) return null;

  return (
    <View style={[styles.container, style]}>
      <BannerAd
        unitId={unitId}
        size={size}
        onAdFailedToLoad={() => setFailed(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 8,
  },
});
