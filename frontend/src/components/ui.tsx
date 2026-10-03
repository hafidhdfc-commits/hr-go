import React from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  ActivityIndicator,
  ScrollView,
  StyleProp,
  ViewStyle,
  TextStyle,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { CaretLeft } from "phosphor-react-native";
import { makeStyles, fonts, fontSize, spacing, radius, useTheme, ThemeColors } from "@/src/theme";
import { StatusKind } from "@/src/format";

/* ----------------------------- Text ----------------------------- */
type TextVariant = "display" | "title" | "heading" | "body" | "bodyMedium" | "label" | "caption";
export function AppText({
  variant = "body",
  color,
  style,
  children,
  numberOfLines,
  testID,
}: {
  variant?: TextVariant;
  color?: keyof ThemeColors;
  style?: StyleProp<TextStyle>;
  children: React.ReactNode;
  numberOfLines?: number;
  testID?: string;
}) {
  const { colors } = useTheme();
  const styles = useTextStyles();
  return (
    <Text
      testID={testID}
      numberOfLines={numberOfLines}
      style={[styles[variant], color ? { color: colors[color] as string } : null, style]}
    >
      {children}
    </Text>
  );
}

const useTextStyles = makeStyles((colors) => ({
  display: { fontFamily: fonts.displayBold, fontSize: fontSize["3xl"], color: colors.onSurface },
  title: { fontFamily: fonts.display, fontSize: fontSize["2xl"], color: colors.onSurface },
  heading: { fontFamily: fonts.display, fontSize: fontSize.xl, color: colors.onSurface },
  body: { fontFamily: fonts.body, fontSize: fontSize.base, color: colors.onSurface },
  bodyMedium: { fontFamily: fonts.bodyMedium, fontSize: fontSize.base, color: colors.onSurface },
  label: { fontFamily: fonts.bodySemibold, fontSize: fontSize.sm, color: colors.muted },
  caption: { fontFamily: fonts.body, fontSize: fontSize.sm, color: colors.muted },
}));

/* ----------------------------- Card ----------------------------- */
export function Card({
  children,
  style,
  onPress,
  testID,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  testID?: string;
}) {
  const styles = useCardStyles();
  if (onPress) {
    return (
      <Pressable testID={testID} onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed, style]}>
        {children}
      </Pressable>
    );
  }
  return (
    <View testID={testID} style={[styles.card, style]}>
      {children}
    </View>
  );
}

const useCardStyles = makeStyles((colors) => ({
  card: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  pressed: { opacity: 0.7 },
}));

/* ----------------------------- Button ----------------------------- */
type BtnVariant = "primary" | "secondary" | "outline" | "danger" | "success" | "whatsapp" | "ghost";
export function Button({
  title,
  onPress,
  variant = "primary",
  loading,
  disabled,
  icon,
  style,
  testID,
  small,
}: {
  title: string;
  onPress?: () => void;
  variant?: BtnVariant;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  small?: boolean;
}) {
  const { colors } = useTheme();
  const styles = useBtnStyles();
  const map: Record<BtnVariant, { bg: string; fg: string; border?: string }> = {
    primary: { bg: colors.brandPrimary, fg: colors.onBrandPrimary },
    secondary: { bg: colors.surfaceTertiary, fg: colors.onSurfaceTertiary },
    outline: { bg: "transparent", fg: colors.brandPrimary, border: colors.borderStrong },
    danger: { bg: colors.error, fg: colors.onError },
    success: { bg: colors.success, fg: colors.onSuccess },
    whatsapp: { bg: colors.whatsapp, fg: colors.onWhatsapp },
    ghost: { bg: "transparent", fg: colors.brandPrimary },
  };
  const c = map[variant];
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        small && styles.small,
        { backgroundColor: c.bg, borderColor: c.border || "transparent", borderWidth: c.border ? 1.5 : 0 },
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={c.fg} />
      ) : (
        <View style={styles.row}>
          {icon}
          <Text style={[styles.text, small && styles.textSmall, { color: c.fg }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

const useBtnStyles = makeStyles((colors) => ({
  btn: {
    minHeight: 52,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  small: { minHeight: 40, paddingHorizontal: spacing.md, borderRadius: radius.sm },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  text: { fontFamily: fonts.bodySemibold, fontSize: fontSize.lg },
  textSmall: { fontSize: fontSize.base },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.85 },
}));

/* ----------------------------- Badge ----------------------------- */
export function Badge({ label, kind = "info", testID }: { label: string; kind?: StatusKind; testID?: string }) {
  const { colors } = useTheme();
  const styles = useBadgeStyles();
  const map: Record<StatusKind, string> = {
    success: colors.success,
    warning: colors.warning,
    error: colors.error,
    info: colors.info,
    muted: colors.muted,
  };
  const base = map[kind];
  return (
    <View testID={testID} style={[styles.badge, { backgroundColor: base + "1A", borderColor: base + "40" }]}>
      <View style={[styles.dot, { backgroundColor: base }]} />
      <Text style={[styles.text, { color: base }]}>{label}</Text>
    </View>
  );
}

const useBadgeStyles = makeStyles((colors) => ({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontFamily: fonts.bodySemibold, fontSize: 11, letterSpacing: 0.3 },
}));

/* ----------------------------- Input ----------------------------- */
export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  multiline,
  testID,
}: {
  label?: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "phone-pad" | "numeric";
  autoCapitalize?: "none" | "sentences" | "words";
  multiline?: boolean;
  testID?: string;
}) {
  const { colors } = useTheme();
  const styles = useFieldStyles();
  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
        style={[styles.input, multiline && styles.multiline]}
      />
    </View>
  );
}

