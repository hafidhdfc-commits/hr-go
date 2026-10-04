import { useState } from "react";
import { View, ImageBackground, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { LinearGradient } from "expo-linear-gradient";
import { Eye, EyeSlash } from "phosphor-react-native";
import { AppText, Button, Field } from "@/src/components/ui";
import { useToast } from "@/src/components/toast";
import { useAuth, homeRoute } from "@/src/auth";
import { makeStyles, fonts, spacing, radius, fontSize, useTheme } from "@/src/theme";
import { ApiError } from "@/src/api";

const HERO =
  "https://images.unsplash.com/photo-1619659085985-f51a00f0160a?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NjV8MHwxfHNlYXJjaHwxfHxwcml2YXRlJTIwamV0JTIwdGVybWluYWwlMjBjaW5lbWF0aWN8ZW58MHx8fHwxNzkxMDM4OTI1fDA&ixlib=rb-4.1.0&q=85";

export default function Login() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const onLogin = async () => {
    if (!identifier.trim() || !password) {
      toast.show("Enter your username and password", "error");
      return;
    }
    setLoading(true);
    try {
      const user = await login(identifier.trim(), password);
      router.replace(homeRoute(user.role) as any);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Unable to sign in";
      toast.show(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <ImageBackground source={{ uri: HERO }} style={[styles.hero, { paddingTop: insets.top + spacing.xl }]}>
        <LinearGradient
          colors={["rgba(6,27,58,0.35)", "rgba(6,27,58,0.85)", "#061B3A"]}
          style={styles.scrim}
        />
        <View style={styles.brandWrap}>
          <View style={styles.logo}>
            <AppText variant="display" color="onBrand" style={styles.logoText}>
              HR
            </AppText>
            <View style={styles.logoDot} />
            <AppText variant="display" color="onBrand" style={styles.logoText}>
              Go
            </AppText>
          </View>
          <AppText variant="bodyMedium" color="onBrand" style={styles.heroSub}>
            Crew Transportation & Shuttle Service
          </AppText>
          <AppText variant="caption" style={styles.tagline}>
            The Better Way to Go
          </AppText>
        </View>
      </ImageBackground>

      <KeyboardAwareScrollView
        bottomOffset={24}
        contentContainerStyle={[styles.form, { paddingBottom: insets.bottom + spacing.xl }]}
        keyboardShouldPersistTaps="handled"
      >
        <AppText variant="title" style={styles.welcome}>
          Welcome back
        </AppText>
        <AppText variant="caption" style={styles.welcomeSub}>
          Sign in to your operations account
        </AppText>

        <View style={styles.fields}>
          <Field
            label="Email / Phone / Username"
            value={identifier}
            onChangeText={setIdentifier}
            placeholder="e.g. mhafidhal"
            autoCapitalize="none"
            testID="login-identifier"
          />
          <View style={styles.pwWrap}>
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Your password"
              secureTextEntry={!show}
              autoCapitalize="none"
              testID="login-password"
            />
            <Pressable style={styles.eye} onPress={() => setShow((s) => !s)} hitSlop={10} testID="toggle-password">
              {show ? <EyeSlash size={20} color={colors.muted} /> : <Eye size={20} color={colors.muted} />}
            </Pressable>
          </View>
        </View>

        <Button title="LOGIN" onPress={onLogin} loading={loading} testID="login-submit" style={styles.cta} />

        <AppText variant="caption" style={styles.footer}>
          Internal access only · PT Harmoni Rute Indonesia
        </AppText>
      </KeyboardAwareScrollView>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  hero: { height: 320, justifyContent: "flex-end", paddingHorizontal: spacing.xl, paddingBottom: spacing.xl },
  scrim: { ...StyleSheetAbsolute() },
  brandWrap: { gap: 2 },
  logo: { flexDirection: "row", alignItems: "center" },
  logoText: { fontSize: 40, letterSpacing: 0.5 },
  logoDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brandSecondary, marginHorizontal: 4, marginTop: 10 },
  heroSub: { marginTop: spacing.sm, opacity: 0.95 },
  tagline: { color: colors.brandSecondary, fontFamily: fonts.displayMedium, fontSize: fontSize.sm, marginTop: 2, letterSpacing: 1 },
  form: { padding: spacing.xl, gap: spacing.md },
  welcome: { marginTop: spacing.sm },
  welcomeSub: { marginBottom: spacing.md },
  fields: { gap: spacing.lg },
  pwWrap: { position: "relative" },
  eye: { position: "absolute", right: spacing.md, top: 34 },
  cta: { marginTop: spacing.lg },
  footer: { textAlign: "center", marginTop: spacing.lg },
}));

function StyleSheetAbsolute() {
  return { position: "absolute" as const, left: 0, right: 0, top: 0, bottom: 0 };
}
