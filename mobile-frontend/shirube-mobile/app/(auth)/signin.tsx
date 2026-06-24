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

export default function SignInScreen() {
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
    } catch {
      setError(t('auth.signIn.errorInvalid'));
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

        <Text style={[styles.title, { color: c.fg }]}>{t('auth.signIn.title')}</Text>

        <View style={styles.form}>
          <TextField
            label={t('auth.signIn.username')}
            value={username}
            onChangeText={setUsername}
            placeholder="@yourname"
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

        <Pressable
          onPress={() => router.replace('/(auth)/signup')}
          hitSlop={8}
          style={styles.altLink}
        >
          <Text style={[styles.altText, { color: c.fgMuted }]}>
            {t('auth.signIn.noAccount')}{' '}
            <Text style={{ color: c.fg, fontWeight: '600' }}>{t('auth.signIn.signUp')}</Text>
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
