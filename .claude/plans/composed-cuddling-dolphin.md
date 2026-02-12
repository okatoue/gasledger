# Fix Bottom Buttons Under Android Nav Bar + Summary Header Position

## Context

Screens with absolute-positioned sticky footers (e.g. "Done" button on Drive Complete, "Save & Continue" on Onboarding) render under the Android system navigation bar because their `bottom: 0` doesn't account for the system inset. Additionally, the Drive Complete screen's checkmark icon and "Drive Complete" title sit too high on the page.

## Root Cause

The footer uses `position: 'absolute', bottom: 0` which pins it to the very bottom of the screen, ignoring the Android navigation bar. React Native's built-in `SafeAreaView` on Android only handles the status bar, not the bottom nav bar. The `react-native-safe-area-context` library (already installed, v5.6.0) provides `useSafeAreaInsets()` which returns the correct bottom inset.

## Affected Screens

| Screen | File | Element |
|--------|------|---------|
| Drive Complete | `app/session/summary.tsx` | "Done" button footer |
| Onboarding | `app/(auth)/onboarding.tsx` | "Save & Continue" button footer |

## Fix

### 1. `app/session/summary.tsx`

- Import `useSafeAreaInsets` from `react-native-safe-area-context`
- Call `const insets = useSafeAreaInsets()` in the component
- Apply `paddingBottom: insets.bottom` to the footer style (inline override)
- Add `marginTop: spacing.xl` to the `header` style to push the checkmark + title down
- Remove the `SafeAreaView` import from `react-native` (no longer needed since insets handle it); replace with a plain `View`

### 2. `app/(auth)/onboarding.tsx`

- Import `useSafeAreaInsets` from `react-native-safe-area-context`
- Call `const insets = useSafeAreaInsets()` in the component
- Apply `paddingBottom: insets.bottom` to the footer style (inline override)

## Verification

1. `npx tsc --noEmit` — no type errors
2. Open Drive Complete screen — "Done" button fully visible above Android nav bar
3. Open Drive Complete screen — checkmark icon and "Drive Complete" text positioned lower, not crammed at the top
4. Open Onboarding screen — "Save & Continue" button fully visible above Android nav bar
