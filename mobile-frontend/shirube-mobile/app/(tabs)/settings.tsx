import { Pressable, StyleSheet, Text, View } from 'react-native';

// Stub — required to fill the 5th nav slot. Placeholder button only.
export default function SettingsTab() {
  return (
    <View style={styles.root}>
      <Pressable style={styles.btn} onPress={() => {}}>
        <Text style={styles.btnText}>Dummy button</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.2)',
  },
  btnText: { fontSize: 14 },
});
