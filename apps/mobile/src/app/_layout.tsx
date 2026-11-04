import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';
import { ShareIntentProvider, useShareIntentContext } from 'expo-share-intent';
import { File } from 'expo-file-system';
import { setPendingInput } from '@/services/pending';
import { useTheme } from '@/theme';

// The share extension only exists in a dev/production build. On web and in
// Expo Go the native module is missing, so switch the hook off instead of crashing.
const shareIntentAvailable = Platform.OS !== 'web' && requireOptionalNativeModule('ExpoShareIntentModule') !== null;

// "Del → Listly" from Finn, Safari, Facebook etc. lands here and goes straight to analysis.
function ShareHandler() {
  const router = useRouter();
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();

  useEffect(() => {
    if (!hasShareIntent) return;
    let cancelled = false;

    (async () => {
      const image = shareIntent.files?.find((f) => f.mimeType.startsWith('image/'));
      if (image) {
        const base64 = await new File(image.path).base64();
        setPendingInput({ image: { base64, mimeType: image.mimeType }, text: shareIntent.text ?? undefined });
      } else if (shareIntent.webUrl) {
        setPendingInput({ url: shareIntent.webUrl });
      } else if (shareIntent.text) {
        setPendingInput({ text: shareIntent.text });
      } else {
        return;
      }
      if (cancelled) return;
      resetShareIntent();
      router.push('/analyze');
    })().catch(() => resetShareIntent());

    return () => {
      cancelled = true;
    };
  }, [hasShareIntent, shareIntent, resetShareIntent, router]);

  return null;
}

export default function RootLayout() {
  const t = useTheme();

  return (
    <ShareIntentProvider options={{ disabled: !shareIntentAvailable, resetOnBackground: true }}>
      <StatusBar style="auto" />
      {shareIntentAvailable && <ShareHandler />}
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: t.bg },
          headerTintColor: t.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: t.bg },
          headerBackTitle: 'Tilbake',
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="analyze" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="analysis/[id]" options={{ headerShown: false }} />
      </Stack>
    </ShareIntentProvider>
  );
}
