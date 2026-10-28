import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, SectionList, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Card, Field, Segmented, parseNumber } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { addEntry, deleteCustomFood, getFoods, getRecentFoods, type Food } from '@/db';
import { useTheme } from '@/hooks/use-theme';
import { todayKey } from '@/lib/date';
import { fmt, MEALS, scale, type Meal } from '@/lib/nutrition';

const QUICK_GRAMS = [50, 100, 150, 200, 300];

export default function AddFoodScreen() {
  const params = useLocalSearchParams<{ date?: string; meal?: Meal }>();
  const date = params.date ?? todayKey();
  const db = useSQLiteContext();
  const theme = useTheme();
  const [foods, setFoods] = useState<Food[]>([]);
  const [recent, setRecent] = useState<Food[]>([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Food | null>(null);
  const [grams, setGrams] = useState('100');
  const [meal, setMeal] = useState<Meal>(params.meal ?? 'breakfast');

  const load = useCallback(async () => {
    const [f, r] = await Promise.all([getFoods(db), getRecentFoods(db)]);
    setFoods(f);
    setRecent(r);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q) {
      const words = q.split(/\s+/);
      const data = foods.filter((f) => {
        const name = f.name.toLowerCase();
        return words.every((w) => name.includes(w));
      });
      return [{ title: `Знайдено: ${data.length}`, data }];
    }
    const custom = foods.filter((f) => f.is_custom);
    return [
      { title: 'Нещодавні', data: recent },
      { title: 'Мої продукти', data: custom },
      { title: 'Усі продукти', data: foods.filter((f) => !f.is_custom) },
    ].filter((s) => s.data.length > 0);
  }, [foods, recent, query]);

  function confirmDeleteCustom(food: Food) {
    if (!food.is_custom) return;
    Alert.alert('Видалити продукт?', `«${food.name}» зникне зі списку. Записи в щоденнику залишаться.`, [
      { text: 'Скасувати', style: 'cancel' },
      {
        text: 'Видалити',
        style: 'destructive',
        onPress: async () => {
          await deleteCustomFood(db, food.id);
          load();
        },
      },
    ]);
  }

  if (selected) {
    const g = parseNumber(grams);
    const valid = g > 0 && g <= 5000;
    const n = scale(selected, valid ? g : 0);

    async function onAdd() {
      if (!selected || !valid) return;
      await addEntry(db, { date, meal, food: selected, grams: g });
      router.back();
    }

    return (
      <View style={[styles.flex, { backgroundColor: theme.background }]}>
        <View style={styles.panel}>
          <Card style={{ gap: Spacing.three }}>
            <View>
              <ThemedText style={{ fontSize: 20, lineHeight: 26, fontWeight: 800 }}>{selected.name}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                На 100 г: {fmt(selected.kcal)} ккал · Б {fmt(selected.protein, 1)} · Ж{' '}
                {fmt(selected.fat, 1)} · В {fmt(selected.carbs, 1)}
              </ThemedText>
            </View>

            <Field
              label="Кількість"
              suffix="г"
              value={grams}
              onChangeText={setGrams}
              keyboardType="decimal-pad"
              autoFocus
              selectTextOnFocus
              maxLength={6}
            />
            <View style={styles.chips}>
              {QUICK_GRAMS.map((q) => (
                <Pressable
                  key={q}
                  onPress={() => setGrams(String(q))}
                  style={[
                    styles.chip,
                    { backgroundColor: g === q ? theme.tint : theme.backgroundSelected },
                  ]}>
                  <ThemedText type="smallBold" style={{ color: g === q ? theme.onTint : theme.text }}>
                    {q} г
                  </ThemedText>
                </Pressable>
              ))}
            </View>

            <View style={styles.result}>
              <ThemedText style={{ fontSize: 32, lineHeight: 38, fontWeight: 800, color: theme.tint }}>
                {Math.round(n.kcal)} ккал
              </ThemedText>
              <ThemedText themeColor="textSecondary">
                Б {fmt(n.protein, 1)} г · Ж {fmt(n.fat, 1)} г · В {fmt(n.carbs, 1)} г
              </ThemedText>
            </View>

            <Segmented options={MEALS} value={meal} onChange={setMeal} />
          </Card>

          <Button title="Додати в щоденник" onPress={onAdd} disabled={!valid} />
          <Button title="Обрати інший продукт" variant="ghost" onPress={() => setSelected(null)} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: theme.background }]}>
      <View style={styles.searchBar}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Пошук продукту…"
          placeholderTextColor={theme.textSecondary}
          style={[styles.search, { backgroundColor: theme.backgroundElement, color: theme.text }]}
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>
      <SectionList
        sections={sections}
        keyExtractor={(item, i) => `${item.id}-${i}`}
        keyboardShouldPersistTaps="handled"
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Button
            title="+ Створити свій продукт"
            variant="secondary"
            onPress={() => router.push({ pathname: '/custom-food', params: { name: query.trim() } })}
          />
        }
        ListEmptyComponent={
          <ThemedText themeColor="textSecondary" style={{ textAlign: 'center', marginTop: Spacing.four }}>
            Нічого не знайдено. Створіть свій продукт — це займе пів хвилини.
          </ThemedText>
        }
        renderSectionHeader={({ section }) => (
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionHeader}>
            {section.title.toUpperCase()}
          </ThemedText>
        )}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => {
              setSelected(item);
              setGrams('100');
            }}
            onLongPress={() => confirmDeleteCustom(item)}
            style={({ pressed }) => [
              styles.item,
              { borderBottomColor: theme.border, opacity: pressed ? 0.6 : 1 },
            ]}>
            <View style={{ flex: 1 }}>
              <ThemedText numberOfLines={1}>{item.name}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                Б {fmt(item.protein, 1)} · Ж {fmt(item.fat, 1)} · В {fmt(item.carbs, 1)} · на 100 г
              </ThemedText>
            </View>
            <ThemedText style={{ fontWeight: 700 }}>{fmt(item.kcal)}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              ккал
            </ThemedText>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  panel: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 20,
  },
  result: {
    alignItems: 'center',
    gap: Spacing.half,
  },
  searchBar: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  search: {
    minHeight: 48,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  list: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.six,
  },
  sectionHeader: {
    marginTop: Spacing.three,
    marginBottom: Spacing.one,
    letterSpacing: 0.5,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
