import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Touchable, Screen, Button, TextField } from '@/shared/components';
import { useRouter } from 'expo-router';
import { useColors, fontFamily, fontSize, spacing } from '@/theme';
import { useT } from '@/lib/i18n/I18nContext';
import { useAuth } from '@/features/auth/providers/AuthContext';
import { REGISTRATION_OPEN } from '../lib/authApi';
import { errorStatus } from '../lib/requestError';

export function SignInView() {
  const c = useColors();
  const t = useT();
  const router = useRouter();
  const { signIn } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = username.trim().length > 0 && password.length > 0 && !loading;

  async function handleSubmit() {
    if (!canSubmit) return;
    setError(null);
    setLoading(true);
    try {
      await signIn(username.trim(), password);
      router.replace('/(auth)/onboarding');
    } catch (err) {
      setError(t(signInErrorKey(errorStatus(err))));
      setLoading(false);
    }
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

        <Text style={[styles.title, { color: c.fg }]}>{t('auth.signIn.title')}</Text>

        <View style={styles.form}>
          <TextField
            label={t('auth.signIn.username')}
            value={username}
            onChangeText={setUsername}
            placeholder={t('auth.signUp.usernamePlaceholder')}
            autoComplete="username"
            returnKeyType="next"
          />
          <TextField
            label={t('auth.signIn.password')}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secure
            autoComplete="password"
            returnKeyType="go"
            onSubmitEditing={handleSubmit}
          />
          {error && <Text style={[styles.error, { color: c.error }]}>{error}</Text>}
          <Button
            label={t('auth.signIn.submit')}
            onPress={handleSubmit}
            loading={loading}
            disabled={!canSubmit}
            full
            style={{ marginTop: spacing.md }}
          />
        </View>

        {REGISTRATION_OPEN && (
          <Touchable
            minTarget={false}
            hitSlop={8}
            onPress={() => router.replace('/(auth)/signup')}
            style={styles.altLink}
          >
            <Text style={[styles.altText, { color: c.fgMuted }]}>
              {t('auth.signIn.noAccount')}{' '}
              <Text style={{ color: c.fg, fontWeight: '600' }}>{t('auth.signIn.signUp')}</Text>
            </Text>
          </Touchable>
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}

/**
 * Only a 401 (wrong credentials) or a 400 (the login schema refused the body)
 * says the credentials are wrong. 429 is the login limiter; anything else the
 * server answered is its own fault; no status at all means the credentials
 * were never checked.
 */
function signInErrorKey(status: number | undefined): string {
  if (status === undefined) return 'auth.onboarding.errorOffline';
  if (status === 400 || status === 401) return 'auth.signIn.errorInvalid';
  if (status === 429) return 'auth.signIn.errorRateLimited';
  return 'auth.signIn.errorServer';
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
  altLink: { marginTop: 'auto', paddingVertical: spacing.lg, alignItems: 'center' },
  altText: { fontSize: fontSize.sm },
});