const useFieldStyles = makeStyles((colors) => ({
  wrap: { gap: spacing.xs },
  label: { fontFamily: fonts.bodySemibold, fontSize: fontSize.sm, color: colors.onSurfaceSecondary },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === "ios" ? spacing.md : spacing.sm,
    fontFamily: fonts.body,
    fontSize: fontSize.base,
    color: colors.onSurface,
    minHeight: 48,
  },
  multiline: { minHeight: 90, textAlignVertical: "top", paddingTop: spacing.md },
}));

/* ----------------------------- StatCard ----------------------------- */
export function StatCard({
  label,
  value,
  kind,
  testID,
}: {
  label: string;
  value: string | number;
  kind?: StatusKind;
  testID?: string;
}) {
  const { colors } = useTheme();
  const styles = useStatStyles();
  const accent =
    kind === "success"
      ? colors.success
      : kind === "error"
        ? colors.error
        : kind === "warning"
          ? colors.warning
          : colors.brandPrimary;
  return (
    <View style={styles.card} testID={testID}>
      <View style={[styles.accent, { backgroundColor: accent }]} />
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

const useStatStyles = makeStyles((colors) => ({
  card: {
    flex: 1,
    minWidth: "30%",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    overflow: "hidden",
  },
  accent: { position: "absolute", left: 0, top: 0, bottom: 0, width: 3 },
  value: { fontFamily: fonts.displayBold, fontSize: fontSize.xl, color: colors.onSurface, marginBottom: 2 },
  label: { fontFamily: fonts.body, fontSize: 11, color: colors.muted, lineHeight: 14 },
}));

/* ----------------------------- SectionHeader ----------------------------- */
export function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  const styles = useSectionStyles();
  return (
    <View style={styles.row}>
      <AppText variant="label" style={styles.title}>
        {title}
      </AppText>
      {action}
    </View>
  );
}

const useSectionStyles = makeStyles(() => ({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  title: { letterSpacing: 1, textTransform: "uppercase" },
}));

/* ----------------------------- EmptyState ----------------------------- */
export function EmptyState({ title, subtitle, icon }: { title: string; subtitle?: string; icon?: React.ReactNode }) {
  const styles = useEmptyStyles();
  return (
    <View style={styles.wrap}>
      {icon}
      <AppText variant="heading" style={styles.title}>
        {title}
      </AppText>
      {subtitle ? (
        <AppText variant="caption" style={styles.sub}>
          {subtitle}
        </AppText>
      ) : null}
    </View>
  );
}

const useEmptyStyles = makeStyles(() => ({
  wrap: { alignItems: "center", justifyContent: "center", paddingVertical: spacing["3xl"], gap: spacing.sm },
  title: { marginTop: spacing.md, textAlign: "center" },
  sub: { textAlign: "center", maxWidth: 280 },
}));

/* ----------------------------- Loading ----------------------------- */
export function Loading({ testID }: { testID?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl }} testID={testID}>
      <ActivityIndicator size="large" color={colors.brandPrimary} />
    </View>
  );
}

/* ----------------------------- BackHeader (sticky) ----------------------------- */
export function BackHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useBackStyles();
  return (
    <View style={styles.wrap}>
      <Pressable testID="back-button" onPress={() => router.back()} style={styles.back} hitSlop={10}>
        <CaretLeft size={22} color={colors.onSurface} weight="bold" />
      </Pressable>
      <View style={styles.titles}>
        <AppText variant="heading" numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right ? <View>{right}</View> : <View style={{ width: 38 }} />}
    </View>
  );
}

const useBackStyles = makeStyles((colors) => ({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  back: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  titles: { flex: 1 },
}));

/* ----------------------------- ChipRow ----------------------------- */
export function ChipRow({
  options,
  value,
  onChange,
}: {
  options: { key: string; label: string }[];
  value: string;
  onChange: (k: string) => void;
}) {
  const styles = useChipStyles();
  const { colors } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      style={styles.row}
    >
      {options.map((o) => {
        const active = o.key === value;
        return (
          <Pressable
            key={o.key}
            testID={`chip-${o.key}`}
            onPress={() => onChange(o.key)}
            style={[
              styles.chip,
              { backgroundColor: active ? colors.brandPrimary : colors.surfaceSecondary, borderColor: active ? colors.brandPrimary : colors.border },
            ]}
          >
            <Text style={[styles.chipText, { color: active ? colors.onBrandPrimary : colors.onSurfaceSecondary }]}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const useChipStyles = makeStyles(() => ({
  row: { maxHeight: 56 },
  content: { gap: spacing.sm, paddingHorizontal: spacing.lg, alignItems: "center", height: 56 },
  chip: {
    height: 36,
    flexShrink: 0,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  chipText: { fontFamily: fonts.bodySemibold, fontSize: fontSize.sm },
}));

/* ----------------------------- Row (label/value) ----------------------------- */
export function InfoRow({ label, value, valueColor }: { label: string; value?: string | null; valueColor?: keyof ThemeColors }) {
  const styles = useInfoRowStyles();
  return (
    <View style={styles.row}>
      <AppText variant="caption" style={styles.label}>
        {label}
      </AppText>
      <AppText variant="bodyMedium" color={valueColor} style={styles.value} numberOfLines={2}>
        {value || "-"}
      </AppText>
    </View>
  );
}

const useInfoRowStyles = makeStyles(() => ({
  row: { flexDirection: "row", justifyContent: "space-between", gap: spacing.md, paddingVertical: 6 },
  label: {},
  value: { flex: 1, textAlign: "right" },
}));
