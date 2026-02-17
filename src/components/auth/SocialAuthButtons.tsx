import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, Alert } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/theme/useColors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';
import { authService } from '@/services/auth/authService';

interface SocialAuthButtonsProps {
  onError: (message: string) => void;
  onLoading: (loading: boolean) => void;
}

export default function SocialAuthButtons({ onError, onLoading }: SocialAuthButtonsProps) {
  const colors = useColors();
  const [busy, setBusy] = useState(false);

  const handleApple = async () => {
    if (busy) return;
    setBusy(true);
    onLoading(true);
    try {
      const rawNonce = Crypto.randomUUID();
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce,
      );

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      if (!credential.identityToken) {
        onError('Apple Sign In failed. Please try again.');
        return;
      }

      const { error } = await authService.signInWithApple(credential.identityToken, rawNonce);
      if (error) onError(error.message);
    } catch (e: any) {
      if (e.code !== 'ERR_REQUEST_CANCELED') {
        onError('Apple Sign In failed. Please try again.');
      }
    } finally {
      setBusy(false);
      onLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'facebook') => {
    if (busy) return;
    setBusy(true);
    onLoading(true);
    try {
      const { error } = await authService.signInWithOAuth(provider);
      if (error) onError(error.message);
    } catch {
      onError(`${provider === 'google' ? 'Google' : 'Facebook'} sign in failed. Please try again.`);
    } finally {
      setBusy(false);
      onLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {Platform.OS === 'ios' && (
        <Pressable
          style={[styles.button, styles.appleButton]}
          onPress={handleApple}
          disabled={busy}
        >
          <Ionicons name="logo-apple" size={20} color={colors.white} />
          <Text style={[styles.buttonText, styles.appleText]}>Continue with Apple</Text>
        </Pressable>
      )}

      {Platform.OS === 'android' && (
        <Pressable
          style={[styles.button, styles.googleButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => handleOAuth('google')}
          disabled={busy}
        >
          <Ionicons name="logo-google" size={20} color={colors.text} />
          <Text style={[styles.buttonText, { color: colors.text }]}>Continue with Google</Text>
        </Pressable>
      )}

      <Pressable
        style={[styles.button, styles.facebookButton]}
        onPress={() => handleOAuth('facebook')}
        disabled={busy}
      >
        <Ionicons name="logo-facebook" size={20} color={colors.white} />
        <Text style={[styles.buttonText, styles.facebookText]}>Continue with Facebook</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm + 4,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  buttonText: {
    ...typography.button,
  },
  appleButton: {
    backgroundColor: '#000000',
  },
  appleText: {
    color: '#FFFFFF',
  },
  googleButton: {
    borderWidth: 1,
  },
  facebookButton: {
    backgroundColor: '#1877F2',
  },
  facebookText: {
    color: '#FFFFFF',
  },
});
