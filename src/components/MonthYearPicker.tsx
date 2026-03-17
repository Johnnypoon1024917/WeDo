import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewToken,
} from 'react-native';

/* ── constants ───────────────────────────────────────────────── */

const MONTHS = [
  'January', 'February', 'March', 'April',
  'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December',
];

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

/** Generate a year range: current year ± 50 */
function buildYearList(): number[] {
  const current = new Date().getFullYear();
  const years: number[] = [];
  for (let y = current - 50; y <= current + 50; y++) {
    years.push(y);
  }
  return years;
}

const YEARS = buildYearList();

/* ── props ───────────────────────────────────────────────────── */

export interface MonthYearPickerProps {
  visible: boolean;
  /** Current month string in "YYYY-MM-DD" or "YYYY-MM" format */
  currentMonth: string;
  /** Called when the user confirms a selection */
  onSelect: (month: number, year: number) => void;
  /** Called when the user dismisses without confirming */
  onDismiss: () => void;
}

/* ── component ───────────────────────────────────────────────── */

export default function MonthYearPicker({
  visible,
  currentMonth,
  onSelect,
  onDismiss,
}: MonthYearPickerProps) {
  const parsed = parseMonthString(currentMonth);
  const [selectedMonth, setSelectedMonth] = useState(parsed.month);
  const [selectedYear, setSelectedYear] = useState(parsed.year);

  const monthListRef = useRef<FlatList>(null);
  const yearListRef = useRef<FlatList>(null);

  // Sync local state when the picker opens with a new currentMonth
  useEffect(() => {
    if (visible) {
      const p = parseMonthString(currentMonth);
      setSelectedMonth(p.month);
      setSelectedYear(p.year);

      // Scroll to the initial positions after a short delay so the list is mounted
      setTimeout(() => {
        monthListRef.current?.scrollToOffset({
          offset: (p.month - 1) * ITEM_HEIGHT,
          animated: false,
        });
        const yearIndex = YEARS.indexOf(p.year);
        if (yearIndex >= 0) {
          yearListRef.current?.scrollToOffset({
            offset: yearIndex * ITEM_HEIGHT,
            animated: false,
          });
        }
      }, 50);
    }
  }, [visible, currentMonth]);

  const handleConfirm = useCallback(() => {
    onSelect(selectedMonth, selectedYear);
  }, [onSelect, selectedMonth, selectedYear]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
    >
      <Pressable style={styles.overlay} onPress={onDismiss}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable
              onPress={onDismiss}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Text style={styles.title}>Select Month & Year</Text>
            <Pressable
              onPress={handleConfirm}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Confirm"
            >
              <Text style={styles.confirmText}>Done</Text>
            </Pressable>
          </View>

          {/* Picker wheels */}
          <View style={styles.pickersRow}>
            {/* Month picker */}
            <PickerWheel
              ref={monthListRef}
              data={MONTHS}
              selectedIndex={selectedMonth - 1}
              onIndexChange={(i) => setSelectedMonth(i + 1)}
              keyPrefix="month"
            />

            {/* Year picker */}
            <PickerWheel
              ref={yearListRef}
              data={YEARS.map(String)}
              selectedIndex={YEARS.indexOf(selectedYear)}
              onIndexChange={(i) => setSelectedYear(YEARS[i])}
              keyPrefix="year"
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/* ── PickerWheel sub-component ───────────────────────────────── */

interface PickerWheelProps {
  data: string[];
  selectedIndex: number;
  onIndexChange: (index: number) => void;
  keyPrefix: string;
}

const PickerWheel = React.forwardRef<FlatList, PickerWheelProps>(
  ({ data, selectedIndex, onIndexChange, keyPrefix }, ref) => {
    const handleViewableItemsChanged = useCallback(
      ({ viewableItems }: { viewableItems: ViewToken[] }) => {
        // Pick the middle viewable item as the "selected" one
        if (viewableItems.length > 0) {
          const middleIndex = Math.floor(viewableItems.length / 2);
          const item = viewableItems[middleIndex];
          if (item.index != null) {
            onIndexChange(item.index);
          }
        }
      },
      [onIndexChange],
    );

    const viewabilityConfig = useRef({
      itemVisiblePercentThreshold: 50,
    }).current;

    const getItemLayout = useCallback(
      (_: any, index: number) => ({
        length: ITEM_HEIGHT,
        offset: ITEM_HEIGHT * index,
        index,
      }),
      [],
    );

    return (
      <View style={styles.wheelContainer}>
        {/* Selection highlight */}
        <View style={styles.selectionHighlight} pointerEvents="none" />

        <FlatList
          ref={ref}
          data={data}
          keyExtractor={(item, i) => `${keyPrefix}-${i}`}
          renderItem={({ item, index }) => (
            <View style={styles.wheelItem}>
              <Text
                style={[
                  styles.wheelText,
                  index === selectedIndex && styles.wheelTextSelected,
                ]}
              >
                {item}
              </Text>
            </View>
          )}
          getItemLayout={getItemLayout}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          contentContainerStyle={{
            paddingVertical: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2),
          }}
          onViewableItemsChanged={handleViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          initialScrollIndex={selectedIndex >= 0 ? selectedIndex : 0}
        />
      </View>
    );
  },
);

/* ── helpers ──────────────────────────────────────────────────── */

function parseMonthString(s: string): { month: number; year: number } {
  const parts = s.split('-');
  const year = parseInt(parts[0], 10) || new Date().getFullYear();
  const month = parseInt(parts[1], 10) || new Date().getMonth() + 1;
  return { month, year };
}

/* ── exported for testing ────────────────────────────────────── */
export { parseMonthString, MONTHS, YEARS };

/* ── styles ──────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1E1E1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingBottom: 12,
  },
  cancelText: {
    color: '#9CA3AF',
    fontSize: 16,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  confirmText: {
    color: '#FF7F50',
    fontSize: 16,
    fontWeight: '600',
  },
  pickersRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  wheelContainer: {
    flex: 1,
    height: PICKER_HEIGHT,
    overflow: 'hidden',
    position: 'relative',
  },
  selectionHighlight: {
    position: 'absolute',
    top: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2),
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    zIndex: 1,
  },
  wheelItem: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wheelText: {
    color: '#6B7280',
    fontSize: 18,
  },
  wheelTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 20,
  },
});
