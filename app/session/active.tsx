import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';

export default function ActiveSessionScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Active Session</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  title: { ...typography.h2, color: colors.text },
});
