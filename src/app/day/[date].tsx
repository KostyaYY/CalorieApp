import { Stack, useLocalSearchParams } from 'expo-router';

import { DayView } from '@/components/day-view';
import { Screen } from '@/components/ui';
import { formatDay } from '@/lib/date';

export default function DayScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();

  return (
    <Screen>
      <Stack.Screen options={{ title: formatDay(date) }} />
      <DayView date={date} />
    </Screen>
  );
}
