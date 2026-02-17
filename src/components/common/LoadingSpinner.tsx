import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useColors } from '@/theme/useColors';

export default function LoadingSpinner() {
  const colors = useColors();
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
