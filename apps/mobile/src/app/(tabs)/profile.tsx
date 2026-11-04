import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState, type ComponentProps } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PageHeader } from '@/components/page-header';
import { clearSaved, listSaved } from '@/services/saved';
import { shadow, useTheme, type Theme } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

// Alert.alert with buttons does nothing on web, so fall back to the browser's confirm there.
function confirm(title: string, message: string, action: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  return new Promise((resolve) =>
    Alert.alert(title, message, [
      { text: 'Avbryt', style: 'cancel', onPress: () => resolve(false) },
      { text: action, style: 'destructive', onPress: () => resolve(true) },
    ]),
  );
}

export default function ProfileScreen() {
  const t = useTheme();
  const [count, setCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      void listSaved().then((all) => setCount(all.length));
    }, []),
  );

  const checks = `${count} ${count === 1 ? 'sjekk' : 'sjekker'}`;

  const clearAll = async () => {
    const ok = await confirm('Slette all historikk?', `${checks} slettes fra denne telefonen. Dette kan ikke angres.`, 'Slett');
    if (!ok) return;
    await clearSaved();
    setCount(0);
  };

  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={styles.content}>
      <PageHeader title="Profil" />

      <View style={[styles.banner, { backgroundColor: t.brandSoft }]}>
        <View style={[styles.avatar, { backgroundColor: t.brand }]}>
          <Ionicons name="person" size={26} color={t.onBrand} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[styles.bannerTitle, { color: t.text }]}>Gjestebruker</Text>
          <Text style={[styles.bannerText, { color: t.muted }]}>Innlogging kommer snart, så du kan ta med sjekkene dine til en ny telefon.</Text>
        </View>
      </View>

      <Group t={t} title="Personvern">
        <Row t={t} icon="phone-portrait-outline" title="Historikken ligger på telefonen" text="Resultatene lagres bare på denne enheten, ikke hos oss." />
        <Row
          t={t}
          icon="cloud-upload-outline"
          title="Hva sendes for analyse"
          text="Annonsen du sjekker sendes til serveren vår og en AI-tjeneste (Google Gemini) for å bli lest. Ikke lim inn egne personopplysninger."
        />
      </Group>

      <Group t={t} title="Data">
        <Pressable onPress={clearAll} disabled={count === 0} accessibilityRole="button" style={({ pressed }) => ({ opacity: count === 0 ? 0.5 : pressed ? 0.7 : 1 })}>
          <Row t={t} icon="trash-outline" title="Slett all historikk" text={count ? `${checks} lagret` : 'Ingen sjekker lagret'} danger />
        </Pressable>
      </Group>

      <Group t={t} title="Om Listly">
        <Row t={t} icon="information-circle-outline" title="Faresignaler, ikke garantier" text="Listly hjelper deg å oppdage svindel, men kan ikke garantere at en annonse er ekte. Møt alltid selgeren før du betaler." />
        <Row t={t} icon="code-slash-outline" title="Versjon" text={`${Constants.expoConfig?.version ?? '0.1.0'} (prototype)`} />
      </Group>
    </ScrollView>
  );
}

function Group({ t, title, children }: { t: Theme; title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={[styles.groupTitle, { color: t.faint }]}>{title}</Text>
      <View style={[styles.group, { backgroundColor: t.card }, shadow(t)]}>{children}</View>
    </View>
  );
}

function Row({ t, icon, title, text, danger }: { t: Theme; icon: IconName; title: string; text: string; danger?: boolean }) {
  const color = danger ? t.high : t.brand;
  return (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: danger ? t.highBg : t.brandSoft }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.rowTitle, { color: danger ? t.high : t.text }]}>{title}</Text>
        <Text style={[styles.rowText, { color: t.muted }]}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingBottom: 32, gap: 20, maxWidth: 640, width: '100%', alignSelf: 'center' },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 20 },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  bannerTitle: { fontSize: 17, fontWeight: '800' },
  bannerText: { fontSize: 13, lineHeight: 18 },
  groupTitle: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, marginLeft: 4 },
  group: { borderRadius: 20, padding: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10 },
  rowIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 15, fontWeight: '700' },
  rowText: { fontSize: 13, lineHeight: 18 },
});
