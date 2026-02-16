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

  console.log(`[AdBanner] unitId=${unitId} isPro=${isPro} failed=${failed}`);

  if (isPro) {
    console.log(`[AdBanner] HIDDEN (isPro) unitId=${unitId}`);
    return null;
  }
  if (failed) {
    console.log(`[AdBanner] HIDDEN (failed) unitId=${unitId}`);
    return null;
  }

  console.log(`[AdBanner] RENDERING unitId=${unitId} size=${size}`);

  return (
    <View style={[styles.container, style]}>
      <BannerAd
        unitId={unitId}
        size={size}
        onAdLoaded={() => console.log(`[AdBanner] AD LOADED unitId=${unitId}`)}
        onAdFailedToLoad={(error) => {
          console.log(`[AdBanner] AD FAILED unitId=${unitId} error=${error.message} code=${error.code}`);
          setFailed(true);
        }}
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
