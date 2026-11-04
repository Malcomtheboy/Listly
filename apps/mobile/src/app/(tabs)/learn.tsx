import { Ionicons } from '@expo/vector-icons';
import { useState, type ComponentProps } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { FilterChips } from '@/components/filter-chips';
import { PageHeader } from '@/components/page-header';
import { CATEGORIES, CATEGORY_ORDER } from '@/categories';
import type { Category } from '@/services/types';
import { shadow, useTheme } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

// What to do if it already went wrong. Same for every category.
const ALREADY_PAID: { icon: IconName; title: string; text: string }[] = [
  { icon: 'call-outline', title: 'Ring banken med en gang', text: 'Jo raskere banken får vite det, jo større sjanse for å stoppe eller hente tilbake betalingen.' },
  { icon: 'shield-outline', title: 'Anmeld til politiet', text: 'Du kan anmelde nettsvindel på politiet.no. Ta vare på annonsen, meldinger og kvitteringer.' },
  { icon: 'flag-outline', title: 'Rapporter annonsen', text: 'Meld fra til nettstedet annonsen lå på, så færre blir lurt.' },
];

export default function LearnScreen() {
  const t = useTheme();
  const [category, setCategory] = useState<Category>('rental');
  const cat = CATEGORIES[category];

  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={styles.content}>
      <PageHeader title="Lær" subtitle="De vanligste triksene svindlere bruker, og hva du gjør hvis det har skjedd." />

      <FilterChips<Category>
        value={category}
        onChange={setCategory}
        options={CATEGORY_ORDER.map((c) => ({ key: c, label: CATEGORIES[c].label, icon: CATEGORIES[c].icon }))}
      />

      <View style={{ gap: 10 }}>
        {cat.tips.map((tip, i) => (
          <View key={tip.title} style={[styles.tip, { backgroundColor: t.card }, shadow(t)]}>
            <View style={[styles.tipIcon, { backgroundColor: t.highBg }]}>
              <Ionicons name={tip.icon} size={20} color={t.high} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={[styles.tipNum, { color: t.faint }]}>Triks {i + 1}</Text>
              <Text style={[styles.tipTitle, { color: t.text }]}>{tip.title}</Text>
              <Text style={[styles.tipText, { color: t.muted }]}>{tip.text}</Text>
            </View>
          </View>
        ))}
      </View>

      <Text style={[styles.section, { color: t.text }]}>Har du allerede betalt?</Text>
      <View style={[styles.help, { backgroundColor: t.brandSoft }]}>
        {ALREADY_PAID.map((s, i) => (
          <View key={s.title} style={styles.helpRow}>
            <View style={[styles.helpNum, { backgroundColor: t.brand }]}>
              <Text style={styles.helpNumText}>{i + 1}</Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.helpTitle, { color: t.text }]}>{s.title}</Text>
              <Text style={[styles.helpText, { color: t.muted }]}>{s.text}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingBottom: 32, gap: 16, maxWidth: 640, width: '100%', alignSelf: 'center' },
  tip: { flexDirection: 'row', gap: 14, padding: 16, borderRadius: 20 },
  tipIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  tipNum: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 },
  tipTitle: { fontSize: 16, fontWeight: '700' },
  tipText: { fontSize: 14, lineHeight: 20 },
  section: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3, marginTop: 12 },
  help: { borderRadius: 20, padding: 16, gap: 16 },
  helpRow: { flexDirection: 'row', gap: 12 },
  helpNum: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  helpNumText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  helpTitle: { fontSize: 15, fontWeight: '700' },
  helpText: { fontSize: 14, lineHeight: 20 },
});
