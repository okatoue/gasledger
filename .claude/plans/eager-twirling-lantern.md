# Sign-In Flow — Apple, Google, Email via Supabase

## Context
Auth is not wired up. Sign-in/sign-up screens are stubs. We need OAuth sign-in (Apple, Google) plus email auth, all through Supabase. Sign-in is **required** — no skip option. Facebook deferred to v2.

---

## Step 1 — Install required packages

```bash
npx expo install expo-auth-session expo-web-browser expo-apple-authentication expo-linking
```

- `expo-auth-session` — OAuth redirect URI helpers + token parsing
- `expo-web-browser` — Opens browser for Google OAuth
- `expo-apple-authentication` — Native Apple Sign-In on iOS
- `expo-linking` — Deep link URL parsing for OAuth callback

(`react-native-url-polyfill` already installed.)

---

## Step 2 — Configure app.json

Add plugin: `expo-apple-authentication` (enables Apple Sign-In entitlement on iOS).

Scheme `gasledger` already set (needed for OAuth redirect URI).

---

## Step 3 — Expand authService with OAuth + email methods

**File**: `src/services/auth/authService.ts`

### Google Sign-In
Follow Supabase's "Native Mobile Deep Linking" pattern:
1. Build `redirectTo` using `makeRedirectUri()` from `expo-auth-session`
2. Call `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo, skipBrowserRedirect: true } })`
3. Open `data.url` via `WebBrowser.openAuthSessionAsync(url, redirectTo)`
4. Parse the returned callback URL to extract `access_token` and `refresh_token` from the fragment
5. Call `supabase.auth.setSession({ access_token, refresh_token })`

### Apple Sign-In
1. Generate a random `nonce` (via `expo-crypto`)
2. Hash the nonce with SHA-256 for Apple's request
3. Call `AppleAuthentication.signInAsync()` with `requestedScopes: [FullName, Email]` and the hashed nonce
4. Call `supabase.auth.signInWithIdToken({ provider: 'apple', token: credential.identityToken, nonce: rawNonce })`
5. On first sign-in, if `credential.fullName` exists, call `supabase.auth.updateUser({ data: { full_name } })` to persist the name (Apple only provides it once)

### Email Sign-In (magic link / OTP)
- `signInWithEmail(email)` — calls `supabase.auth.signInWithOtp({ email })` to send a magic link
- User clicks link → app opens via deep link scheme → session established automatically via Supabase's auth state listener

### Existing methods to keep
- `signOut()`, `getSession()`, `onAuthStateChange()` — already implemented
- Remove the old `signInWithEmail(email, password)` and `signUpWithEmail(email, password)` — replaced by OTP flow

---

## Step 4 — Build the sign-in screen

**File**: `app/(auth)/sign-in.tsx`

Layout:
- App name / tagline at top
- Three sign-in buttons stacked vertically:
  1. **Continue with Apple** (black button, Apple icon) — only shown on iOS via `Platform.OS === 'ios'`
  2. **Continue with Google** (white/bordered button, Google icon)
  3. **Continue with Email** (outlined button, mail icon) — tapping reveals an email input + "Send Magic Link" button
- Loading indicator on the active button while auth is in progress
- Error message display below buttons
- Uses project theme (colors, typography, spacing)

Call `WebBrowser.maybeCompleteAuthSession()` at module level (harmless on native, needed for web).

---

## Step 5 — Auth routing in root layout

**File**: `app/_layout.tsx`

After DB init and session check:
- Use `useSegments()` + `useRouter()` from expo-router
- If `session` exists and user is in `(auth)` group → `router.replace('/(tabs)')`
- If `session` is null (and not loading) and user is in `(tabs)` group → `router.replace('/(auth)/sign-in')`
- This runs in a `useEffect` watching `[session, segments]`

---

## Step 6 — Add sign-out to settings

**File**: `app/(tabs)/settings/index.tsx`

- Add a "Sign Out" button at the bottom
- Calls `authService.signOut()`
- Auth state listener in `_layout.tsx` automatically redirects to sign-in

---

## Step 7 — Keep sign-up route

Since email auth uses OTP/magic link (no separate sign-up flow needed), `sign-up.tsx` can be repurposed or left as a stub. Do **not** delete it — may be useful if we add password-based email auth later.

---

## Files to modify
1. `app.json` — add `expo-apple-authentication` plugin
2. `src/services/auth/authService.ts` — Google OAuth, Apple Sign-In w/ nonce, email OTP
3. `app/(auth)/sign-in.tsx` — full sign-in UI with Apple + Google + Email
4. `app/_layout.tsx` — auth-gated routing with useSegments/useRouter
5. `app/(tabs)/settings/index.tsx` — sign-out button

## Files unchanged
- `src/config/supabase.ts` — already configured
- `src/stores/authStore.ts` — already tracks session
- `src/hooks/useAuth.ts` — already exposes isAuthenticated

## Supabase dashboard prerequisites
- Google OAuth provider enabled (client ID + secret from Google Cloud Console)
- Apple OAuth provider enabled (Service ID + key from Apple Developer)
- Email provider enabled with OTP/magic link (on by default in Supabase)

## Verification
1. App launches → sign-in screen (no bypass)
2. Google → OAuth browser flow → redirect back → lands on dashboard
3. Apple (iOS) → native prompt → lands on dashboard
4. Email → enter email → magic link sent → tap link → app opens → dashboard
5. Kill & restart → session persisted → straight to dashboard
6. Settings → Sign Out → back to sign-in
7. `npx tsc --noEmit` — no TypeScript errors
