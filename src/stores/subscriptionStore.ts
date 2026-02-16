import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import Purchases, {
  CustomerInfo,
  PurchasesOfferings,
  LOG_LEVEL,
} from 'react-native-purchases';
import { env } from '@/config/env';

const CACHE_KEY = 'gasledger_pro_status';
const ENTITLEMENT_ID = 'Gaslytics Pro';

interface SubscriptionState {
  isPro: boolean;
  isLoaded: boolean;
  customerInfo: CustomerInfo | null;
  offerings: PurchasesOfferings | null;
  initialize: (userId: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  restorePurchases: () => Promise<boolean>;
  loadOfferings: () => Promise<void>;
  setPurchased: (info: CustomerInfo) => void;
  removePro: () => Promise<void>;
}

function hasProEntitlement(info: CustomerInfo): boolean {
  const active = info.entitlements.active;
  const has = typeof active[ENTITLEMENT_ID] !== 'undefined';
  console.log('[SubscriptionStore] entitlements check:', {
    activeKeys: Object.keys(active),
    lookingFor: ENTITLEMENT_ID,
    result: has,
  });
  return has;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  isPro: false,
  isLoaded: false,
  customerInfo: null,
  offerings: null,

  initialize: async (userId: string) => {
    // Read cached status immediately for instant UI
    try {
      const cached = await SecureStore.getItemAsync(CACHE_KEY);
      if (cached === 'true') {
        set({ isPro: true });
      }
    } catch {}

    try {
      const apiKey = env.REVENUECAT_API_KEY;

      if (!apiKey) {
        // No key configured — stay on free tier, mark loaded
        set({ isLoaded: true });
        return;
      }

      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
      Purchases.configure({ apiKey });
      await Purchases.logIn(userId);

      const info = await Purchases.getCustomerInfo();
      const isPro = hasProEntitlement(info);

      set({ isPro, isLoaded: true, customerInfo: info });
      await SecureStore.setItemAsync(CACHE_KEY, isPro ? 'true' : 'false');

      // Listen for real-time entitlement updates (e.g. after purchase)
      Purchases.addCustomerInfoUpdateListener((updatedInfo) => {
        const updatedPro = hasProEntitlement(updatedInfo);
        set({ isPro: updatedPro, customerInfo: updatedInfo });
        SecureStore.setItemAsync(CACHE_KEY, updatedPro ? 'true' : 'false').catch(() => {});
      });
    } catch (error) {
      console.error('[SubscriptionStore] initialize failed:', error);
      set({ isLoaded: true });
    }
  },

  logout: async () => {
    try {
      await Purchases.logOut();
    } catch {}
    set({ isPro: false, isLoaded: false, customerInfo: null, offerings: null });
    await SecureStore.deleteItemAsync(CACHE_KEY).catch(() => {});
  },

  refreshStatus: async () => {
    try {
      const info = await Purchases.getCustomerInfo();
      const isPro = hasProEntitlement(info);
      set({ isPro, customerInfo: info });
      await SecureStore.setItemAsync(CACHE_KEY, isPro ? 'true' : 'false');
    } catch (error) {
      console.error('[SubscriptionStore] refreshStatus failed:', error);
    }
  },

  restorePurchases: async () => {
    try {
      const info = await Purchases.restorePurchases();
      const isPro = hasProEntitlement(info);
      set({ isPro, customerInfo: info });
      await SecureStore.setItemAsync(CACHE_KEY, isPro ? 'true' : 'false');
      return isPro;
    } catch (error) {
      console.error('[SubscriptionStore] restorePurchases failed:', error);
      return false;
    }
  },

  loadOfferings: async () => {
    try {
      const offerings = await Purchases.getOfferings();
      set({ offerings });
    } catch (error) {
      console.error('[SubscriptionStore] loadOfferings failed:', error);
    }
  },

  setPurchased: (info: CustomerInfo) => {
    const isPro = hasProEntitlement(info);
    set({ isPro, customerInfo: info });
    SecureStore.setItemAsync(CACHE_KEY, isPro ? 'true' : 'false').catch(() => {});
  },

  removePro: async () => {
    set({ isPro: false });
    await SecureStore.setItemAsync(CACHE_KEY, 'false').catch(() => {});
  },
}));
