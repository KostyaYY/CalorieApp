import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Rect, Text as SvgText } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fmt } from '@/lib/nutrition';

/** Circular progress showing eaten vs. daily target. */
export function CalorieRing({ eaten, target, size = 190 }: { eaten: number; target: number; size?: number }) {
  const theme = useTheme();
  const stroke = 16;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const progress = target > 0 ? Math.min(eaten / target, 1) : 0;
  const over = eaten > target;
  const left = Math.round(target - eaten);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={theme.track} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={over ? theme.danger : theme.tint}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={c * (1 - progress)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.ringCenter]}>
        <ThemedText style={{ fontSize: 36, lineHeight: 42, fontWeight: 800 }}>
          {Math.abs(left)}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {over ? 'ккал понад норму' : 'ккал залишилось'}
        </ThemedText>
      </View>
    </View>
  );
}

export function MacroBar({
  label,
  value,
  target,
  color,
}: {
  label: string;
  value: number;
  target: number;
  color: string;
}) {
  const theme = useTheme();
  const pct = target > 0 ? Math.min(value / target, 1) : 0;
  return (
    <View style={{ flex: 1, gap: Spacing.one }}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <View style={[styles.barTrack, { backgroundColor: theme.track }]}>
        <View style={[styles.barFill, { width: `${pct * 100}%`, backgroundColor: color }]} />
      </View>
      <ThemedText type="smallBold">
        {fmt(value)} / {target} г
      </ThemedText>
    </View>
  );
}

/** Bar chart of daily calories with a dashed target line. */
export function WeekChart({
  days,
  target,
  width,
  height = 180,
}: {
  days: { label: string; kcal: number; isToday?: boolean }[];
  target: number;
  width: number;
  height?: number;
}) {
  const theme = useTheme();
  const top = 18;
  const bottom = 24;
  const chartH = height - top - bottom;
  const max = Math.max(target * 1.2, ...days.map((d) => d.kcal), 1);
  const slot = width / days.length;
  const barW = Math.min(28, slot * 0.6);
  const targetY = top + chartH * (1 - target / max);

  return (
    <Svg width={width} height={height}>
      {days.map((d, i) => {
        const h = (d.kcal / max) * chartH;
        const x = i * slot + (slot - barW) / 2;
        const color = d.kcal > target ? theme.danger : theme.tint;
        return (
          <Rect
            key={i}
            x={x}
            y={top + chartH - h}
            width={barW}
            height={Math.max(h, d.kcal > 0 ? 3 : 0)}
            rx={6}
            fill={color}
            opacity={d.isToday ? 1 : 0.75}
          />
        );
      })}
      {days.map((d, i) =>
        d.kcal > 0 ? (
          <SvgText
            key={`v${i}`}
            x={i * slot + slot / 2}
            y={top + chartH - (d.kcal / max) * chartH - 5}
            fontSize={10}
            fill={theme.textSecondary}
            textAnchor="middle">
            {Math.round(d.kcal)}
          </SvgText>
        ) : null
      )}
      {target > 0 && (
        <Line
          x1={0}
          x2={width}
          y1={targetY}
          y2={targetY}
          stroke={theme.textSecondary}
          strokeDasharray="4 4"
          strokeWidth={1}
        />
      )}
      {days.map((d, i) => (
        <SvgText
          key={`l${i}`}
          x={i * slot + slot / 2}
          y={height - 6}
          fontSize={12}
          fontWeight={d.isToday ? 'bold' : 'normal'}
          fill={d.isToday ? theme.text : theme.textSecondary}
          textAnchor="middle">
          {d.label}
        </SvgText>
      ))}
    </Svg>
  );
}

const styles = StyleSheet.create({
  ringCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  barTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
});
