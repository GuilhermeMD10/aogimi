import { Redirect } from 'expo-router';

// Default tab on launch: Reader.
export default function Index() {
  return <Redirect href="/reader" />;
}
