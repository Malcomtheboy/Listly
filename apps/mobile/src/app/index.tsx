import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState, type ComponentProps } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryButton, SecondaryButton } from '@/components/buttons';
import { ScoreBadge } from '@/components/score-badge';
import { setPendingInput } from '@/services/pending';
import { listSaved } from '@/services/saved';
import type { SavedAnalysis } from '@/services/types';
import { formatMoney, shadow, timeAgo, useTheme, VERDICT_LABEL, verdictColors, type Theme } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

const STEPS: { icon: IconName; title: string; text: string }[] = [
  { icon: 'clipboard-outline', title: 'Lim inn', text: 'Lenke, tekst eller skjermbilde' },
  { icon: 'scan-outline', title: 'Vi sjekker', text: 'Fakta og svindelmønstre' },
  { icon: 'shield-checkmark-outline', title: 'Du vet mer', text: 'Faresignaler og neste steg' },
];

const SCAM_TIPS: { icon: IconName; title: string; text: string }[] = [
  { icon: 'airplane-outline', title: 'Utleier er «i utlandet»', text: 'Vil sende nøklene i posten etter at du har betalt.' },
  { icon: 'cash-outline', title: 'Betal før visning', text: 'Ekte utleiere lar deg se boligen før du betaler noe.' },
  { icon: 'pricetag-outline', title: 'For god til å være sann', text: 'Mye lavere pris enn resten av området er et rødt flagg.' },
  { icon: 'card-outline', title: 'Depositum til privat konto', text: 'I Norge skal depositum stå på egen depositumskonto.' },
];

