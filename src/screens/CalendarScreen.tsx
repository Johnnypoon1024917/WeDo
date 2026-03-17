import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  LayoutRectangle,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/appStore';
import {
  realtimeManager,
  CalendarSticker,
  CalendarEvent,
} from '../services/realtimeManager';
import { DEFAULT_STICKERS } from '../assets/stickers/stickerData';
import StickerDrawer from '../components/StickerDrawer';
import DayNoteModal from '../components/DayNoteModal';
import AddEventModal from '../components/AddEventModal';

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

  // Day note modal state
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [dayNoteModalVisible, setDayNoteModalVisible] = useState(false);
  // Set of day strings (YYYY-MM-DD) that have notes for the current month
  const [daysWithNotes, setDaysWithNotes] = useState<Set<string>>(new Set());

  // Events state (9.3.1)
  const [selectedDate, setSelectedDate] = useState(todayString());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [addEventModalVisible, setAddEventModalVisible] = useState(false);

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

  /* ── day press handler ── */
  const handleDayPress = useCallback((dateString: string) => {
    setSelectedDay(dateString);
    setSelectedDate(dateString);
    setDayNoteModalVisible(true);
  }, []);

  const handleDayNoteClose = useCallback(() => {
    setDayNoteModalVisible(false);
    setSelectedDay(null);
    // Refresh notes to update indicator dots
    fetchNotesForMonth();
  }, [fetchNotesForMonth]);

  /* ── fetch events for selected date (9.3.2) ── */
  const fetchEventsForDate = useCallback(async (date: string) => {
    if (!relationshipId) return;

    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('relationship_id', relationshipId)
      .eq('day', date)
      .order('time', { ascending: true, nullsFirst: false });

    if (!error && data) {
      setEvents(data as CalendarEvent[]);
    }
  }, [relationshipId]);

  useEffect(() => {
    fetchEventsForDate(selectedDate);
  }, [fetchEventsForDate, selectedDate]);

  /* ── realtime subscription for calendar events (9.3.6) ── */
  useEffect(() => {
    if (!relationshipId) return;

    const channel = realtimeManager.subscribeToCalendarEvents(
      relationshipId,
      (event) => {
        // Only add to local state if it matches the selected date
        if (event.day === selectedDate) {
          setEvents((prev) => {
            if (prev.some((e) => e.id === event.id)) return prev;
            return [...prev, event];
          });
        }
      },
      (event) => {
        // Remove deleted event from local state
        setEvents((prev) => prev.filter((e) => e.id !== event.id));
      },
    );

    return () => {
      supabase.removeChannel(channel);
    };
  }, [relationshipId, selectedDate]);

  /* ── delete event (9.3.5) ── */
  const handleDeleteEvent = useCallback((eventId: string, eventTitle: string) => {
    Alert.alert(t('calendar.deleteEvent'), t('calendar.deleteEventConfirm', { title: eventTitle }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await supabase.from('calendar_events').delete().eq('id', eventId);
          setEvents((prev) => prev.filter((e) => e.id !== eventId));
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
          {/* Note indicator dot */}
          {hasNote && <View style={styles.noteDot} />}
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
    [stickers, customStickerUrls, handleDeleteSticker, daysWithNotes, handleDayPress],
  );

  const onMonthChange = useCallback((month: DateData) => {
    setCurrentMonth(month.dateString);
    // Clear cached layouts since cells will re-render
    dayCellLayouts.current.clear();
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <View style={styles.container} ref={calendarRef}>
        <Calendar
          key={currentMonth.slice(0, 7)}
          current={currentMonth}
          onMonthChange={onMonthChange}
          enableSwipeMonths
          dayComponent={({ date }) => renderDay(date as DateData | undefined)}
          theme={calendarTheme}
          style={styles.calendar}
        />

        {/* ── Events section (9.3.3 / 9.3.4) ── */}
        <View style={styles.eventsSection}>
          <View style={styles.eventsHeader}>
            <Text style={styles.eventsTitle}>
              {t('calendar.events', { date: selectedDate })}
            </Text>
            <Pressable
              style={styles.addEventFab}
              onPress={() => setAddEventModalVisible(true)}
              accessibilityRole="button"
              accessibilityLabel={t('calendar.addEvent')}
            >
              <Text style={styles.addEventFabText}>+</Text>
            </Pressable>
          </View>

          {events.length === 0 ? (
            <Text style={styles.noEventsText}>{t('calendar.noEvents')}</Text>
          ) : (
            <FlatList
              data={events}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
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
          )}
        </View>
      </View>

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
  eventsSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
    flex: 1,
  },
  eventsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  eventsTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  addEventFab: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FF7F50',
    alignItems: 'center',
    justifyContent: 'center',
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
