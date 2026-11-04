import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState, type ComponentProps } from 'react';
import { Linking, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SecondaryButton } from '@/components/buttons';
import { ScoreBadge } from '@/components/score-badge';
import { CATEGORIES, listingTitle } from '@/categories';
import { getSaved, removeSaved } from '@/services/saved';
import type { Flag, SavedAnalysis, Severity } from '@/services/types';
import {
  formatMoney,
  severityColors,
  shadow,
  useTheme,
  VERDICT_GRADIENT,
  VERDICT_ICON,
  VERDICT_LABEL,
  type Theme,
} from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

const SEVERITY_LABEL: Record<Severity, string> = { high: 'Alvorlig', medium: 'Vær obs', low: 'Mangler info' };
const SEVERITY_ICON: Record<Severity, IconName> = { high: 'warning', medium: 'alert-circle', low: 'help-circle' };
const ORDER: Severity[] = ['high', 'medium', 'low'];

const VERDICT_LINE = {
  'looks-ok': 'Vi fant ingen alvorlige faresignaler. Gjør likevel de vanlige sjekkene under.',
  'check-carefully': 'Noe bør avklares før du går videre. Se hva vi fant under.',
  'high-risk': 'Denne annonsen har tydelige tegn på svindel. Ikke send penger.',
} as const;

// Concrete things to do next, built from what we found. Kept on the device:
// it is plain logic over the analysis, not something the AI decides.
function nextSteps(a: SavedAnalysis): string[] {
  const steps: string[] = [];
  if (a.verdict === 'high-risk') {
    steps.push(
      a.category === 'car'
        ? 'Ikke send penger, heller ikke «forskudd» eller «frakt», før du har sett og prøvekjørt bilen.'
        : 'Ikke send penger eller ID før du har møtt utleier og sett boligen.',
    );
    steps.push('Søk opp bildene med Google Lens. Svindlere bruker ofte bilder fra andre annonser.');
    steps.push('Rapporter annonsen til nettstedet den ligger på.');
  } else {
    steps.push(a.category === 'car' ? 'Se bilen og prøvekjør den før du avtaler noe.' : 'Be om visning og møt utleier ansikt til ansikt.');
  }

  if (a.category === 'car') {
    const f = a.facts;
    const missing = [
      f.price === null && 'pris',
      f.regNumber === null && 'registreringsnummer',
      f.mileageKm === null && 'kilometerstand',
      f.year === null && 'årsmodell',
    ].filter(Boolean) as string[];
    if (missing.length) steps.push(`Spør selgeren om det som mangler: ${missing.join(', ')}.`);
    steps.push(
      f.regNumber
        ? `Slå opp ${f.regNumber.toUpperCase()} hos Statens vegvesen og sjekk at modell og årgang stemmer med annonsen.`
        : 'Sjekk registreringsnummeret hos Statens vegvesen: stemmer modell og årgang med annonsen?',
    );
    // Paperwork only matters once the listing looks real.
    if (a.verdict !== 'high-risk') {
      steps.push('Sjekk at bilen ikke har heftelser (gjeld) i Løsøreregisteret før du betaler.');
      steps.push('Bruk en skriftlig kontrakt, for eksempel Statens vegvesens kjøpekontrakt, og betal gjennom en sikker løsning.');
    }
    return steps;
  }

  const f = a.facts;
  const missing = [f.price === null && 'pris', f.deposit === null && 'depositum', f.address === null && 'adresse', f.sizeM2 === null && 'størrelse'].filter(
    Boolean,
  ) as string[];
  if (missing.length) steps.push(`Spør utleier om det som mangler: ${missing.join(', ')}.`);
  if (f.currency === 'NOK') {
    steps.push('Depositum skal stå på en egen depositumskonto i ditt navn, aldri på utleiers konto.');
    steps.push('Skriv kontrakt før innflytting, for eksempel Forbrukerrådets husleiekontrakt.');
  } else if (f.currency === 'GBP') {
    steps.push('Depositum skal beskyttes i en godkjent ordning (DPS, TDS eller mydeposits).');
  }
  return steps;
}

