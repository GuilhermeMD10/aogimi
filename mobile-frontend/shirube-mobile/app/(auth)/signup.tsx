import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { useColors } from '@/theme/ThemeContext';
import { useT } from '@/lib/i18n/I18nContext';
import { useAuth } from '@/lib/auth/AuthContext';
import { fontFamily, fontSize, spacing } from '@/theme/tokens';

export default function SignUpScreen() {
  const c = useColors();
  const t = useT();
  const router = useRouter();
  const { signUp } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit =
    username.trim().length > 0 && password.length > 0 && confirm.length > 0 && !loading;

  async function handleSubmit() {
    if (!canSubmit) return;
    if (password !== confirm) {
      setError(t('auth.signUp.errorMismatch'));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await signUp(username.trim(), password);
      router.replace('/(auth)/onboarding');
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('auth.signUp.errorTaken');
      setError(msg);
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
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={[styles.back, { color: c.fgMuted }]}>{t('common.back')}</Text>
          </Pressable>
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

        <Pressable
          onPress={() => router.replace('/(auth)/signin')}
          hitSlop={8}
          style={styles.altLink}
        >
          <Text style={[styles.altText, { color: c.fgMuted }]}>
            {t('auth.signUp.haveAccount')}{' '}
            <Text style={{ color: c.fg, fontWeight: '600' }}>{t('auth.signUp.signIn')}</Text>
          </Text>
        </Pressable>
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
  altLink: { marginTop: 'auto', paddingVertical: spacing.lg, alignItems: 'center' },
  altText: { fontSize: fontSize.sm },
});
