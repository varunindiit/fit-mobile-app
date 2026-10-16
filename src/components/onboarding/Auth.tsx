import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { forwardRef, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import Animated, { FadeInDown, interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AccountSheet, demoAccounts, type Account, type Provider } from '@/components/AccountSheet';
import { Button, EASE_OUT, nativeOnly, tap, useToast, type IconName } from '@/components/ui';
import type { PlanTier } from '@/data/plans';
import { BRAND, C, MOTION, R } from '@/theme';
import { GUTTER } from './kit';

const LOGO = require('@/assets/images/logo-mark.png');
const MIN_PASSWORD = 6;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type AuthMode = 'login' | 'signup';

const COPY: Record<AuthMode, { title: string; sub: string; cta: string; switchQ: string; switchA: string }> = {
  login: {
    title: 'Welcome back',
    sub: `Log in with your email to pick up your ${BRAND} plan where you left off.`,
    cta: 'Log in',
    switchQ: `New to ${BRAND}?`,
    switchA: 'Sign up',
  },
  signup: {
    title: 'Create your account',
    sub: 'Save your plan, progress and streak so they are never lost.',
    cta: 'Create account',
    switchQ: 'Already have an account?',
    switchA: 'Log in',
  },
};

const rise = (delay: number) => nativeOnly(FadeInDown.duration(MOTION.enter).delay(delay).easing(EASE_OUT).withInitialValues({ transform: [{ translateY: 14 }] }));

type FieldProps = TextInputProps & { label: string; icon: IconName; error?: string; hint?: string; right?: React.ReactNode };

/** Labelled input with a leading icon; the border eases to the brand colour on focus and turns red on error. */
const Field = forwardRef<TextInput, FieldProps>(function Field({ label, icon, error, hint, right, onFocus, onBlur, ...input }, ref) {
  const [focused, setFocused] = useState(false);
  const f = useSharedValue(0);
  useEffect(() => {
    f.set(withTiming(focused ? 1 : 0, { duration: MOTION.fast }));
  }, [focused, f]);
  const box = useAnimatedStyle(() => ({ borderColor: interpolateColor(f.get(), [0, 1], [C.border, C.primary]) }));
  return (
    <View style={{ marginTop: 16 }}>
      <Text style={[st.fieldLabel, focused && { color: C.primaryDark }]}>{label}</Text>
      <Animated.View style={[st.input, box, !!error && { borderColor: C.danger }]}>
        <Ionicons name={icon} size={19} color={focused ? C.primaryDark : C.muted} style={{ marginLeft: 14 }} />
        <TextInput
          ref={ref}
          placeholderTextColor={C.muted}
          style={st.textInput}
          onFocus={(e) => { setFocused(true); onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
          {...input}
        />
        {right}
      </Animated.View>
      {error ? <Text style={st.error}>{error}</Text> : hint ? <Text style={st.hint}>{hint}</Text> : null}
    </View>
  );
});

/** Log in / sign up with email and password (demo: any valid email and password work). */
export function AuthScreen({ mode, onBack, onSwitch, onDone }: { mode: AuthMode; onBack: () => void; onSwitch: () => void; onDone: (r: { name: string; email: string; provider: Provider | 'email'; plan?: PlanTier | null }) => void }) {
  const toast = useToast();
  const copy = COPY[mode];
  const signup = mode === 'signup';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  // Errors only appear once a field has been left, so typing isn't interrupted.
  const [touched, setTouched] = useState<{ email?: boolean; password?: boolean }>({});
  const [loading, setLoading] = useState<null | 'email' | Provider>(null);
  const [sheet, setSheet] = useState<Provider | null>(null);
  const emailRef = useRef<TextInput>(null);
  const passRef = useRef<TextInput>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const mail = email.trim().toLowerCase();
  const nameOk = !signup || name.trim().length >= 2;
  const emailOk = EMAIL_RE.test(mail);
  const passOk = password.length >= MIN_PASSWORD;
  const canSubmit = nameOk && emailOk && passOk && !loading;

  // Simulated network round-trip so the buttons show their loading state.
  const run = (kind: 'email' | Provider, then: () => void) => {
    setLoading(kind);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setLoading(null);
      then();
    }, 900);
  };

  const submit = () => {
    if (!canSubmit) return;
    run('email', () => onDone({ name: name.trim(), email: mail, provider: 'email' }));
  };

  const openSheet = (provider: Provider) => {
    if (loading) return;
    setSheet(provider);
  };
  // The chosen account signs straight in once its sheet has slid away.
  const pickAccount = (a: Account) => {
    const provider = sheet;
    setSheet(null);
    if (provider) run(provider, () => onDone({ name: a.name, email: a.email, provider, plan: a.plan }));
  };

  const forgot = () => {
    tap();
    if (emailOk) toast(`Reset link sent to ${mail}`, 'mail');
    else {
      setTouched((t) => ({ ...t, email: true }));
      emailRef.current?.focus();
      toast('Enter your email first', 'mail-outline');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.card }}>
      <StatusBar style="dark" />
      <LinearGradient colors={[C.primarySoft, 'rgba(255,255,255,0)']} locations={[0, 0.5]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={st.bar}>
            <Pressable onPress={() => { tap(); onBack(); }} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back" style={({ pressed }) => [st.back, pressed && { opacity: 0.5 }]}>
              <Ionicons name="chevron-back" size={24} color={C.text} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={st.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Animated.View entering={rise(0)} style={st.mark}>
              <Image source={LOGO} style={{ width: 30, height: 30 }} contentFit="contain" />
            </Animated.View>
            <Animated.Text entering={rise(60)} style={st.title} accessibilityRole="header">{copy.title}</Animated.Text>
            <Animated.Text entering={rise(120)} style={st.sub}>{copy.sub}</Animated.Text>

            <Animated.View entering={rise(180)}>
              {signup && (
                <Field
                  label="Your name"
                  icon="person-outline"
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Priya Sharma"
                  autoCapitalize="words"
                  autoComplete="name"
                  textContentType="name"
                  returnKeyType="next"
                  submitBehavior="submit"
                  onSubmitEditing={() => emailRef.current?.focus()}
                  maxLength={40}
                />
              )}
              <Field
                ref={emailRef}
                label="Email"
                icon="mail-outline"
                value={email}
                onChangeText={setEmail}
                onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType={signup ? 'username' : 'emailAddress'}
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => passRef.current?.focus()}
                maxLength={80}
                error={touched.email && !!email && !emailOk ? 'Enter a valid email address' : undefined}
              />
              <Field
                ref={passRef}
                label="Password"
                icon="lock-closed-outline"
                value={password}
                onChangeText={setPassword}
                onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                placeholder={signup ? 'Create a password' : 'Your password'}
                secureTextEntry={!show}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete={signup ? 'new-password' : 'current-password'}
                textContentType={signup ? 'newPassword' : 'password'}
                returnKeyType="go"
                onSubmitEditing={submit}
                maxLength={64}
                error={touched.password && !!password && !passOk ? `Use at least ${MIN_PASSWORD} characters` : undefined}
                hint={signup ? `At least ${MIN_PASSWORD} characters` : undefined}
                right={
                  <Pressable onPress={() => { tap(); setShow((v) => !v); }} hitSlop={8} accessibilityRole="button" accessibilityLabel={show ? 'Hide password' : 'Show password'} style={st.eye}>
                    <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color={C.muted} />
                  </Pressable>
                }
              />
              {!signup && (
                <Pressable onPress={forgot} hitSlop={8} accessibilityRole="button" style={st.forgot}>
                  <Text style={st.link}>Forgot password?</Text>
                </Pressable>
              )}

              <Button title={copy.cta} icon={signup ? 'person-add-outline' : 'log-in-outline'} style={{ marginTop: signup ? 24 : 18 }} disabled={!nameOk || !emailOk || !passOk} loading={loading === 'email'} onPress={submit} />

              <View style={st.orRow}>
                <View style={st.orLine} />
                <Text style={st.orText}>or</Text>
                <View style={st.orLine} />
              </View>
              {/* Sign in with Apple is iOS-only. */}
              {Platform.OS === 'ios' && (
                <Button
                  title="Continue with Apple"
                  variant="dark"
                  icon="logo-apple"
                  loading={loading === 'apple'}
                  disabled={!!loading && loading !== 'apple'}
                  onPress={() => openSheet('apple')}
                  style={{ backgroundColor: '#000', borderColor: '#000', marginBottom: 10 }}
                />
              )}
              <Button
                title="Continue with Google"
                variant="outline"
                icon="logo-google"
                loading={loading === 'google'}
                disabled={!!loading && loading !== 'google'}
                onPress={() => openSheet('google')}
              />
              <Text style={st.terms}>By continuing you agree to our Terms of Service and Privacy Policy.</Text>
            </Animated.View>
          </ScrollView>

          <View style={st.foot}>
            <Text style={st.footText}>{copy.switchQ} </Text>
            <Pressable onPress={() => { tap(); onSwitch(); }} hitSlop={10} accessibilityRole="button">
              <Text style={st.link}>{copy.switchA}</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
      <AccountSheet
        visible={sheet !== null}
        provider={sheet ?? 'google'}
        accounts={demoAccounts(sheet ?? 'google', name)}
        onClose={() => setSheet(null)}
        onPick={pickAccount}
        showPlans={!signup}
      />
    </View>
  );
}

const st = StyleSheet.create({
  bar: { height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: GUTTER - 8 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: GUTTER + 4, paddingTop: 8, paddingBottom: 24 },
  mark: { width: 56, height: 56, borderRadius: 18, backgroundColor: C.primaryDark, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '900', color: C.text, letterSpacing: -0.7, marginTop: 20 },
  sub: { fontSize: 15, lineHeight: 22, color: C.textSoft, marginTop: 8 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: C.textSoft, marginBottom: 8, marginLeft: 2 },
  input: { flexDirection: 'row', alignItems: 'center', height: 56, borderRadius: R.md, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.card, overflow: 'hidden' },
  textInput: { flex: 1, height: '100%', paddingHorizontal: 12, fontSize: 16, color: C.text },
  eye: { height: '100%', paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  error: { fontSize: 12.5, fontWeight: '600', color: C.danger, marginTop: 6, marginLeft: 2 },
  hint: { fontSize: 12.5, color: C.muted, marginTop: 6, marginLeft: 2 },
  forgot: { alignSelf: 'flex-end', marginTop: 12, paddingVertical: 2 },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 },
  orLine: { flex: 1, height: 1, backgroundColor: C.border },
  orText: { fontSize: 13, fontWeight: '600', color: C.muted },
  terms: { fontSize: 12, lineHeight: 17, color: C.muted, textAlign: 'center', marginTop: 20, paddingHorizontal: 12 },
  foot: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  footText: { fontSize: 14.5, color: C.textSoft },
  link: { fontSize: 14.5, fontWeight: '800', color: C.primaryDark },
});