export default function Home() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedAnalysis[]>([]);

  useFocusEffect(
    useCallback(() => {
      void listSaved().then(setSaved);
    }, []),
  );

  const submit = () => {
    const input = value.trim();
    if (!input) {
      setError('Lim inn en lenke eller teksten fra annonsen først.');
      return;
    }
    setError(null);
    setPendingInput(/^https?:\/\/\S+$/.test(input) ? { url: input } : { text: input });
    setValue('');
    router.push('/analyze');
  };

  const paste = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (text) {
        setValue(text);
        setError(null);
      } else {
        setError('Utklippstavlen er tom. Kopier lenken til annonsen først.');
      }
    } catch {
      setError('Fikk ikke lest utklippstavlen. Lim inn manuelt.');
    }
  };

  const pickScreenshot = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], base64: true, quality: 0.6 });
    if (result.canceled) return;
    const asset = result.assets[0];
    // Web returns a data: URI; native returns base64 when asked.
    const base64 = asset.base64 ?? asset.uri.split(',')[1];
    if (!base64) {
      setError('Klarte ikke å lese bildet. Prøv et annet skjermbilde.');
      return;
    }
    setError(null);
    setPendingInput({ image: { base64, mimeType: asset.mimeType ?? 'image/jpeg' } });
    router.push('/analyze');
  };

  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
      <LinearGradient colors={t.brandGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, { paddingTop: insets.top + 20 }]}>
        <View style={styles.inner}>
          <View style={styles.logoRow}>
            <View style={styles.logo}>
              <Ionicons name="home" size={18} color="#4C3FE0" />
            </View>
            <Text style={styles.wordmark}>Listly</Text>
          </View>
          <Text style={styles.headline}>Er leieannonsen ekte?</Text>
          <Text style={styles.subhead}>Sjekk annonsen før du betaler noe. Vi finner faresignalene du lett overser.</Text>
          <View style={styles.chips}>
            {['Finn', 'Hybel', 'Facebook', 'Rightmove'].map((name) => (
              <View key={name} style={styles.chip}>
                <Text style={styles.chipText}>{name}</Text>
              </View>
            ))}
            <Text style={styles.chipMore}>+ alle andre</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.inner}>
        <View style={[styles.inputCard, { backgroundColor: t.card }, shadow(t, 2)]}>
          <View style={[styles.inputWrap, { backgroundColor: t.input, borderColor: focused ? t.brand : 'transparent' }]}>
            <TextInput
              value={value}
              onChangeText={(v) => {
                setValue(v);
                if (error) setError(null);
              }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Lim inn lenke eller annonsetekst…"
              placeholderTextColor={t.faint}
              multiline
              style={[styles.input, { color: t.text }]}
            />
            {value ? (
              <Pressable onPress={() => setValue('')} hitSlop={10} accessibilityLabel="Tøm feltet" style={styles.inputAction}>
                <Ionicons name="close-circle" size={22} color={t.faint} />
              </Pressable>
            ) : (
              <Pressable onPress={paste} style={[styles.pastePill, { backgroundColor: t.brandSoft }]} accessibilityRole="button">
                <Ionicons name="clipboard-outline" size={14} color={t.brand} />
                <Text style={[styles.pasteText, { color: t.brand }]}>Lim inn</Text>
              </Pressable>
            )}
          </View>

          {error && (
            <View style={[styles.errorRow, { backgroundColor: t.highBg }]}>
              <Ionicons name="information-circle" size={16} color={t.high} />
              <Text style={[styles.errorText, { color: t.high }]}>{error}</Text>
            </View>
          )}

          <PrimaryButton label="Sjekk annonsen" icon="shield-checkmark" onPress={submit} />

          <View style={styles.orRow}>
            <View style={[styles.orLine, { backgroundColor: t.border }]} />
            <Text style={[styles.orText, { color: t.faint }]}>eller</Text>
            <View style={[styles.orLine, { backgroundColor: t.border }]} />
          </View>

          <SecondaryButton label="Last opp skjermbilde" icon="image-outline" onPress={pickScreenshot} />
        </View>

        <View style={styles.steps}>
          {STEPS.map((s, i) => (
            <View key={s.title} style={styles.step}>
              <View style={[styles.stepIcon, { backgroundColor: t.brandSoft }]}>
                <Ionicons name={s.icon} size={20} color={t.brand} />
                <View style={[styles.stepNum, { backgroundColor: t.brand, borderColor: t.bg }]}>
                  <Text style={styles.stepNumText}>{i + 1}</Text>
                </View>
              </View>
              <Text style={[styles.stepTitle, { color: t.text }]}>{s.title}</Text>
              <Text style={[styles.stepText, { color: t.muted }]}>{s.text}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionHead}>
          <Text style={[styles.section, { color: t.text }]}>Dine sjekker</Text>
          {saved.length > 0 && <Text style={[styles.count, { color: t.muted }]}>{saved.length}</Text>}
        </View>

        {saved.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: t.card, borderColor: t.border }]}>
            <View style={[styles.emptyIcon, { backgroundColor: t.brandSoft }]}>
              <Ionicons name="search" size={26} color={t.brand} />
            </View>
            <Text style={[styles.emptyTitle, { color: t.text }]}>Ingen annonser sjekket ennå</Text>
            <Text style={[styles.emptyText, { color: t.muted }]}>Annonsene du sjekker lagres her, så du kan sammenligne dem senere.</Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {saved.map((a) => (
              <SavedCard key={a.id} a={a} t={t} onPress={() => router.push({ pathname: '/analysis/[id]', params: { id: a.id } })} />
            ))}
          </View>
        )}

        <Text style={[styles.section, { color: t.text, marginTop: 28 }]}>Kjenn igjen svindel</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tipsRow}>
        {SCAM_TIPS.map((tip) => (
          <View key={tip.title} style={[styles.tipCard, { backgroundColor: t.card, borderColor: t.border }]}>
            <View style={[styles.tipIcon, { backgroundColor: t.highBg }]}>
              <Ionicons name={tip.icon} size={18} color={t.high} />
            </View>
            <Text style={[styles.tipTitle, { color: t.text }]}>{tip.title}</Text>
            <Text style={[styles.tipText, { color: t.muted }]}>{tip.text}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.inner}>
        <View style={[styles.shareHint, { backgroundColor: t.cardAlt }]}>
          <Ionicons name="share-outline" size={18} color={t.brand} />
          <Text style={[styles.shareHintText, { color: t.muted }]}>
            <Text style={{ color: t.text, fontWeight: '700' }}>Tips: </Text>
            Trykk «Del» i Finn-appen eller nettleseren og velg Listly. Da slipper du å kopiere.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

function SavedCard({ a, t, onPress }: { a: SavedAnalysis; t: Theme; onPress: () => void }) {
  const vc = verdictColors(t, a.verdict);
  const price = formatMoney(a.facts.price, a.facts.currency);
  const meta = [a.facts.city, price && `${price}/mnd`].filter(Boolean).join(' · ');
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.savedCard, { backgroundColor: t.card, transform: [{ scale: pressed ? 0.985 : 1 }] }, shadow(t)]}
    >
      <ScoreBadge score={a.score} verdict={a.verdict} size={52} />
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={[styles.savedTitle, { color: t.text }]} numberOfLines={1}>
          {a.facts.title ?? a.facts.address ?? 'Boligannonse'}
        </Text>
        {!!meta && (
          <Text style={[styles.savedMeta, { color: t.muted }]} numberOfLines={1}>
            {meta}
          </Text>
        )}
        <View style={styles.savedFoot}>
          <View style={[styles.verdictChip, { backgroundColor: vc.bg }]}>
            <Text style={[styles.verdictChipText, { color: vc.fg }]}>{VERDICT_LABEL[a.verdict]}</Text>
          </View>
          <Text style={[styles.savedTime, { color: t.faint }]} numberOfLines={1}>
            {timeAgo(a.analyzedAt)}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={t.faint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  inner: { paddingHorizontal: 16, maxWidth: 640, width: '100%', alignSelf: 'center' },
  hero: { paddingBottom: 84, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 22 },
  logo: { width: 34, height: 34, borderRadius: 11, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  wordmark: { color: '#FFFFFF', fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  headline: { color: '#FFFFFF', fontSize: 32, fontWeight: '800', lineHeight: 38, letterSpacing: -0.8 },
  subhead: { color: 'rgba(255,255,255,0.85)', fontSize: 16, lineHeight: 23, marginTop: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 18 },
  chip: { backgroundColor: 'rgba(255,255,255,0.16)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  chipText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  chipMore: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '600', marginLeft: 2 },
  inputCard: { marginTop: -60, borderRadius: 24, padding: 16, gap: 12 },
  inputWrap: { borderRadius: 16, borderWidth: 1.5, flexDirection: 'row', alignItems: 'flex-start' },
  input: { flex: 1, minHeight: 92, padding: 14, fontSize: 16, lineHeight: 22, textAlignVertical: 'top', outlineStyle: 'none' } as never,
  inputAction: { padding: 12 },
  pastePill: { flexDirection: 'row', alignItems: 'center', gap: 4, margin: 10, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  pasteText: { fontSize: 13, fontWeight: '700' },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: 12 },
  errorText: { fontSize: 14, fontWeight: '500', flex: 1 },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  orLine: { flex: 1, height: 1 },
  orText: { fontSize: 13, fontWeight: '600' },
  steps: { flexDirection: 'row', gap: 8, marginTop: 28 },
  step: { flex: 1, alignItems: 'center', gap: 4 },
  stepIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  stepNum: { position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  stepTitle: { fontSize: 14, fontWeight: '700' },
  stepText: { fontSize: 12, textAlign: 'center', lineHeight: 16 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 32, marginBottom: 12 },
  section: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  count: { fontSize: 15, fontWeight: '700' },
  empty: { alignItems: 'center', padding: 28, borderRadius: 20, borderWidth: 1, borderStyle: 'dashed', gap: 6 },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20, maxWidth: 280 },
  savedCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 20 },
  savedTitle: { fontSize: 16, fontWeight: '700' },
  savedMeta: { fontSize: 14 },
  savedFoot: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 8, rowGap: 4, marginTop: 2 },
  verdictChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  verdictChipText: { fontSize: 12, fontWeight: '700' },
  savedTime: { fontSize: 12 },
  tipsRow: { paddingHorizontal: 16, gap: 10, paddingTop: 12, paddingBottom: 4 },
  tipCard: { width: 200, padding: 14, borderRadius: 18, borderWidth: 1, gap: 6 },
  tipIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  tipTitle: { fontSize: 14, fontWeight: '700' },
  tipText: { fontSize: 13, lineHeight: 18 },
  shareHint: { flexDirection: 'row', gap: 10, alignItems: 'center', padding: 14, borderRadius: 16, marginTop: 24 },
  shareHintText: { fontSize: 13, lineHeight: 19, flex: 1 },
});
