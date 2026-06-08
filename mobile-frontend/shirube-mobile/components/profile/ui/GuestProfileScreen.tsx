import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { useColors } from '@/theme/ThemeContext';
import { fontFamily, fontSize, radius, spacing } from '@/theme/tokens';
import { useAuth, type ConvertProgress } from '@/lib/auth/AuthContext';

// Profile screen variant shown while the user is in guest mode. There is
// no editable profile to display — the page is entirely the "connect to
// the cloud" flow. Submitting creates a backend account and promotes all
// local pending books / decks / cards / reader-state under that new
// account; the auth context then flips to signed-in and this component
// unmounts in favor of the regular ProfileScreen.

const STAGE_LABELS: Record<ConvertProgress['stage'], string> = {
  signup: 'Creating account',
  books: 'Uploading books',
  decks: 'Uploading decks',
  cards: 'Uploading cards',
  'reader-state': 'Uploading reading progress',
  done: 'Done',
};

export function GuestProfileScreen() {
  const c = useColors();
  const { convertToAccount } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<ConvertProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (busy) return;
    if (username.trim().length === 0 || password.length === 0) {
      setError('Username and password are required.');
      return;
    }
    setError(null);
    setBusy(true);
    setProgress({ stage: 'signup', current: 0, total: 1 });
    const result = await convertToAccount(username.trim(), password, (p) => {
      setProgress(p);
    });
    if (!result.ok) {
      setError(result.reason);
      setBusy(false);
    }
    // On success the AuthProvider flips state to signed-in and this
    // component unmounts; no follow-up needed here.
  };

  const ratio = progress && progress.total > 0 ? progress.current / progress.total : 0;
  const stageLabel = progress ? STAGE_LABELS[progress.stage] : '';

  return (
    <Screen padded>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={[styles.title, { color: c.fg, fontFamily: fontFamily.ui }]}>
          Local-only account
        </Text>
        <Text style={[styles.lede, { color: c.fgMuted }]}>
          Your reading progress and decks live only on this device. Create
          a Shirube account to back them up and keep them in sync across
          devices.
        </Text>

        <View style={[styles.form, { borderColor: c.border, backgroundColor: c.bgElev }]}>
          <View style={styles.field}>
            <Text style={[styles.label, { color: c.fgMuted }]}>Username</Text>
            <TextInput
              value={username}
              onChangeText={setUsername}
              placeholder="Pick a username"
              placeholderTextColor={c.fgSubtle}
              editable={!busy}
              autoCapitalize="none"
              autoCorrect={false}
              style={[styles.input, { color: c.fg, borderColor: c.border }]}
            />
          </View>
          <View style={styles.field}>
            <Text style={[styles.label, { color: c.fgMuted }]}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Pick a password"
              placeholderTextColor={c.fgSubtle}
              editable={!busy}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              style={[styles.input, { color: c.fg, borderColor: c.border }]}
            />
          </View>

          {error && (
            <Text style={[styles.error, { color: c.error ?? '#C53030' }]}>{error}</Text>
          )}

          <Button
            label={busy ? 'Saving…' : 'Save to cloud'}
            onPress={submit}
            disabled={busy}
            full
          />
        </View>

        {busy && progress && (
          <View style={[styles.progressBox, { borderColor: c.border, backgroundColor: c.bgElev }]}>
            <Text style={[styles.progressStage, { color: c.fg }]}>{stageLabel}</Text>
            <Text style={[styles.progressLabel, { color: c.fgMuted }]}>
              {progress.total > 0
                ? `${progress.current} / ${progress.total}${progress.label ? ` · ${progress.label}` : ''}`
                : '—'}
            </Text>
            <View style={[styles.track, { backgroundColor: c.bgSunken }]}>
              <View
                style={[
                  styles.fill,
                  {
                    backgroundColor: c.fg,
                    width: `${Math.round(ratio * 100)}%`,
                  },
                ]}
              />
            </View>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingVertical: spacing.lg, gap: spacing.lg },
  title: { fontSize: fontSize.xl, fontWeight: '600' },
  lede: { fontSize: fontSize.sm, lineHeight: 20 },
  form: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  field: { gap: 6 },
  label: { fontSize: fontSize.xs, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase' },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: fontSize.md,
  },
  error: { fontSize: fontSize.sm },
  progressBox: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 6,
  },
  progressStage: { fontSize: fontSize.sm, fontWeight: '600' },
  progressLabel: { fontSize: fontSize.xs },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 4,
  },
  fill: { height: '100%', borderRadius: 3 },
});
