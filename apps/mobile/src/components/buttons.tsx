import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import type { ComponentProps, ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { shadow, useTheme } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

function tap() {
  if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

export function PrimaryButton({ label, icon, onPress, disabled }: { label: string; icon?: IconName; onPress: () => void; disabled?: boolean }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.98 : 1 }], opacity: disabled ? 0.5 : 1 }, shadow(t, 2), styles.radius]}
    >
      <LinearGradient colors={t.brandGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.primary, styles.radius]}>
        {icon && <Ionicons name={icon} size={20} color={t.onBrand} />}
        <Text style={[styles.primaryText, { color: t.onBrand }]}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

export function SecondaryButton({
  label,
  icon,
  onPress,
  style,
  children,
}: {
  label: string;
  icon?: IconName;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.secondary,
        styles.radius,
        { backgroundColor: t.brandSoft, transform: [{ scale: pressed ? 0.98 : 1 }] },
        style,
      ]}
    >
      {icon && <Ionicons name={icon} size={19} color={t.brand} />}
      <Text style={[styles.secondaryText, { color: t.brand }]}>{label}</Text>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  radius: { borderRadius: 16 },
  primary: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingVertical: 16 },
  primaryText: { fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
  secondary: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  secondaryText: { fontSize: 15, fontWeight: '700' },
});
