import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState, type ComponentProps } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryButton, SecondaryButton } from '@/components/buttons';
import { SavedCard } from '@/components/saved-card';
import { CATEGORIES, CATEGORY_ORDER } from '@/categories';
import { setPendingInput } from '@/services/pending';
import { listSaved } from '@/services/saved';
import type { Category, SavedAnalysis } from '@/services/types';
import { shadow, useTheme } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

const CATEGORY_KEY = 'listly.category';
const RECENT = 3;

const STEPS: { icon: IconName; title: string; text: string }[] = [
  { icon: 'clipboard-outline', title: 'Lim inn', text: 'Lenke, tekst eller skjermbilde' },
  { icon: 'scan-outline', title: 'Vi sjekker', text: 'Fakta og svindelmønstre' },
  { icon: 'shield-checkmark-outline', title: 'Du vet mer', text: 'Faresignaler og neste steg' },
];

export default function CheckScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [category, setCategory] = useState<Category>('rental');
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedAnalysis[]>([]);
  const cat = CATEGORIES[category];

  // Remember what the user checks most, so a car hunter does not have to switch every time.
  useEffect(() => {
    AsyncStorage.getItem(CATEGORY_KEY)
      .then((c) => {
        if (c === 'rental' || c === 'car') setCategory(c);
      })
      .catch(() => {});
  }, []);

  const pickCategory = (c: Category) => {
    setCategory(c);
    setError(null);
    AsyncStorage.setItem(CATEGORY_KEY, c).catch(() => {});
  };

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
    setPendingInput(/^https?:\/\/\S+$/.test(input) ? { url: input, category } : { text: input, category });
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
    setPendingInput({ image: { base64, mimeType: asset.mimeType ?? 'image/jpeg' }, category });
    router.push('/analyze');
  };

  const recent = saved.slice(0, RECENT);

  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={{ paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
      <LinearGradient colors={t.brandGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, { paddingTop: insets.top + 20 }]}>
        <View style={styles.inner}>
          <View style={styles.logoRow}>
            <View style={styles.logo}>
              <Ionicons name="shield-checkmark" size={18} color="#4C3FE0" />
            </View>
            <Text style={styles.wordmark}>Listly</Text>
          </View>

          <View style={styles.segment} accessibilityRole="tablist">
            {CATEGORY_ORDER.map((key) => {
              const c = CATEGORIES[key];
              const active = key === category;
              return (
                <Pressable
                  key={key}
                  onPress={() => pickCategory(key)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  style={[styles.segmentItem, active && styles.segmentActive]}
                >
                  <Ionicons name={c.icon} size={17} color={active ? '#4C3FE0' : '#FFFFFF'} />
                  <Text style={[styles.segmentText, { color: active ? '#4C3FE0' : '#FFFFFF' }]}>{c.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.headline}>{cat.headline}</Text>
          <Text style={styles.subhead}>{cat.subhead}</Text>
          <View style={styles.chips}>
            {cat.sites.map((name) => (
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
              placeholder={cat.placeholder}
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

          <PrimaryButton label={category === 'car' ? 'Sjekk bilen' : 'Sjekk annonsen'} icon="shield-checkmark" onPress={submit} />

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

        {recent.length > 0 && (
          <>
            <View style={styles.sectionHead}>
              <Text style={[styles.section, { color: t.text }]}>Siste sjekker</Text>
              {saved.length > RECENT && (
                <Pressable onPress={() => router.push('/history')} hitSlop={8} accessibilityRole="link">
                  <Text style={[styles.seeAll, { color: t.brand }]}>Se alle ({saved.length})</Text>
                </Pressable>
              )}
            </View>
            <View style={{ gap: 10 }}>
              {recent.map((a) => (
                <SavedCard key={a.id} a={a} onPress={() => router.push({ pathname: '/analysis/[id]', params: { id: a.id } })} />
              ))}
            </View>
          </>
        )}

        <Pressable
          onPress={() => router.push('/learn')}
          accessibilityRole="link"
          style={({ pressed }) => [styles.learnCard, { backgroundColor: t.card, transform: [{ scale: pressed ? 0.985 : 1 }] }, shadow(t)]}
        >
          <View style={[styles.learnIcon, { backgroundColor: t.highBg }]}>
            <Ionicons name="school" size={22} color={t.high} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[styles.learnTitle, { color: t.text }]}>Kjenn igjen svindel</Text>
            <Text style={[styles.learnText, { color: t.muted }]}>De vanligste triksene for {cat.label.toLowerCase()}, forklart på ett minutt.</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={t.faint} />
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  inner: { paddingHorizontal: 16, maxWidth: 640, width: '100%', alignSelf: 'center' },
  hero: { paddingBottom: 84, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
  logo: { width: 34, height: 34, borderRadius: 11, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  wordmark: { color: '#FFFFFF', fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  segment: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 999, padding: 4, alignSelf: 'flex-start', marginBottom: 20 },
  segmentItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 18, paddingVertical: 9, borderRadius: 999 },
  segmentActive: { backgroundColor: '#FFFFFF' },
  segmentText: { fontSize: 15, fontWeight: '700' },
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
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 32, marginBottom: 12 },
  section: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  seeAll: { fontSize: 14, fontWeight: '700' },
  learnCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 20, marginTop: 24 },
  learnIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  learnTitle: { fontSize: 16, fontWeight: '700' },
  learnText: { fontSize: 13, lineHeight: 18 },
});
