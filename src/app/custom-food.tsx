import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Card, Field, Screen, parseNumber } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { addCustomFood } from '@/db';

export default function CustomFoodScreen() {
  const params = useLocalSearchParams<{ name?: string }>();
  const db = useSQLiteContext();
  const [name, setName] = useState(params.name ?? '');
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [fat, setFat] = useState('');
  const [carbs, setCarbs] = useState('');

  const nums = {
    kcal: parseNumber(kcal),
    protein: parseNumber(protein || '0'),
    fat: parseNumber(fat || '0'),
    carbs: parseNumber(carbs || '0'),
  };
  // Energy from macros, shown as a hint when the user hasn't typed calories.
  const estimated = Math.round(nums.protein * 4 + nums.fat * 9 + nums.carbs * 4);

  async function onSave() {
    const kcalValue = Number.isNaN(nums.kcal) ? estimated : nums.kcal;
    const macrosOk = [nums.protein, nums.fat, nums.carbs].every((v) => v >= 0 && v <= 100);
    if (!name.trim()) return Alert.alert('Вкажіть назву продукту');
    if (!macrosOk || nums.protein + nums.fat + nums.carbs > 100)
      return Alert.alert('Перевірте БЖВ', 'Сума білків, жирів і вуглеводів не може перевищувати 100 г на 100 г.');
    if (!(kcalValue > 0 && kcalValue <= 900))
      return Alert.alert('Перевірте калорійність', 'Вкажіть від 1 до 900 ккал на 100 г.');

    await addCustomFood(db, { name: name.trim(), kcal: kcalValue, protein: nums.protein, fat: nums.fat, carbs: nums.carbs });
    router.back();
  }

  return (
    <Screen>
      <Card style={{ gap: Spacing.three }}>
        <Field label="Назва" value={name} onChangeText={setName} placeholder="Напр., домашній пиріг" autoFocus={!name} />
        <ThemedText type="small" themeColor="textSecondary">
          Значення на 100 г — їх зазвичай вказують на упаковці.
        </ThemedText>
        <Field
          label="Калорійність"
          suffix="ккал"
          value={kcal}
          onChangeText={setKcal}
          keyboardType="decimal-pad"
          placeholder={estimated > 0 ? String(estimated) : ''}
          maxLength={6}
        />
        <View style={styles.row}>
          <Field label="Білки" suffix="г" value={protein} onChangeText={setProtein} keyboardType="decimal-pad" maxLength={5} style={styles.flex} />
          <Field label="Жири" suffix="г" value={fat} onChangeText={setFat} keyboardType="decimal-pad" maxLength={5} style={styles.flex} />
          <Field label="Вуглеводи" suffix="г" value={carbs} onChangeText={setCarbs} keyboardType="decimal-pad" maxLength={5} style={styles.flex} />
        </View>
        {Number.isNaN(nums.kcal) && estimated > 0 && (
          <ThemedText type="small" themeColor="textSecondary">
            Якщо не вказати калорійність, її буде розраховано з БЖВ: {estimated} ккал.
          </ThemedText>
        )}
      </Card>
      <Button title="Зберегти продукт" onPress={onSave} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  flex: { flex: 1 },
});
