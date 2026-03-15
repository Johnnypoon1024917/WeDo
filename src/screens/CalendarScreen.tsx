import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Image,
  LayoutRectangle,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/appStore';
import {
  realtimeManager,
  CalendarSticker,
} from '../services/realtimeManager';
import { DEFAULT_STICKERS } from '../assets/stickers/stickerData';
import StickerDrawer from '../components/StickerDrawer';

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
  const relationshipId = useAppStore((s) => s.relationshipId);
  const [stickers, setStickers] = useState<CalendarSticker[]>([]);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(todayString());

  // Track day cell layouts for drop resolution
  // Key: "YYYY-MM-DD", Value: page-level bounding rect
  const dayCellLayouts = useRef<Map<string, LayoutRectangle>>(new Map());

  // Ref to the calendar container for coordinate mapping
  const calendarRef = useRef<View>(null);
  const calendarLayout = useRef<LayoutRectangle>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

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

  /* ── custom day component ── */
  const renderDay = useCallback(
    (date?: DateData) => {
      if (!date) return <View style={styles.dayCell} />;

      const dayStickers = stickersByDay.current.get(date.dateString) ?? [];

      return (
        <View
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
          {/* Render placed stickers */}
          {dayStickers.map((st) => (
            <Animated.View
              key={st.id}
              entering={FadeIn.springify().damping(12).stiffness(100)}
              style={[
                styles.placedSticker,
                {
                  left: `${Math.min(st.x_coordinate * 100, 80)}%`,
                  top: `${Math.min(st.y_coordinate * 100, 60)}%`,
                },
              ]}
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
          ))}
        </View>
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stickers, customStickerUrls],
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
      </View>

      <StickerDrawer
        visible={drawerVisible}
        onToggle={() => setDrawerVisible((v) => !v)}
        resolveDrop={resolveDrop}
        onStickerPlaced={fetchStickers}
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
});
