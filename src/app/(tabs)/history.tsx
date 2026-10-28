import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { WeekChart } from '@/components/charts';
import { ThemedText } from '@/components/themed-text';
import { Card, Screen, SectionTitle } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { getDayTotals, getProfile, type DayTotal } from '@/db';
import { useTheme } from '@/hooks/use-theme';
import { addDays, formatDay, todayKey, weekdayShort } from '@/lib/date';
import { calcTargets, fmt } from '@/lib/nutrition';

const HISTORY_DAYS = 30;

export default function HistoryScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const [totals, setTotals] = useState<DayTotal[]>([]);
  const [target, setTarget] = useState(0);

  useFocusEffect(
    useCallback(() => {
      const today = todayKey();
      Promise.all([getProfile(db), getDayTotals(db, addDays(today, -(HISTORY_DAYS - 1)), today)]).then(
        ([p, t]) => {
          setTarget(p ? calcTargets(p).kcal : 0);
          setTotals(t);
        }
      );
    }, [db])
  );

  const today = todayKey();
  const byDate = new Map(totals.map((t) => [t.date, t]));
  const week = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, i - 6);
    return { date, label: weekdayShort(date), kcal: byDate.get(date)?.kcal ?? 0, isToday: date === today };
  });
  const logged = week.filter((d) => d.kcal > 0);
  const avg = logged.length ? logged.reduce((s, d) => s + d.kcal, 0) / logged.length : 0;
  const inGoal = target ? logged.filter((d) => d.kcal <= target).length : 0;

  return (
    <Screen topInset>
      <ThemedText style={{ fontSize: 28, lineHeight: 34, fontWeight: 800 }}>Історія</ThemedText>

      <Card>
        <SectionTitle>Останні 7 днів</SectionTitle>
        <WeekChart days={week} target={target} width={width - Spacing.three * 4} />
        <View style={styles.stats}>
          <Stat value={Math.round(avg)} label="ккал у середньому" />
          <Stat value={`${logged.length}/7`} label="днів із записами" />
          <Stat value={target ? `${inGoal}/${logged.length}` : '—'} label="у межах норми" />
        </View>
        {target > 0 && (
          <ThemedText type="small" themeColor="textSecondary">
            Пунктир — ваша норма {target} ккал
          </ThemedText>
        )}
      </Card>

      <SectionTitle>Щоденник за {HISTORY_DAYS} днів</SectionTitle>
      {totals.length === 0 ? (
        <Card>
          <ThemedText themeColor="textSecondary">
            Тут з’являться дні, коли ви додавали їжу. Почніть із вкладки «Щоденник».
          </ThemedText>
        </Card>
      ) : (
        totals.map((t) => {
          const over = target > 0 && t.kcal > target;
          return (
            <Pressable
              key={t.date}
              onPress={() => router.push({ pathname: '/day/[date]', params: { date: t.date } })}
              style={({ pressed }) => [
                styles.day,
                { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.7 : 1 },
              ]}>
              <View style={{ flex: 1 }}>
                <ThemedText style={{ fontWeight: 700 }}>{formatDay(t.date)}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Б {fmt(t.protein)} · Ж {fmt(t.fat)} · В {fmt(t.carbs)} · записів: {t.count}
                </ThemedText>
              </View>
              <ThemedText style={{ fontWeight: 800, color: over ? theme.danger : theme.text }}>
                {Math.round(t.kcal)} ккал
              </ThemedText>
            </Pressable>
          );
        })
      )}
    </Screen>
  );
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <ThemedText style={{ fontSize: 18, fontWeight: 800 }}>{value}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  stats: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  day: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: 14,
    padding: Spacing.three,
  },
});
