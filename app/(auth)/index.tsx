import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, FadeOut, Layout } from 'react-native-reanimated';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';
import TextInput from '@/components/common/TextInput';
import AuthDivider from '@/components/auth/AuthDivider';
import SocialAuthButtons from '@/components/auth/SocialAuthButtons';
import { authService } from '@/services/auth/authService';
import { isValidEmail, isValidPassword, doPasswordsMatch } from '@/utils/validation';

type Phase = 'email' | 'password';
type Mode = 'signin' | 'signup';

export default function AuthScreen() {
  const [phase, setPhase] = useState<Phase>('email');
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [animateLayout, setAnimateLayout] = useState(false);

  const clearErrors = () => {
    setError(null);
    setEmailError('');
    setPasswordError('');
    setConfirmError('');
  };

  const handleContinue = async () => {
    clearErrors();
    if (!isValidEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }
    setIsLoading(true);
    try {
      const exists = await authService.checkEmailExists(email);
      setMode(exists ? 'signin' : 'signup');
      setAnimateLayout(true);
      setPhase('password');
      setTimeout(() => setAnimateLayout(false), 350);
    } catch {
      setError('Unable to verify email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    clearErrors();

    const passwordCheck = isValidPassword(password);
    if (!passwordCheck.valid) {
      setPasswordError(passwordCheck.message);
      return;
    }

    if (mode === 'signup' && !doPasswordsMatch(password, confirmPassword)) {
      setConfirmError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      if (mode === 'signin') {
        const { error: authError } = await authService.signInWithEmail(email, password);
        if (authError) {
          setError("Invalid email or password. Don't have an account? Create one below.");
        }
      } else {
        const { data, error: authError } = await authService.signUpWithEmail(email, password);
        if (authError) {
          setError(authError.message);
        } else if (data.user && data.user.identities?.length === 0) {
          setError('An account with this email already exists. Try signing in.');
          setMode('signin');
        }
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    clearErrors();
    setPassword('');
    setConfirmPassword('');
    setAnimateLayout(true);
    setPhase('email');
    setMode('signin');
    setTimeout(() => setAnimateLayout(false), 350);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Brand Header */}
          <Animated.View layout={animateLayout ? Layout.duration(300) : undefined} style={styles.header}>
            <Text style={styles.logo}>GasLedger</Text>
            <Text style={styles.tagline}>Track every mile, every dollar.</Text>
          </Animated.View>

          {/* Error Banner */}
          {error && (
            <Animated.View entering={FadeIn.duration(200)} layout={animateLayout ? Layout.duration(300) : undefined} style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{error}</Text>
            </Animated.View>
          )}

          {/* Email Input — always visible */}
          <Animated.View layout={animateLayout ? Layout.duration(300) : undefined}>
          <TextInput
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChangeText={(t) => { setEmail(t); setEmailError(''); }}
            error={emailError}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            editable={phase === 'email'}
          />
          </Animated.View>

          {/* Phase: email — show Continue + social */}
          {phase === 'email' && (
            <>
              <Animated.View entering={FadeIn.duration(250).delay(100)} exiting={FadeOut.duration(250)}>
                <Pressable
                  style={[styles.primaryButton, (!email || isLoading) && styles.buttonDisabled]}
                  onPress={handleContinue}
                  disabled={!email || isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Text style={styles.primaryButtonText}>Continue</Text>
                  )}
                </Pressable>
              </Animated.View>

              <Animated.View entering={FadeIn.duration(250).delay(150)} exiting={FadeOut.duration(250)}>
                <AuthDivider />
              </Animated.View>

              <Animated.View entering={FadeIn.duration(250).delay(200)} exiting={FadeOut.duration(250)}>
                <SocialAuthButtons
                  onError={(msg) => setError(msg)}
                  onLoading={setIsLoading}
                />
              </Animated.View>
            </>
          )}

          {/* Phase: password — show password fields + submit */}
          {phase === 'password' && (
            <Animated.View entering={FadeInDown.duration(300).delay(100)} exiting={FadeOut.duration(250)}>
              <Pressable onPress={handleBack} style={styles.changeEmailButton}>
                <Text style={styles.changeEmail}>Change email</Text>
              </Pressable>

              <TextInput
                label="Password"
                placeholder="Enter your password"
                value={password}
                onChangeText={(t) => { setPassword(t); setPasswordError(''); }}
                error={passwordError}
                secureTextEntry
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              />

              {mode === 'signup' && (
                <Animated.View
                  entering={FadeInDown.duration(300)}
                  exiting={FadeOut.duration(200)}
                >
                  <TextInput
                    label="Confirm Password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChangeText={(t) => { setConfirmPassword(t); setConfirmError(''); }}
                    error={confirmError}
                    secureTextEntry
                    autoComplete="new-password"
                  />
                </Animated.View>
              )}

              <Pressable
                style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {mode === 'signin' ? 'Sign In' : 'Create Account'}
                  </Text>
                )}
              </Pressable>

            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logo: {
    ...typography.h1,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  tagline: {
    ...typography.body,
    color: colors.textSecondary,
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorBannerText: {
    ...typography.bodySmall,
    color: colors.error,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm + 4,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  primaryButtonText: {
    ...typography.button,
    color: colors.white,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  changeEmailButton: {
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
  changeEmail: {
    ...typography.bodySmall,
    color: colors.primary,
  },
});