export default function AnalysisScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [analysis, setAnalysis] = useState<SavedAnalysis | null | undefined>(undefined);

  useEffect(() => {
    void getSaved(id).then(setAnalysis);
  }, [id]);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  if (analysis === undefined) return <View style={{ flex: 1, backgroundColor: t.bg }} />;
  if (analysis === null) {
    return (
      <View style={[styles.center, { backgroundColor: t.bg }]}>
        <Text style={{ color: t.muted, fontSize: 15 }}>Fant ikke denne analysen.</Text>
        <SecondaryButton label="Til forsiden" icon="home-outline" onPress={() => router.replace('/')} />
      </View>
    );
  }

  const price = formatMoney(analysis.facts.price, analysis.facts.currency);
  const priceUnit = analysis.category === 'rental' ? '/mnd' : '';
  const flags = ORDER.flatMap((s) => analysis.flags.filter((f) => f.severity === s));
  const title = listingTitle(analysis);

  let tiles: { icon: IconName; label: string; value: string | null }[];
  let location: string;
  let infoRows: { icon: IconName; label: string; value: string }[];
  if (analysis.category === 'car') {
    const f = analysis.facts;
    tiles = [
      { icon: 'cash-outline', label: 'Pris', value: price },
      { icon: 'calendar-outline', label: 'Årsmodell', value: f.year ? String(f.year) : null },
      { icon: 'speedometer-outline', label: 'Kilometer', value: f.mileageKm !== null ? `${new Intl.NumberFormat('nb-NO').format(f.mileageKm)} km` : null },
      { icon: 'card-outline', label: 'Regnr.', value: f.regNumber?.toUpperCase() ?? null },
      { icon: 'flash-outline', label: 'Drivstoff', value: f.fuel },
      { icon: 'cog-outline', label: 'Girkasse', value: f.gearbox },
    ];
    location = f.location ?? '';
    infoRows = [
      f.make || f.model ? { icon: 'car-sport-outline' as const, label: 'Bil', value: [f.make, f.model].filter(Boolean).join(' ') } : null,
      f.seller ? { icon: 'person-outline' as const, label: 'Selger', value: f.seller } : null,
      f.platform ? { icon: 'globe-outline' as const, label: 'Kilde', value: f.platform } : null,
    ].filter((r) => r !== null);
  } else {
    const f = analysis.facts;
    tiles = [
      { icon: 'cash-outline', label: 'Pris', value: price && `${price}/mnd` },
      { icon: 'wallet-outline', label: 'Depositum', value: formatMoney(f.deposit, f.currency) },
      { icon: 'resize-outline', label: 'Størrelse', value: f.sizeM2 ? `${f.sizeM2} m²` : null },
      { icon: 'bed-outline', label: 'Rom', value: f.rooms ? String(f.rooms) : null },
      { icon: 'calendar-outline', label: 'Ledig fra', value: f.availableFrom },
      { icon: 'globe-outline', label: 'Kilde', value: f.platform },
    ];
    location = [f.address, f.city].filter(Boolean).join(', ');
    infoRows = [
      f.billsIncluded.length ? { icon: 'flash-outline' as const, label: 'Inkludert', value: f.billsIncluded.join(', ') } : null,
      f.contact ? { icon: 'person-outline' as const, label: 'Kontakt', value: f.contact } : null,
    ].filter((r) => r !== null);
  }

  const share = async () => {
    const lines = [
      `Listly-sjekk: ${title}`,
      `${VERDICT_LABEL[analysis.verdict]} (${analysis.score}/100)`,
      ...flags.filter((f) => f.severity !== 'low').map((f) => `• ${f.title}`),
      analysis.sourceUrl ?? '',
    ].filter(Boolean);
    try {
      await Share.share({ message: lines.join('\n') });
    } catch {
      // Sharing is not supported in every browser; nothing useful to tell the user.
    }
  };

  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
      <LinearGradient
        colors={VERDICT_GRADIENT[analysis.verdict]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: insets.top + 8 }]}
      >
        <View style={styles.inner}>
          <View style={styles.topBar}>
            <Pressable onPress={goBack} hitSlop={8} accessibilityRole="button" accessibilityLabel="Tilbake" style={styles.roundBtn}>
              <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
            </Pressable>
            <Pressable onPress={share} hitSlop={8} accessibilityRole="button" accessibilityLabel="Del resultatet" style={styles.roundBtn}>
              <Ionicons name="share-social-outline" size={20} color="#FFFFFF" />
            </Pressable>
          </View>

          <View style={styles.heroBody}>
            <ScoreBadge score={analysis.score} verdict={analysis.verdict} size={112} onColor animate />
            <View style={styles.verdictPill}>
              <Ionicons name={VERDICT_ICON[analysis.verdict]} size={15} color="#FFFFFF" />
              <Text style={styles.verdictText}>{VERDICT_LABEL[analysis.verdict]}</Text>
            </View>
            <Text style={styles.heroLine}>{VERDICT_LINE[analysis.verdict]}</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.inner}>
        <View style={[styles.listingCard, { backgroundColor: t.card }, shadow(t, 2)]}>
          <View style={styles.catRow}>
            <Ionicons name={CATEGORIES[analysis.category].icon} size={13} color={t.brand} />
            <Text style={[styles.catText, { color: t.brand }]}>{CATEGORIES[analysis.category].label}</Text>
          </View>
          <Text style={[styles.listingTitle, { color: t.text }]} numberOfLines={2}>
            {title}
          </Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={15} color={location ? t.muted : t.high} />
            <Text style={[styles.location, { color: location ? t.muted : t.high }]} numberOfLines={1}>
              {location || (analysis.category === 'car' ? 'Sted ikke oppgitt' : 'Adresse ikke oppgitt')}
            </Text>
          </View>
          {price && (
            <Text style={[styles.price, { color: t.text }]}>
              {price}
              {!!priceUnit && <Text style={[styles.priceUnit, { color: t.muted }]}> {priceUnit}</Text>}
            </Text>
          )}
          {!!analysis.summary && (
            <View style={[styles.summary, { backgroundColor: t.brandSoft }]}>
              <Ionicons name="sparkles" size={16} color={t.brand} style={{ marginTop: 2 }} />
              <Text style={[styles.summaryText, { color: t.text }]}>{analysis.summary}</Text>
            </View>
          )}
        </View>

        <SectionTitle t={t} title="Faresignaler" count={flags.length} />
        {flags.length === 0 ? (
          <View style={[styles.allClear, { backgroundColor: t.okBg }]}>
            <Ionicons name="checkmark-circle" size={22} color={t.ok} />
            <Text style={[styles.allClearText, { color: t.ok }]}>Vi fant ingen faresignaler i denne annonsen.</Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {flags.map((f, i) => (
              <FlagCard key={i} flag={f} t={t} />
            ))}
          </View>
        )}

        <SectionTitle t={t} title="Neste steg" />
        <View style={[styles.card, { backgroundColor: t.card }, shadow(t)]}>
          {nextSteps(analysis).map((s, i) => (
            <View key={i} style={styles.nextRow}>
              <View style={[styles.nextNum, { backgroundColor: t.brandSoft }]}>
                <Text style={[styles.nextNumText, { color: t.brand }]}>{i + 1}</Text>
              </View>
              <Text style={[styles.nextText, { color: t.text }]}>{s}</Text>
            </View>
          ))}
        </View>

        <SectionTitle t={t} title="Fakta fra annonsen" />
        <View style={styles.tiles}>
          {tiles.map((tile) => (
            <View key={tile.label} style={[styles.tile, { backgroundColor: t.card }, shadow(t)]}>
              <Ionicons name={tile.icon} size={18} color={tile.value ? t.brand : t.faint} />
              <Text style={[styles.tileLabel, { color: t.muted }]}>{tile.label}</Text>
              <Text style={[styles.tileValue, { color: tile.value ? t.text : t.faint }]} numberOfLines={2}>
                {tile.value ?? 'Ikke oppgitt'}
              </Text>
            </View>
          ))}
        </View>
        {infoRows.length > 0 && (
          <View style={[styles.card, { backgroundColor: t.card, marginTop: 10 }, shadow(t)]}>
            {infoRows.map((r) => (
              <InfoRow key={r.label} t={t} icon={r.icon} label={r.label} value={r.value} />
            ))}
          </View>
        )}

        <View style={styles.actions}>
          {analysis.sourceUrl && (
            <SecondaryButton label="Åpne annonsen" icon="open-outline" onPress={() => void Linking.openURL(analysis.sourceUrl!)} style={{ flex: 1 }} />
          )}
          <SecondaryButton label="Del" icon="share-social-outline" onPress={share} style={{ flex: analysis.sourceUrl ? 0 : 1 }} />
        </View>

        <View style={[styles.disclaimer, { backgroundColor: t.cardAlt }]}>
          <Ionicons name="information-circle-outline" size={18} color={t.muted} />
          <Text style={[styles.disclaimerText, { color: t.muted }]}>
            {analysis.category === 'car'
              ? 'Listly viser faresignaler, ikke en garanti. Se og prøvekjør alltid bilen og skriv kontrakt før du betaler noe.'
              : 'Listly viser faresignaler, ikke en garanti. Møt alltid utleier, se boligen og skriv kontrakt før du betaler noe.'}
          </Text>
        </View>

        <Pressable
          onPress={async () => {
            await removeSaved(analysis.id);
            goBack();
          }}
          style={styles.remove}
          accessibilityRole="button"
        >
          <Ionicons name="trash-outline" size={16} color={t.faint} />
          <Text style={{ color: t.faint, fontWeight: '600' }}>Fjern fra listen</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function SectionTitle({ t, title, count }: { t: Theme; title: string; count?: number }) {
  return (
    <View style={styles.sectionHead}>
      <Text style={[styles.section, { color: t.text }]}>{title}</Text>
      {!!count && (
        <View style={[styles.countPill, { backgroundColor: t.cardAlt }]}>
          <Text style={[styles.countText, { color: t.muted }]}>{count}</Text>
        </View>
      )}
    </View>
  );
}

