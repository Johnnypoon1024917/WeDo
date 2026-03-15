import Purchases, {
  type CustomerInfo,
  type PurchasesPackage,
  LOG_LEVEL,
} from 'react-native-purchases';
import { Platform } from 'react-native';
import { useAppStore } from '../store/appStore';

const ENTITLEMENT_ID = 'premium_lifetime';

let isConfigured = false;

/**
 * Initialise RevenueCat SDK. Call once at app startup.
 */
export async function configurePurchases(): Promise<void> {
  const apiKey =
    Platform.OS === 'ios'
      ? (process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '')
      : (process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '');

  if (!apiKey || apiKey.startsWith('your_')) {
    console.warn('[PurchaseService] RevenueCat API key not set — skipping');
    return;
  }

  Purchases.setLogLevel(LOG_LEVEL.ERROR);
  Purchases.configure({ apiKey });
  isConfigured = true;
}

/**
 * Identify the current Supabase user in RevenueCat.
 */
export async function loginUser(supabaseUserId: string): Promise<void> {
  if (!isConfigured) return;
  try {
    await Purchases.logIn(supabaseUserId);
  } catch (err) {
    console.warn('[PurchaseService] logIn failed', err);
  }
}

/**
 * Check entitlement and sync isPremium to Zustand.
 */
export async function checkEntitlement(): Promise<boolean> {
  if (!isConfigured) return false;
  try {
    const info: CustomerInfo = await Purchases.getCustomerInfo();
    const isPremium =
      info.entitlements.active[ENTITLEMENT_ID] !== undefined;
    useAppStore.getState().setIsPremium(isPremium);
    return isPremium;
  } catch (err) {
    console.warn('[PurchaseService] checkEntitlement failed', err);
    return false;
  }
}

/**
 * Fetch the lifetime offering package for the paywall.
 */
export async function getLifetimePackage(): Promise<PurchasesPackage | null> {
  if (!isConfigured) return null;
  try {
    const offerings = await Purchases.getOfferings();
    const current = offerings.current;
    if (!current) return null;
    return current.lifetime ?? current.availablePackages[0] ?? null;
  } catch (err) {
    console.warn('[PurchaseService] getLifetimePackage failed', err);
    return null;
  }
}

/**
 * Purchase the given package. Returns true on success.
 */
export async function purchase(
  pkg: PurchasesPackage,
): Promise<{ success: boolean; error?: string }> {
  if (!isConfigured) return { success: false, error: 'Purchases not configured' };
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const isPremium =
      customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
    useAppStore.getState().setIsPremium(isPremium);
    return { success: isPremium };
  } catch (err: any) {
    if (err.userCancelled) {
      return { success: false };
    }
    return {
      success: false,
      error: 'Purchase could not be verified — please try again.',
    };
  }
}

/**
 * Restore previous purchases. Returns true if premium entitlement found.
 */
export async function restorePurchases(): Promise<{
  restored: boolean;
  message?: string;
}> {
  if (!isConfigured) return { restored: false, message: 'Purchases not configured.' };
  try {
    const info: CustomerInfo = await Purchases.restorePurchases();
    const isPremium =
      info.entitlements.active[ENTITLEMENT_ID] !== undefined;
    useAppStore.getState().setIsPremium(isPremium);
    if (!isPremium) {
      return { restored: false, message: 'No previous purchase found.' };
    }
    return { restored: true };
  } catch (err) {
    console.warn('[PurchaseService] restorePurchases failed', err);
    return { restored: false, message: 'No previous purchase found.' };
  }
}
