import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { CalorieRing, MacroBar } from '@/components/charts';
import { ThemedText } from '@/components/themed-text';
import { Button, Card } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { deleteEntry, getEntries, getProfile, getWater, setWater, type Entry } from '@/db';
import { useTheme } from '@/hooks/use-theme';
import { addDays, formatDay, todayKey } from '@/lib/date';
import { calcTargets, fmt, MEALS, type Profile } from '@/lib/nutrition';

const WATER_STEP = 250;

export function DayView({ date, onChangeDate }: { date: string; onChangeDate?: (d: string) => void }) {
  const db = useSQLiteContext();
  const theme = useTheme();
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [water, setWaterState] = useState(0);

  const load = useCallback(async () => {
    const [p, e, w] = await Promise.all([getProfile(db), getEntries(db, date), getWater(db, date)]);
    setProfile(p);
    setEntries(e);
    setWaterState(w);
  }, [db, date]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (profile === undefined) return null;

  if (profile === null) {
    return (
      <Card style={{ gap: Spacing.three }}>
        <ThemedText style={{ fontSize: 22, lineHeight: 28, fontWeight: 800 }}>Вітаємо!</ThemedText>
        <ThemedText themeColor="textSecondary">
          Вкажіть свої параметри, і ми розрахуємо денну норму калорій, білків, жирів і вуглеводів.
        </ThemedText>
        <Button title="Заповнити профіль" onPress={() => router.navigate('/profile')} />
      </Card>
    );
  }

  const targets = calcTargets(profile);
  const total = entries.reduce(
    (acc, e) => ({
      kcal: acc.kcal + e.kcal,
      protein: acc.protein + e.protein,
      fat: acc.fat + e.fat,
      carbs: acc.carbs + e.carbs,
    }),
    { kcal: 0, protein: 0, fat: 0, carbs: 0 }
  );
  const isToday = date === todayKey();

  async function changeWater(delta: number) {
    const next = Math.max(0, water + delta);
    setWaterState(next);
    await setWater(db, date, next);
  }

  function confirmDelete(e: Entry) {
    Alert.alert('Видалити запис?', `${e.name}, ${fmt(e.grams)} г`, [
      { text: 'Скасувати', style: 'cancel' },
      {
        text: 'Видалити',
        style: 'destructive',
        onPress: async () => {
          await deleteEntry(db, e.id);
          load();
        },
      },
    ]);
  }

  return (
    <>
      {onChangeDate && (
        <View style={styles.dateNav}>
          <NavArrow label="‹" onPress={() => onChangeDate(addDays(date, -1))} />
          <Pressable onPress={() => onChangeDate(todayKey())} disabled={isToday}>
            <ThemedText style={{ fontSize: 20, fontWeight: 800 }}>{formatDay(date)}</ThemedText>
          </Pressable>
          <NavArrow label="›" onPress={() => onChangeDate(addDays(date, 1))} disabled={isToday} />
        </View>
      )}

      <Card style={{ alignItems: 'center', gap: Spacing.three }}>
        <CalorieRing eaten={total.kcal} target={targets.kcal} />
        <View style={styles.statsRow}>
          <Stat label="Норма" value={targets.kcal} />
          <Stat label="З'їдено" value={Math.round(total.kcal)} />
          <Stat label="Залишок" value={Math.max(0, Math.round(targets.kcal - total.kcal))} />
        </View>
        <View style={styles.macros}>
          <MacroBar label="Білки" value={total.protein} target={targets.protein} color={theme.protein} />
          <MacroBar label="Жири" value={total.fat} target={targets.fat} color={theme.fat} />
          <MacroBar label="Вуглеводи" value={total.carbs} target={targets.carbs} color={theme.carbs} />
        </View>
      </Card>

      <Card>
        <View style={styles.rowBetween}>
          <ThemedText style={{ fontWeight: 700 }}>💧 Вода</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {water} / {targets.water} мл
          </ThemedText>
        </View>
        <View style={[styles.waterTrack, { backgroundColor: theme.track }]}>
          <View
            style={{
              height: '100%',
              width: `${Math.min(water / targets.water, 1) * 100}%`,
              backgroundColor: theme.water,
              borderRadius: 5,
            }}
          />
        </View>
        <View style={styles.waterButtons}>
          <Button
            title={`− ${WATER_STEP}`}
            variant="secondary"
            onPress={() => changeWater(-WATER_STEP)}
            disabled={water === 0}
            style={{ flex: 1 }}
          />
          <Button
            title={`+ ${WATER_STEP} мл`}
            onPress={() => changeWater(WATER_STEP)}
            style={{ flex: 2, backgroundColor: theme.water }}
          />
        </View>
      </Card>

      {MEALS.map((meal) => {
        const items = entries.filter((e) => e.meal === meal.key);
        const kcal = items.reduce((s, e) => s + e.kcal, 0);
        return (
          <Card key={meal.key}>
            <View style={styles.rowBetween}>
              <View>
                <ThemedText style={{ fontSize: 17, fontWeight: 700 }}>{meal.label}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {Math.round(kcal)} ккал
                </ThemedText>
              </View>
              <Button
                title="+ Додати"
                variant="secondary"
                onPress={() =>
                  router.push({ pathname: '/add-food', params: { date, meal: meal.key } })
                }
              />
            </View>
            {items.map((e) => (
              <Pressable
                key={e.id}
                onLongPress={() => confirmDelete(e)}
                style={({ pressed }) => [
                  styles.entry,
                  { borderTopColor: theme.border, opacity: pressed ? 0.6 : 1 },
                ]}>
                <View style={{ flex: 1 }}>
                  <ThemedText numberOfLines={1}>{e.name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {fmt(e.grams)} г · Б {fmt(e.protein, 1)} · Ж {fmt(e.fat, 1)} · В {fmt(e.carbs, 1)}
                  </ThemedText>
                </View>
                <ThemedText style={{ fontWeight: 700 }}>{Math.round(e.kcal)}</ThemedText>
              </Pressable>
            ))}
          </Card>
        );
      })}

      {entries.length > 0 && (
        <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
          Утримуйте запис, щоб видалити його
        </ThemedText>
      )}
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <ThemedText style={{ fontSize: 18, fontWeight: 800 }}>{value}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

function NavArrow({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      style={[styles.arrow, { backgroundColor: theme.backgroundElement, opacity: disabled ? 0.3 : 1 }]}>
      <ThemedText style={{ fontSize: 24, lineHeight: 28, fontWeight: 700 }}>{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  arrow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    alignSelf: 'stretch',
  },
  macros: {
    flexDirection: 'row',
    gap: Spacing.three,
    alignSelf: 'stretch',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  waterTrack: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  waterButtons: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
