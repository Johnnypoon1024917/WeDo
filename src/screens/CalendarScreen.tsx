import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  LayoutRectangle,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CalendarList, DateData } from 'react-native-calendars';
import type { CalendarListImperativeMethods } from 'react-native-calendars/src/calendar-list';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/appStore';
import {
  realtimeManager,
  CalendarSticker,
  CalendarEvent,
} from '../services/realtimeManager';
import { DEFAULT_STICKERS } from '../assets/stickers/stickerData';
import { getMonthRange, groupEventsByDay, sortEventsChronologically } from '../utils/calendarHelpers';
import StickerDrawer from '../components/StickerDrawer';
import DayNoteModal from '../components/DayNoteModal';
import AddEventModal from '../components/AddEventModal';
import MonthYearPicker from '../components/MonthYearPicker';

/* ── helpers ─────────────────────────────────────────────────── */

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Build a lookup from sticker id → emoji */
const STICKER_EMOJI_MAP: Record<string, string> = {};
for (const s of DEFAULT_STICKERS) {
  STICKER_EMOJI_MAP[s.id] = s.emoji;
}

/* ── CalendarScreen ──────────────────────────────────────────── */

export default function CalendarScreen() {
  const { t } = useTranslation();
  const relationshipId = useAppStore((s) => s.relationshipId);
  const [stickers, setStickers] = useState<CalendarSticker[]>([]);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(todayString());

  // Month/Year picker state
  const [pickerVisible, setPickerVisible] = useState(false);
  /** Display label for the header, e.g. "June 2025" */
  const [headerMonth, setHeaderMonth] = useState(() => {
    const d = new Date();
    return d.toLocaleString('default', { month: 'long', year: 'numeric' });
  });

  // CalendarList ref for programmatic scrolling
  const calendarListRef = useRef<CalendarListImperativeMethods>(null);

  // Day note modal state
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [dayNoteModalVisible, setDayNoteModalVisible] = useState(false);
  // Set of day strings (YYYY-MM-DD) that have notes for the current month
  const [daysWithNotes, setDaysWithNotes] = useState<Set<string>>(new Set());

  // Events state (9.3.1)
  const [selectedDate, setSelectedDate] = useState(todayString());
  const [addEventModalVisible, setAddEventModalVisible] = useState(false);

  // Month-level events lookup (6.1)
  const [monthEvents, setMonthEvents] = useState<Map<string, CalendarEvent[]>>(new Map());

  // Bottom sheet ref and snap points (6.3)
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['25%', '50%'], []);

  // Track day cell layouts for drop resolution
  // Key: "YYYY-MM-DD", Value: page-level bounding rect
  const dayCellLayouts = useRef<Map<string, LayoutRectangle>>(new Map());

  // Ref to the calendar container for coordinate mapping
  const calendarRef = useRef<View>(null);

  /* ── fetch stickers for current month ── */
  const fetchStickers = useCallback(async () => {
    if (!relationshipId) return;

    // Fetch all stickers for the relationship (we filter by month client-side)
    const { data, error } = await supabase
      .from('calendar_stickers')
      .select('*')
      .eq('relationship_id', relationshipId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setStickers(data as CalendarSticker[]);
    }
  }, [relationshipId]);

  useEffect(() => {
    fetchStickers();
  }, [fetchStickers]);

  /* ── realtime subscription ── */
  useEffect(() => {
    if (!relationshipId) return;

    const channel = realtimeManager.subscribeToStickers(
      relationshipId,
      (sticker) => {
        setStickers((prev) => {
          if (prev.some((s) => s.id === sticker.id)) return prev;
          return [...prev, sticker];
        });
      },
    );

    return () => {
      supabase.removeChannel(channel);
    };
  }, [relationshipId]);

  /* ── fetch notes for current month ── */
  const fetchNotesForMonth = useCallback(async () => {
    if (!relationshipId) return;

    // Derive first and last day of the month from currentMonth (YYYY-MM-DD)
    const [year, month] = currentMonth.split('-').map(Number);
    const firstDay = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0); // last day of month
    const lastDayStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;

    const { data, error } = await supabase
      .from('calendar_notes')
      .select('day')
      .eq('relationship_id', relationshipId)
      .gte('day', firstDay)
      .lte('day', lastDayStr);

    if (!error && data) {
      setDaysWithNotes(new Set(data.map((n: { day: string }) => n.day)));
    }
  }, [relationshipId, currentMonth]);

  useEffect(() => {
    fetchNotesForMonth();
  }, [fetchNotesForMonth]);

  /* ── fetch events for visible month (6.1) ── */
  const fetchEventsForMonth = useCallback(async (year: number, month: number) => {
    if (!relationshipId) return;

    const { firstDay, lastDay } = getMonthRange(year, month);

    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('relationship_id', relationshipId)
      .gte('day', firstDay)
      .lte('day', lastDay);

    if (!error && data) {
      setMonthEvents(groupEventsByDay(data as CalendarEvent[]));
    }
  }, [relationshipId]);

  // Fetch events for the current month on mount
  useEffect(() => {
    const [year, month] = currentMonth.split('-').map(Number);
    fetchEventsForMonth(year, month);
  }, [fetchEventsForMonth, currentMonth]);

  /* ── day press handler ── */
  const handleDayPress = useCallback((dateString: string) => {
    setSelectedDay(dateString);
    setSelectedDate(dateString);
    setDayNoteModalVisible(true);
    // Open bottom sheet agenda (6.3)
    bottomSheetRef.current?.snapToIndex(0);
  }, []);

  const handleDayNoteClose = useCallback(() => {
    setDayNoteModalVisible(false);
    setSelectedDay(null);
    // Refresh notes to update indicator dots
    fetchNotesForMonth();
  }, [fetchNotesForMonth]);

  /* ── fetch events for selected date (refreshes monthEvents) ── */
  const fetchEventsForDate = useCallback(async (date: string) => {
    if (!relationshipId) return;
    // Re-fetch the current month's events to keep monthEvents in sync
    const [year, month] = date.split('-').map(Number);
    fetchEventsForMonth(year, month);
  }, [relationshipId, fetchEventsForMonth]);

  /* ── realtime subscription for calendar events (9.3.6) ── */
  useEffect(() => {
    if (!relationshipId) return;

    const channel = realtimeManager.subscribeToCalendarEvents(
      relationshipId,
      (event) => {
        // Add new event to monthEvents map
        setMonthEvents((prev) => {
          const updated = new Map(prev);
          const existing = updated.get(event.day) ?? [];
          if (existing.some((e) => e.id === event.id)) return prev;
          updated.set(event.day, [...existing, event]);
          return updated;
        });
      },
      (event) => {
        // Remove deleted event from monthEvents map
        setMonthEvents((prev) => {
          const updated = new Map(prev);
          const existing = updated.get(event.day);
          if (!existing) return prev;
          const filtered = existing.filter((e) => e.id !== event.id);
          if (filtered.length === 0) {
            updated.delete(event.day);
          } else {
            updated.set(event.day, filtered);
          }
          return updated;
        });
      },
    );

    return () => {
      supabase.removeChannel(channel);
    };
  }, [relationshipId]);

  /* ── delete event (9.3.5) ── */
  const handleDeleteEvent = useCallback((eventId: string, eventTitle: string) => {
    Alert.alert(t('calendar.deleteEvent'), t('calendar.deleteEventConfirm', { title: eventTitle }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await supabase.from('calendar_events').delete().eq('id', eventId);
          setMonthEvents((prev) => {
            const updated = new Map(prev);
            for (const [day, dayEvents] of updated.entries()) {
              const filtered = dayEvents.filter((e) => e.id !== eventId);
              if (filtered.length === 0) {
                updated.delete(day);
              } else if (filtered.length !== dayEvents.length) {
                updated.set(day, filtered);
              }
            }
            return updated;
          });
        },
      },
    ]);
  }, [t]);

  /* ── fetch custom sticker image URLs ── */
  const [customStickerUrls, setCustomStickerUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!relationshipId) return;
    const hasCustom = stickers.some((s) => s.is_custom);
    if (!hasCustom) return;

    supabase
      .from('custom_stickers')
      .select('id, image_url')
      .eq('relationship_id', relationshipId)
      .then(({ data }) => {
        if (data) {
          const map: Record<string, string> = {};
          for (const cs of data) map[cs.id] = cs.image_url;
          setCustomStickerUrls(map);
        }
      });
  }, [relationshipId, stickers]);

  /* ── sticker overlay per day ── */
  const stickersByDay = useRef<Map<string, CalendarSticker[]>>(new Map());
  stickersByDay.current.clear();
  for (const s of stickers) {
    const list = stickersByDay.current.get(s.day) ?? [];
    list.push(s);
    stickersByDay.current.set(s.day, list);
  }

  /* ── drop resolution ── */
  const resolveDrop = useCallback(
    (pageX: number, pageY: number) => {
      for (const [day, rect] of dayCellLayouts.current.entries()) {
        if (
          pageX >= rect.x &&
          pageX <= rect.x + rect.width &&
          pageY >= rect.y &&
          pageY <= rect.y + rect.height
        ) {
          return {
            day,
            xInCell: (pageX - rect.x) / rect.width,
            yInCell: (pageY - rect.y) / rect.height,
          };
        }
      }
      return null;
    },
    [],
  );

  /* ── delete sticker ── */
  const handleDeleteSticker = useCallback(
    async (stickerId: string) => {
      Alert.alert(t('calendar.removeSticker'), undefined, [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.remove'),
          style: 'destructive',
          onPress: async () => {
            await supabase
              .from('calendar_stickers')
              .delete()
              .eq('id', stickerId);
            setStickers((prev) => prev.filter((s) => s.id !== stickerId));
          },
        },
      ]);
    },
    [t],
  );

  /* ── custom day component ── */
  const renderDay = useCallback(
    (date?: DateData) => {
      if (!date) return <View style={styles.dayCell} />;

      const dayStickers = stickersByDay.current.get(date.dateString) ?? [];
      const hasNote = daysWithNotes.has(date.dateString);
      const hasEvents = monthEvents.has(date.dateString);

      return (
        <Pressable
          onPress={() => handleDayPress(date.dateString)}
          style={styles.dayCell}
          onLayout={(e) => {
            // Measure in page coordinates
            (e.target as any).measureInWindow?.(
              (x: number, y: number, w: number, h: number) => {
                dayCellLayouts.current.set(date.dateString, {
                  x,
                  y,
                  width: w,
                  height: h,
                });
              },
            );
          }}
        >
          <Text
            style={[
              styles.dayText,
              date.dateString === todayString() && styles.todayText,
            ]}
          >
            {date.day}
          </Text>
          {/* Indicator dots */}
          {hasNote && hasEvents ? (
            <View style={{ flexDirection: 'row', gap: 3 }}>
              <View style={styles.noteDot} />
              <View style={styles.eventDot} />
            </View>
          ) : hasNote ? (
            <View style={styles.noteDot} />
          ) : hasEvents ? (
            <View style={styles.eventDot} />
          ) : null}
          {/* Render placed stickers */}
          {dayStickers.map((st) => (
            <Pressable
              key={st.id}
              onLongPress={() => handleDeleteSticker(st.id)}
              style={[
                styles.placedSticker,
                {
                  left: `${Math.min(st.x_coordinate * 100, 80)}%`,
                  top: `${Math.min(st.y_coordinate * 100, 60)}%`,
                },
              ]}
            >
              <Animated.View
                entering={FadeIn.springify().damping(12).stiffness(100)}
              >
                {st.is_custom && customStickerUrls[st.sticker_id] ? (
                  <Image
                    source={{ uri: customStickerUrls[st.sticker_id] }}
                    style={styles.placedCustomSticker}
                  />
                ) : (
                  <Text style={styles.placedStickerEmoji}>
                    {STICKER_EMOJI_MAP[st.sticker_id] ?? '❓'}
                  </Text>
                )}
              </Animated.View>
            </Pressable>
          ))}
        </Pressable>
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stickers, customStickerUrls, handleDeleteSticker, daysWithNotes, handleDayPress, monthEvents],
  );

  const onMonthChange = useCallback((month: DateData) => {
    setCurrentMonth(month.dateString);
    // Update header label
    const d = new Date(month.year, month.month - 1);
    setHeaderMonth(d.toLocaleString('default', { month: 'long', year: 'numeric' }));
    // Clear cached layouts since cells will re-render
    dayCellLayouts.current.clear();
    // Fetch events for the new month
    fetchEventsForMonth(month.year, month.month);
  }, [fetchEventsForMonth]);

  /** Called by CalendarList when visible months change during scroll */
  const onVisibleMonthsChange = useCallback((months: DateData[]) => {
    if (months && months.length > 0) {
      const first = months[0];
      setCurrentMonth(first.dateString);
      const d = new Date(first.year, first.month - 1);
      setHeaderMonth(d.toLocaleString('default', { month: 'long', year: 'numeric' }));
      dayCellLayouts.current.clear();
      // Fetch events for the newly visible month
      fetchEventsForMonth(first.year, first.month);
    }
  }, [fetchEventsForMonth]);

  /** User confirmed a month/year in the picker */
  const handlePickerSelect = useCallback((month: number, year: number) => {
    setPickerVisible(false);
    const dateStr = `${year}-${String(month).padStart(2, '0')}-01`;
    setCurrentMonth(dateStr);
    const d = new Date(year, month - 1);
    setHeaderMonth(d.toLocaleString('default', { month: 'long', year: 'numeric' }));
    calendarListRef.current?.scrollToMonth(dateStr);
    dayCellLayouts.current.clear();
  }, []);

  const handlePickerDismiss = useCallback(() => {
    setPickerVisible(false);
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <View style={styles.container} ref={calendarRef}>
        {/* ── Pressable month/year header ── */}
        <Pressable
          onPress={() => setPickerVisible(true)}
          style={styles.monthHeader}
          accessibilityRole="button"
          accessibilityLabel={`${headerMonth}. Tap to select month and year`}
        >
          <Text style={styles.monthHeaderText}>{headerMonth}</Text>
        </Pressable>

        <CalendarList
          ref={calendarListRef as any}
          current={currentMonth}
          horizontal={true}
          pagingEnabled={true}
          onMonthChange={onMonthChange}
          onVisibleMonthsChange={onVisibleMonthsChange}
          dayComponent={({ date }) => renderDay(date as DateData | undefined)}
          theme={calendarTheme}
          style={styles.calendar}
          calendarStyle={styles.calendar}
          hideArrows
          renderHeader={() => null}
          pastScrollRange={50}
          futureScrollRange={50}
          showScrollIndicator={false}
        />

        {/* ── Add Event FAB (6.3) ── */}
        <Pressable
          style={styles.addEventFab}
          onPress={() => setAddEventModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel={t('calendar.addEvent')}
        >
          <Text style={styles.addEventFabText}>+</Text>
        </Pressable>
      </View>

      {/* ── Bottom Sheet Agenda (6.3) ── */}
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backgroundStyle={styles.bottomSheetBackground}
        handleIndicatorStyle={styles.bottomSheetHandle}
      >
        <View style={styles.bottomSheetHeader}>
          <Text style={styles.bottomSheetTitle}>
            {t('calendar.events', { date: selectedDate })}
          </Text>
        </View>
        {(() => {
          const dayEvents = monthEvents.get(selectedDate);
          const sorted = dayEvents ? sortEventsChronologically(dayEvents) : [];
          if (sorted.length === 0) {
            return (
              <Text style={styles.noEventsText}>{t('calendar.noEvents')}</Text>
            );
          }
          return (
            <BottomSheetFlatList
              data={sorted}
              keyExtractor={(item: CalendarEvent) => item.id}
              contentContainerStyle={styles.bottomSheetList}
              renderItem={({ item }: { item: CalendarEvent }) => (
                <Pressable
                  style={styles.eventRow}
                  onLongPress={() => handleDeleteEvent(item.id, item.title)}
                >
                  <View style={styles.eventInfo}>
                    <Text style={styles.eventTitle}>{item.title}</Text>
                    {item.time ? (
                      <Text style={styles.eventTime}>{item.time}</Text>
                    ) : null}
                  </View>
                </Pressable>
              )}
            />
          );
        })()}
      </BottomSheet>

      <StickerDrawer
        visible={drawerVisible}
        onToggle={() => setDrawerVisible((v) => !v)}
        resolveDrop={resolveDrop}
        onStickerPlaced={fetchStickers}
      />

      {selectedDay && (
        <DayNoteModal
          visible={dayNoteModalVisible}
          onClose={handleDayNoteClose}
          day={selectedDay}
        />
      )}

      <AddEventModal
        visible={addEventModalVisible}
        onClose={() => {
          setAddEventModalVisible(false);
          fetchEventsForDate(selectedDate);
        }}
        day={selectedDate}
      />

      <MonthYearPicker
        visible={pickerVisible}
        currentMonth={currentMonth.slice(0, 7)}
        onSelect={handlePickerSelect}
        onDismiss={handlePickerDismiss}
      />
    </GestureHandlerRootView>
  );
}


/* ── calendar theme ──────────────────────────────────────────── */

const calendarTheme = {
  backgroundColor: '#121212',
  calendarBackground: '#121212',
  textSectionTitleColor: '#40E0D0',
  dayTextColor: '#FFFFFF',
  todayTextColor: '#FF7F50',
  monthTextColor: '#FFFFFF',
  arrowColor: '#FF7F50',
  textDisabledColor: '#555555',
  textDayFontFamily: 'System',
  textMonthFontFamily: 'System',
  textDayHeaderFontFamily: 'System',
  textDayFontSize: 14,
  textMonthFontSize: 18,
  textDayHeaderFontSize: 12,
};

/* ── styles ──────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#121212',
  },
  container: {
    flex: 1,
    paddingBottom: 36, // space for collapsed drawer handle
  },
  monthHeader: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  monthHeaderText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'System',
  },
  calendar: {
    backgroundColor: '#121212',
  },
  dayCell: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 4,
    position: 'relative',
    overflow: 'visible',
  },
  dayText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  todayText: {
    color: '#FF7F50',
    fontWeight: '700',
  },
  placedSticker: {
    position: 'absolute',
  },
  placedStickerEmoji: {
    fontSize: 14,
  },
  placedCustomSticker: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  noteDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#FF7F50',
    marginTop: 1,
  },
  eventDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#FF7F50',
    marginTop: 1,
  },
  bottomSheetBackground: {
    backgroundColor: '#1E1E1E',
  },
  bottomSheetHandle: {
    backgroundColor: '#555555',
  },
  bottomSheetHeader: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  bottomSheetTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSheetList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  addEventFab: {
    position: 'absolute',
    bottom: 44,
    right: 16,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FF7F50',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  addEventFabText: {
    color: '#FFFFFF',
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '700',
  },
  noEventsText: {
    color: '#6B7280',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 12,
  },
  eventRow: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 6,
  },
  eventInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eventTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    flex: 1,
  },
  eventTime: {
    color: '#40E0D0',
    fontSize: 13,
    marginLeft: 8,
  },
});
