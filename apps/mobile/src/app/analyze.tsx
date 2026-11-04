import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '@/components/buttons';
import { analyzeListing } from '@/services/api';
import { clearPendingInput, peekPendingInput } from '@/services/pending';
import { saveAnalysis } from '@/services/saved';
import type { ListingInput, SavedAnalysis } from '@/services/types';
import { shadow, useTheme } from '@/theme';

// One request per input, even if the screen mounts twice (React dev mode) or re-renders.
const inFlight = new WeakMap<ListingInput, Promise<SavedAnalysis>>();

// Shown one after another while we wait. They describe what the server really does,
// but the timing is cosmetic: the last step stays active until the answer arrives.
const STEPS = ['Leser annonsen', 'Henter ut pris og fakta', 'Ser etter kjente svindelmønstre', 'Regner ut risiko'];

export default function Analyze() {
  const t = useTheme();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 4000);
    return () => {
      loop.stop();
      clearInterval(timer);
    };
  }, [pulse]);

  useEffect(() => {
    const input = peekPendingInput();
    if (!input) {
      setError('Fant ingen annonse å sjekke.');
      return;
    }
    let cancelled = false;
    let job = inFlight.get(input);
    if (!job) {
      job = analyzeListing(input).then(saveAnalysis);
      inFlight.set(input, job);
    }
    job.then(
      (saved) => {
        clearPendingInput(input);
        if (!cancelled) router.replace({ pathname: '/analysis/[id]', params: { id: saved.id } });
      },
      (e: unknown) => {
        clearPendingInput(input);
        if (!cancelled) setError(e instanceof Error ? e.message : 'Analysen feilet.');
      },
    );
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (error) {
    return (
      <View style={[styles.wrap, { backgroundColor: t.bg }]}>
        <View style={[styles.bigIcon, { backgroundColor: t.highBg }]}>
          <Ionicons name="cloud-offline-outline" size={36} color={t.high} />
        </View>
        <Text style={[styles.title, { color: t.text }]}>Det gikk ikke</Text>
        <Text style={[styles.body, { color: t.muted }]}>{error}</Text>
        <View style={{ alignSelf: 'stretch', maxWidth: 360, width: '100%', marginTop: 12 }}>
          <PrimaryButton label="Prøv igjen" icon="arrow-back" onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
  const ring = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] });

  return (
    <View style={[styles.wrap, { backgroundColor: t.bg }]}>
      <View style={styles.pulseBox}>
        <Animated.View style={[styles.pulseRing, { backgroundColor: t.brand, opacity: ring, transform: [{ scale: Animated.add(scale, 0.25) }] }]} />
        <Animated.View style={[styles.bigIcon, { backgroundColor: t.brand, transform: [{ scale }] }]}>
          <Ionicons name="scan" size={36} color={t.onBrand} />
        </Animated.View>
      </View>
      <Text style={[styles.title, { color: t.text }]}>Sjekker annonsen</Text>
      <Text style={[styles.body, { color: t.muted }]}>Dette kan ta opptil et halvt minutt.</Text>

      <View style={[styles.stepsCard, { backgroundColor: t.card }, shadow(t)]}>
        {STEPS.map((label, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <View key={label} style={styles.stepRow}>
              <View style={[styles.stepDot, { backgroundColor: done ? t.ok : active ? t.brandSoft : t.cardAlt }]}>
                {done ? (
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                ) : active ? (
                  <ActivityIndicator size="small" color={t.brand} />
                ) : null}
              </View>
              <Text style={[styles.stepText, { color: done || active ? t.text : t.faint, fontWeight: active ? '700' : '500' }]}>{label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10 },
  pulseBox: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  pulseRing: { position: 'absolute', width: 84, height: 84, borderRadius: 42 },
  bigIcon: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '800', textAlign: 'center', letterSpacing: -0.4 },
  body: { fontSize: 15, textAlign: 'center', lineHeight: 22, maxWidth: 340 },
  stepsCard: { marginTop: 20, borderRadius: 20, padding: 18, gap: 14, width: '100%', maxWidth: 360 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepDot: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontSize: 15, flex: 1 },
});
