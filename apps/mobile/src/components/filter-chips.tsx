import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useTheme } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

export type ChipOption<T extends string> = { key: T; label: string; icon?: IconName; count?: number };

export function FilterChips<T extends string>({ options, value, onChange }: { options: ChipOption<T>[]; value: T; onChange: (v: T) => void }) {
  const t = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} accessibilityRole="tablist">
      {options.map((o) => {
        const active = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[styles.chip, { backgroundColor: active ? t.brand : t.card, borderColor: active ? t.brand : t.border }]}
          >
            {o.icon && <Ionicons name={o.icon} size={15} color={active ? t.onBrand : t.muted} />}
            <Text style={[styles.label, { color: active ? t.onBrand : t.text }]}>{o.label}</Text>
            {o.count !== undefined && <Text style={[styles.count, { color: active ? 'rgba(255,255,255,0.75)' : t.faint }]}>{o.count}</Text>}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingVertical: 4 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: 1 },
  label: { fontSize: 14, fontWeight: '700' },
  count: { fontSize: 13, fontWeight: '700' },
});
