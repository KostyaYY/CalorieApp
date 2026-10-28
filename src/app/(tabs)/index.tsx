import { useState } from 'react';

import { DayView } from '@/components/day-view';
import { Screen } from '@/components/ui';
import { todayKey } from '@/lib/date';

export default function DiaryScreen() {
  const [date, setDate] = useState(todayKey);

  return (
    <Screen topInset>
      <DayView date={date} onChangeDate={setDate} />
    </Screen>
  );
}
