import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import type { Verdict } from '@/services/types';
import { useTheme, verdictColors } from '@/theme';

type Props = {
  score: number;
  verdict: Verdict;
  size?: number;
  // "onColor" draws the ring in white for use on top of a coloured hero.
  onColor?: boolean;
  animate?: boolean;
};

export function ScoreBadge({ score, verdict, size = 48, onColor = false, animate = false }: Props) {
  const t = useTheme();
  const c = verdictColors(t, verdict);
  const shown = useCountUp(score, animate);

  const stroke = Math.max(4, size / 11);
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const progress = Math.max(0.02, shown / 100);

  const track = onColor ? 'rgba(255,255,255,0.25)' : c.bg;
  const arc = onColor ? '#FFFFFF' : c.fg;
  const label = onColor ? '#FFFFFF' : c.fg;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={arc}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - progress)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <Text style={{ color: label, fontWeight: '800', fontSize: size * 0.32, letterSpacing: -0.5 }}>{shown}</Text>
        {size >= 80 && <Text style={{ color: label, opacity: 0.8, fontSize: size * 0.11, fontWeight: '600' }}>av 100</Text>}
      </View>
    </View>
  );
}

function useCountUp(target: number, animate: boolean) {
  const [value, setValue] = useState(animate ? 0 : target);
  useEffect(() => {
    if (!animate) {
      setValue(target);
      return;
    }
    const start = Date.now();
    const duration = 900;
    let frame: ReturnType<typeof requestAnimationFrame>;
    const tick = () => {
      const p = Math.min(1, (Date.now() - start) / duration);
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, animate]);
  return value;
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});
