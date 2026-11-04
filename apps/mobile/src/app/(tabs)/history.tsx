import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SecondaryButton } from '@/components/buttons';
import { FilterChips } from '@/components/filter-chips';
import { PageHeader } from '@/components/page-header';
import { SavedCard } from '@/components/saved-card';
import { CATEGORIES, CATEGORY_ORDER } from '@/categories';
import { listSaved } from '@/services/saved';
import type { Category, SavedAnalysis } from '@/services/types';
import { useTheme } from '@/theme';

type Filter = 'all' | Category;

export default function HistoryScreen() {
  const t = useTheme();
  const router = useRouter();
  const [saved, setSaved] = useState<SavedAnalysis[] | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

  useFocusEffect(
    useCallback(() => {
      void listSaved().then(setSaved);
    }, []),
  );

  const all = saved ?? [];
  const shown = filter === 'all' ? all : all.filter((a) => a.category === filter);
  const highRisk = all.filter((a) => a.verdict === 'high-risk').length;

  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={styles.content}>
      <PageHeader title="Historikk" subtitle="Annonsene du har sjekket. De lagres bare på denne telefonen." />

      {all.length > 0 && (
        <View style={styles.stats}>
          <Stat value={all.length} label="sjekket" />
          <Stat value={highRisk} label="høy risiko" tone={highRisk > 0 ? 'high' : undefined} />
          <Stat value={all.reduce((n, a) => n + a.flags.filter((f) => f.severity !== 'low').length, 0)} label="faresignaler" />
        </View>
      )}

      <FilterChips<Filter>
        value={filter}
        onChange={setFilter}
        options={[
          { key: 'all', label: 'Alle', count: all.length },
          ...CATEGORY_ORDER.map((c) => ({
            key: c,
            label: CATEGORIES[c].label,
            icon: CATEGORIES[c].icon,
            count: all.filter((a) => a.category === c).length,
          })),
        ]}
      />

      {saved !== null && shown.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: t.card, borderColor: t.border }]}>
          <View style={[styles.emptyIcon, { backgroundColor: t.brandSoft }]}>
            <Ionicons name={filter === 'all' ? 'time-outline' : CATEGORIES[filter].icon} size={26} color={t.brand} />
          </View>
          <Text style={[styles.emptyTitle, { color: t.text }]}>
            {filter === 'all' ? 'Ingen sjekker ennå' : `Ingen ${CATEGORIES[filter].label.toLowerCase()}annonser ennå`}
          </Text>
          <Text style={[styles.emptyText, { color: t.muted }]}>Annonsene du sjekker havner her, så du kan finne dem igjen og sammenligne.</Text>
          <SecondaryButton label="Sjekk en annonse" icon="shield-checkmark-outline" onPress={() => router.navigate('/')} style={{ marginTop: 8 }} />
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {shown.map((a) => (
            <SavedCard key={a.id} a={a} onPress={() => router.push({ pathname: '/analysis/[id]', params: { id: a.id } })} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function Stat({ value, label, tone }: { value: number; label: string; tone?: 'high' }) {
  const t = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: tone ? t.highBg : t.card }]}>
      <Text style={[styles.statValue, { color: tone ? t.high : t.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: tone ? t.high : t.muted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingBottom: 32, gap: 16, maxWidth: 640, width: '100%', alignSelf: 'center' },
  stats: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, borderRadius: 18, padding: 14, gap: 2 },
  statValue: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  statLabel: { fontSize: 13, fontWeight: '600' },
  empty: { alignItems: 'center', padding: 28, borderRadius: 20, borderWidth: 1, borderStyle: 'dashed', gap: 6 },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  emptyTitle: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20, maxWidth: 280 },
});
