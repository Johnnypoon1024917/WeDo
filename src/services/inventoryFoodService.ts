import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/appStore';

/**
 * Reads the current inventory_food value from the relationships table.
 */
export async function fetchFoodInventory(
  relationshipId: string
): Promise<number> {
  const { data, error } = await supabase
    .from('relationships')
    .select('inventory_food')
    .eq('id', relationshipId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch food inventory: ${error.message}`);
  }

  return data.inventory_food ?? 0;
}

/**
 * Adds the specified amount to inventory_food in the relationships table,
 * updates the AppStore, and returns the new count.
 */
export async function incrementFood(
  relationshipId: string,
  amount: number
): Promise<number> {
  const current = await fetchFoodInventory(relationshipId);
  const newValue = current + amount;

  const { error } = await supabase
    .from('relationships')
    .update({ inventory_food: newValue })
    .eq('id', relationshipId);

  if (error) {
    throw new Error(`Failed to increment food inventory: ${error.message}`);
  }

  useAppStore.getState().setInventoryFood(newValue);

  return newValue;
}

/**
 * Subtracts the specified amount from inventory_food in the relationships table.
 * Throws if the operation would result in a negative value.
 * Updates the AppStore and returns the new count.
 */
export async function decrementFood(
  relationshipId: string,
  amount: number
): Promise<number> {
  const current = await fetchFoodInventory(relationshipId);

  if (amount > current) {
    throw new Error(
      `Cannot decrement food by ${amount}: only ${current} available`
    );
  }

  const newValue = current - amount;

  const { error } = await supabase
    .from('relationships')
    .update({ inventory_food: newValue })
    .eq('id', relationshipId);

  if (error) {
    throw new Error(`Failed to decrement food inventory: ${error.message}`);
  }

  useAppStore.getState().setInventoryFood(newValue);

  return newValue;
}
