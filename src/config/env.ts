export const env = {
  // Supabase
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',

  // Google OAuth
  GOOGLE_WEB_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
  GOOGLE_IOS_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '',
  GOOGLE_ANDROID_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '',

  // VIN Decoder API
  VIN_API_URL: process.env.EXPO_PUBLIC_VIN_API_URL ?? '',
  VIN_API_KEY: process.env.EXPO_PUBLIC_VIN_API_KEY ?? '',

  // Fuel Efficiency API
  FUEL_API_URL: process.env.EXPO_PUBLIC_FUEL_API_URL ?? '',
  FUEL_API_KEY: process.env.EXPO_PUBLIC_FUEL_API_KEY ?? '',

  // Logo.dev (publishable key, safe for client-side)
  LOGO_DEV_TOKEN: process.env.EXPO_PUBLIC_LOGO_DEV_TOKEN ?? '',

  // RevenueCat
  REVENUECAT_API_KEY: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ?? '',
} as const;