function InfoRow({ t, icon, label, value }: { t: Theme; icon: IconName; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={17} color={t.brand} />
      <Text style={[styles.infoLabel, { color: t.muted }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: t.text }]}>{value}</Text>
    </View>
  );
}

function FlagCard({ flag, t }: { flag: Flag; t: Theme }) {
  const c = severityColors(t, flag.severity);
  return (
    <View style={[styles.flag, { backgroundColor: t.card }, shadow(t)]}>
      <View style={[styles.flagIcon, { backgroundColor: c.bg }]}>
        <Ionicons name={SEVERITY_ICON[flag.severity]} size={20} color={c.fg} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <View style={styles.flagHead}>
          <Text style={[styles.flagSeverity, { color: c.fg }]}>{SEVERITY_LABEL[flag.severity]}</Text>
          <View style={[styles.tag, { backgroundColor: t.cardAlt }]}>
            <Ionicons name={flag.source === 'rule' ? 'git-branch-outline' : 'sparkles-outline'} size={10} color={t.muted} />
            <Text style={[styles.tagText, { color: t.muted }]}>{flag.source === 'rule' ? 'Regel' : 'AI'}</Text>
          </View>
        </View>
        <Text style={[styles.flagTitle, { color: t.text }]}>{flag.title}</Text>
        <Text style={[styles.flagDetail, { color: t.muted }]}>{flag.detail}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  inner: { paddingHorizontal: 16, maxWidth: 640, width: '100%', alignSelf: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  hero: { paddingBottom: 64, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between' },
  roundBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  heroBody: { alignItems: 'center', gap: 12, marginTop: 4 },
  verdictPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
  },
  verdictText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  heroLine: { color: 'rgba(255,255,255,0.92)', fontSize: 15, lineHeight: 22, textAlign: 'center', maxWidth: 320 },
  listingCard: { marginTop: -40, borderRadius: 24, padding: 18, gap: 6 },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  catText: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 },
  listingTitle: { fontSize: 19, fontWeight: '800', letterSpacing: -0.3, lineHeight: 25 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  location: { fontSize: 14, flex: 1 },
  price: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, marginTop: 4 },
  priceUnit: { fontSize: 15, fontWeight: '600' },
  summary: { flexDirection: 'row', gap: 8, padding: 12, borderRadius: 14, marginTop: 8 },
  summaryText: { fontSize: 14, lineHeight: 21, flex: 1 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 28, marginBottom: 12 },
  section: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  countPill: { paddingHorizontal: 9, paddingVertical: 2, borderRadius: 999 },
  countText: { fontSize: 13, fontWeight: '800' },
  allClear: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 16 },
  allClearText: { fontSize: 15, fontWeight: '600', flex: 1 },
  flag: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: 18 },
  flagIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  flagHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  flagSeverity: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
  tagText: { fontSize: 11, fontWeight: '700' },
  flagTitle: { fontSize: 15, fontWeight: '700' },
  flagDetail: { fontSize: 14, lineHeight: 20 },
  card: { borderRadius: 20, padding: 16, gap: 14 },
  nextRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  nextNum: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  nextNumText: { fontSize: 13, fontWeight: '800' },
  nextText: { fontSize: 15, lineHeight: 22, flex: 1 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: '48%', flexGrow: 1, borderRadius: 18, padding: 14, gap: 4 },
  tileLabel: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  tileValue: { fontSize: 15, fontWeight: '700' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoLabel: { fontSize: 14, width: 72 },
  infoValue: { fontSize: 14, fontWeight: '600', flex: 1 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 24 },
  disclaimer: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: 16, marginTop: 16 },
  disclaimerText: { fontSize: 13, lineHeight: 19, flex: 1 },
  remove: { flexDirection: 'row', gap: 6, alignItems: 'center', alignSelf: 'center', padding: 12, marginTop: 8 },
});
