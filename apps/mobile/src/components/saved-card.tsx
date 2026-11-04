import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CATEGORIES, listingPlace, listingTitle } from '@/categories';
import type { SavedAnalysis } from '@/services/types';
import { formatMoney, shadow, timeAgo, useTheme, VERDICT_LABEL, verdictColors } from '@/theme';
import { ScoreBadge } from './score-badge';

export function SavedCard({ a, onPress }: { a: SavedAnalysis; onPress: () => void }) {
  const t = useTheme();
  const vc = verdictColors(t, a.verdict);
  const price = formatMoney(a.facts.price, a.facts.currency);
  const meta = [listingPlace(a), price && (a.category === 'rental' ? `${price}/mnd` : price)].filter(Boolean).join(' · ');
  const cat = CATEGORIES[a.category];

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, { backgroundColor: t.card, transform: [{ scale: pressed ? 0.985 : 1 }] }, shadow(t)]}
    >
      <ScoreBadge score={a.score} verdict={a.verdict} size={52} />
      <View style={{ flex: 1, gap: 4 }}>
        <View style={styles.titleRow}>
          <Ionicons name={cat.icon} size={14} color={t.faint} />
          <Text style={[styles.title, { color: t.text }]} numberOfLines={1}>
            {listingTitle(a)}
          </Text>
        </View>
        {!!meta && (
          <Text style={[styles.meta, { color: t.muted }]} numberOfLines={1}>
            {meta}
          </Text>
        )}
        <View style={styles.foot}>
          <View style={[styles.chip, { backgroundColor: vc.bg }]}>
            <Text style={[styles.chipText, { color: vc.fg }]}>{VERDICT_LABEL[a.verdict]}</Text>
          </View>
          <Text style={[styles.time, { color: t.faint }]} numberOfLines={1}>
            {timeAgo(a.analyzedAt)}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={t.faint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 20 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 16, fontWeight: '700', flex: 1 },
  meta: { fontSize: 14 },
  foot: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 8, rowGap: 4, marginTop: 2 },
  chip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  chipText: { fontSize: 12, fontWeight: '700' },
  time: { fontSize: 12 },
});
