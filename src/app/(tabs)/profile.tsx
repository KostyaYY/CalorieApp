import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Card, Field, Screen, Segmented, parseNumber } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { getProfile, saveProfile } from '@/db';
import { useTheme } from '@/hooks/use-theme';
import {
  ACTIVITY,
  GOALS,
  calcTargets,
  type Activity,
  type Goal,
  type Profile,
  type Sex,
} from '@/lib/nutrition';

const LIMITS = {
  age: [14, 100],
  height: [120, 230],
  weight: [30, 300],
} as const;

export default function ProfileScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const [isNew, setIsNew] = useState(false);
  const [sex, setSex] = useState<Sex>('female');
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [activity, setActivity] = useState<Activity>('light');
  const [goal, setGoal] = useState<Goal>('maintain');

  useFocusEffect(
    useCallback(() => {
      getProfile(db).then((p) => {
        setIsNew(!p);
        if (!p) return;
        setSex(p.sex);
        setAge(String(p.age));
        setHeight(String(p.height));
        setWeight(String(p.weight));
        setActivity(p.activity);
        setGoal(p.goal);
      });
    }, [db])
  );

  const values = { age: parseNumber(age), height: parseNumber(height), weight: parseNumber(weight) };
  const invalid = (Object.keys(LIMITS) as (keyof typeof LIMITS)[]).filter((k) => {
    const v = values[k];
    return !(v >= LIMITS[k][0] && v <= LIMITS[k][1]);
  });
  const profile: Profile | null =
    invalid.length === 0
      ? { sex, age: Math.round(values.age), height: values.height, weight: values.weight, activity, goal }
      : null;
  const targets = profile ? calcTargets(profile) : null;

  async function onSave() {
    if (!profile) {
      const names = { age: 'вік', height: 'зріст', weight: 'вага' };
      const hint = invalid.map((k) => `${names[k]}: ${LIMITS[k][0]}–${LIMITS[k][1]}`).join('\n');
      Alert.alert('Перевірте дані', hint);
      return;
    }
    await saveProfile(db, profile);
    if (isNew) {
      router.navigate('/');
    } else {
      Alert.alert('Збережено', `Ваша норма: ${targets!.kcal} ккал на день`);
    }
  }

  return (
    <Screen topInset>
      <ThemedText style={{ fontSize: 28, lineHeight: 34, fontWeight: 800 }}>Профіль</ThemedText>

      <Card style={{ gap: Spacing.three }}>
        <Segmented
          options={[
            { key: 'female', label: 'Жінка' },
            { key: 'male', label: 'Чоловік' },
          ]}
          value={sex}
          onChange={setSex}
        />
        <View style={styles.row}>
          <Field label="Вік" suffix="р." value={age} onChangeText={setAge} keyboardType="number-pad" maxLength={3} style={{ flex: 1 }} />
          <Field label="Зріст" suffix="см" value={height} onChangeText={setHeight} keyboardType="decimal-pad" maxLength={5} style={{ flex: 1 }} />
          <Field label="Вага" suffix="кг" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" maxLength={5} style={{ flex: 1 }} />
        </View>
      </Card>

      <Card>
        <ThemedText style={{ fontWeight: 700 }}>Фізична активність</ThemedText>
        {ACTIVITY.map((a) => {
          const active = a.key === activity;
          return (
            <Pressable
              key={a.key}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              onPress={() => setActivity(a.key)}
              style={[
                styles.option,
                { borderColor: active ? theme.tint : theme.border, backgroundColor: theme.background },
              ]}>
              <View style={[styles.radio, { borderColor: active ? theme.tint : theme.border }]}>
                {active && <View style={[styles.radioDot, { backgroundColor: theme.tint }]} />}
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={{ fontWeight: 600 }}>{a.label}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {a.hint}
                </ThemedText>
              </View>
            </Pressable>
          );
        })}
      </Card>

      <Card>
        <ThemedText style={{ fontWeight: 700 }}>Мета</ThemedText>
        <Segmented options={GOALS} value={goal} onChange={setGoal} />
      </Card>

      {targets && (
        <Card>
          <ThemedText style={{ fontWeight: 700 }}>Ваша денна норма</ThemedText>
          <ThemedText style={{ fontSize: 34, lineHeight: 40, fontWeight: 800, color: theme.tint }}>
            {targets.kcal} ккал
          </ThemedText>
          <View style={styles.row}>
            <Pill label="Білки" value={`${targets.protein} г`} color={theme.protein} />
            <Pill label="Жири" value={`${targets.fat} г`} color={theme.fat} />
            <Pill label="Вуглеводи" value={`${targets.carbs} г`} color={theme.carbs} />
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            Базовий обмін (Міффлін — Сан-Жеор): {targets.bmr} ккал · з урахуванням активності:{' '}
            {targets.tdee} ккал · вода: {targets.water} мл
          </ThemedText>
        </Card>
      )}

      <Button title={isNew ? 'Розрахувати та почати' : 'Зберегти'} onPress={onSave} />

      <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
        Розрахунки орієнтовні й не є медичною порадою. За наявності захворювань проконсультуйтеся з
        лікарем.
      </ThemedText>
    </Screen>
  );
}

function Pill({ label, value, color }: { label: string; value: string; color: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.pill, { backgroundColor: theme.background }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <ThemedText type="smallBold">{value}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1.5,
    borderRadius: 12,
    padding: Spacing.three,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  pill: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: Spacing.two,
    gap: Spacing.half,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
