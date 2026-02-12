import { supabase } from '@/config/supabase';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

export const authService = {
  async checkEmailExists(email: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('check_email_exists', {
      email_input: email,
    });
    if (error) throw error;
    return data as boolean;
  },
  async signInWithEmail(email: string, password: string) {
    return supabase.auth.signInWithPassword({ email, password });
  },
  async signUpWithEmail(email: string, password: string) {
    return supabase.auth.signUp({ email, password });
  },
  async signInWithApple(identityToken: string, nonce: string) {
    return supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: identityToken,
      nonce,
    });
  },
  async signInWithOAuth(provider: 'google' | 'facebook') {
    const redirectTo = makeRedirectUri();

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo, skipBrowserRedirect: true },
    });

    if (error || !data.url) {
      return { data: null, error: error ?? new Error('Failed to get OAuth URL') };
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

    if (result.type !== 'success' || !result.url) {
      return { data: null, error: null }; // user cancelled
    }

    const url = new URL(result.url);
    // Tokens can be in hash fragment or query params depending on provider config
    const params = new URLSearchParams(
      url.hash ? url.hash.substring(1) : url.search.substring(1),
    );

    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (!accessToken || !refreshToken) {
      return { data: null, error: new Error('Missing tokens from OAuth redirect') };
    }

    return supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
  },
  async signOut() {
    return supabase.auth.signOut();
  },
  async getSession() {
    return supabase.auth.getSession();
  },
  onAuthStateChange(callback: Parameters<typeof supabase.auth.onAuthStateChange>[0]) {
    return supabase.auth.onAuthStateChange(callback);
  },
};
