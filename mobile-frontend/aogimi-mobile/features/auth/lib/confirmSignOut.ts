import { Alert } from 'react-native';
import type { Translate } from '@/lib/i18n/I18nContext';

/**
 * The one sign-out confirmation. Profile and Settings both offer sign-out, and
 * leaving drops the session on this device, so neither does it on a single tap.
 */
export function confirmSignOut(t: Translate, signOut: () => Promise<void>): void {
  Alert.alert(t('profile.signOut'), t('settings.signOutConfirm'), [
    { text: t('common.cancel'), style: 'cancel' },
    { text: t('profile.signOut'), style: 'destructive', onPress: () => void signOut() },
  ]);
}
