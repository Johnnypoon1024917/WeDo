import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/appStore';

const WIDGET_DATA_KEY = '@wedo_widget_data';

export interface WidgetData {
  startDate: string; // ISO date string e.g. '2024-01-15'
  isPremium: boolean;
}

/**
 * Fetch the relationship start date from Supabase, persist it to
 * AsyncStorage + native shared storage, and trigger widget refresh.
 */
export async function syncWidgetData(): Promise<void> {
  const { relationshipId, isPremium, setRelationshipStartDate } =
    useAppStore.getState();

  if (!relationshipId) return;

  try {
    const { data, error } = await supabase
      .from('relationships')
      .select('start_date')
      .eq('id', relationshipId)
      .single();

    if (error || !data?.start_date) return;

    const startDate: string = data.start_date;
    setRelationshipStartDate(startDate);

    const widgetData: WidgetData = { startDate, isPremium };
    const json = JSON.stringify(widgetData);

    // Persist to AsyncStorage (general fallback)
    await AsyncStorage.setItem(WIDGET_DATA_KEY, json);

    // Persist to native shared storage and trigger widget refresh
    const { WidgetBridge } = NativeModules;
    if (WidgetBridge) {
      await WidgetBridge.setWidgetData(startDate, isPremium);
    }
  } catch {
    // Silently fail — widget data is non-critical
  }
}

/**
 * Read cached widget data from AsyncStorage (used as fallback).
 */
export async function getCachedWidgetData(): Promise<WidgetData | null> {
  try {
    const json = await AsyncStorage.getItem(WIDGET_DATA_KEY);
    return json ? JSON.parse(json) : null;
  } catch {
    return null;
  }
}

/**
 * Calculate days together from a start date string.
 */
export function calculateDaysTogether(startDate: string): number {
  const start = new Date(startDate);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}
