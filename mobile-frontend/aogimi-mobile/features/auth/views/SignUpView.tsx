import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Touchable } from '@/shared/components/Touchable';
import { useRouter } from 'expo-router';
import { Screen } from '@/shared/components/Screen';
import { Button } from '@/shared/components/Button';
import { TextField } from '@/shared/components/TextField';
import { useColors } from '@/theme/ThemeContext';
import { useT } from '@/lib/i18n/I18nContext';
import { useAuth } from '@/features/auth/providers/AuthContext';
import { fontFamily, fontSize, spacing } from '@/theme/tokens';

/**
 * Mirrors the backend's `return res.status(403)` at the top of the register
 * handler. Flip both to reopen sign-ups — this one so the form is offered at
 * all, that one so the request gets past the door. Kept as a constant rather
 * than probing the endpoint: a closed door is a deployment fact, not something
 * worth a round trip on every screen mount.
 */
const REGISTRATION_OPEN = false;

/**
 * Client-side validation mirrors `backend/src/validation/auth.js` — the same
 * arrangement the web's `AuthView` uses, and for the same reason: checking less
 * here means a valid-looking form comes back as a server error. Username is
 * 3–32 of `[a-zA-Z0-9_.-]`, password is 8–72 with at least one non-letter, and
 * email is checked pragmatically rather than against RFC 5322.
 *
 * Returns the first problem, or null.
 */
function validate(username: string, email: string, password: string): string | null {
  if (username.length < 3 || username.length > 32) {
    return 'Username must be between 3 and 32 characters.';
  }
  if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
    return "Username may contain letters, numbers, '_', '.' and '-' only.";
  }
  if (!email) return 'Enter your email address.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Enter a valid email address.';
  }
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (password.length > 72) return 'Password must be at most 72 characters.';
  if (!/[^A-Za-z\s]/.test(password)) {
    return 'Password must contain at least one number or symbol.';
  }
  return null;
}

export function SignUpView() {
  const c = useColors();
  const t = useT();
  const router = useRouter();
  const { signUp } = useAuth();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit =
    username.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length > 0 &&
    confirm.length > 0 &&
    !loading;

  async function handleSubmit() {
    if (!canSubmit) return;
    if (password !== confirm) {
      setError(t('auth.signUp.errorMismatch'));
      return;
    }
    const problem = validate(username.trim(), email.trim(), password);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await signUp(username.trim(), email.trim(), password);
      router.replace('/(auth)/onboarding');
    } catch (err) {
      // The server's own message comes through `lib/api.ts` — which covers the
      // 409s (username / email taken) and the 403 if this is reached with the
      // endpoint still closed.
      const msg = err instanceof Error ? err.message : t('auth.signUp.errorTaken');
      setError(msg);
      setLoading(false);
    }
  }

  if (!REGISTRATION_OPEN) {
    return (
      <Screen padded>
        <View style={styles.header}>
          <Touchable
          minTarget={false}
          hitSlop={12} onPress={() => router.back()}>
            <Text style={[styles.back, { color: c.fgMuted }]}>{t('common.back')}</Text>
          </Touchable>
        </View>

        <Text style={[styles.title, { color: c.fg }]}>{t('auth.signUp.closedTitle')}</Text>
        <Text style={[styles.closedBody, { color: c.fgMuted }]}>
          {t('auth.signUp.closedBody')}
        </Text>

        <Touchable
        minTarget={false}
        hitSlop={8}
          onPress={() => router.replace('/(auth)/signin')}
          style={styles.altLink}
        >
          <Text style={[styles.altText, { color: c.fgMuted }]}>
            {t('auth.signUp.haveAccount')}{' '}
            <Text style={{ color: c.fg, fontWeight: '600' }}>{t('auth.signUp.signIn')}</Text>
          </Text>
        </Touchable>
      </Screen>
    );
  }

  return (
    <Screen padded>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Touchable
          minTarget={false}
          hitSlop={12} onPress={() => router.back()}>
            <Text style={[styles.back, { color: c.fgMuted }]}>{t('common.back')}</Text>
          </Touchable>
        </View>

        <Text style={[styles.title, { color: c.fg }]}>{t('auth.signUp.title')}</Text>

        <View style={styles.form}>
          <TextField
            label={t('auth.signUp.username')}
            value={username}
            onChangeText={setUsername}
            placeholder={t('auth.signUp.usernamePlaceholder')}
            autoComplete="username"
            returnKeyType="next"
          />
          <TextField
            label={t('auth.signUp.email')}
            value={email}
            onChangeText={setEmail}
            placeholder={t('auth.signUp.emailPlaceholder')}
            autoComplete="email"
            keyboardType="email-address"
            autoCapitalize="none"
            returnKeyType="next"
          />
          <TextField
            label={t('auth.signUp.password')}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secure
            autoComplete="new-password"
            returnKeyType="next"
          />
          <TextField
            label={t('auth.signUp.confirmPassword')}
            value={confirm}
            onChangeText={setConfirm}
            placeholder="••••••••"
            secure
            autoComplete="new-password"
            returnKeyType="go"
            onSubmitEditing={handleSubmit}
          />
          {error && <Text style={[styles.error, { color: c.error }]}>{error}</Text>}
          <Button
            label={t('auth.signUp.submit')}
            onPress={handleSubmit}
            loading={loading}
            disabled={!canSubmit}
            full
            style={{ marginTop: spacing.md }}
          />
        </View>

        <Touchable
        minTarget={false}
        hitSlop={8}
          onPress={() => router.replace('/(auth)/signin')}
          style={styles.altLink}
        >
          <Text style={[styles.altText, { color: c.fgMuted }]}>
            {t('auth.signUp.haveAccount')}{' '}
            <Text style={{ color: c.fg, fontWeight: '600' }}>{t('auth.signUp.signIn')}</Text>
          </Text>
        </Touchable>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { paddingTop: spacing.md, paddingBottom: spacing.lg },
  back: { fontSize: fontSize.md, fontWeight: '500' },
  title: {
    fontSize: 32,
    fontFamily: fontFamily.displayBold,
    letterSpacing: -0.5,
    marginBottom: spacing.xl,
  },
  form: { gap: spacing.sm },
  error: { fontSize: fontSize.sm, marginTop: spacing.xs },
  closedBody: { fontSize: fontSize.md, lineHeight: 22 },
  altLink: { marginTop: 'auto', paddingVertical: spacing.lg, alignItems: 'center' },
  altText: { fontSize: fontSize.sm },
});
