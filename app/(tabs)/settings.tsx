import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

function SettingsRow({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={S.row} onPress={onPress} activeOpacity={0.7}>
      <View style={S.rowLeft}>
        <View style={S.iconBox}>
          <Ionicons name={icon as any} size={20} color="#6366f1" />
        </View>
        <Text style={S.rowLabel}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#6b7280" />
    </TouchableOpacity>
  );
}

export default function Settings() {
  return (
    <SafeAreaView style={S.container} edges={['top']}>
      <View style={S.header}>
        <Text style={S.title}>Configurações</Text>
        <Text style={S.subtitle}>Gerencie seus dados</Text>
      </View>

      <View style={S.section}>
        <Text style={S.sectionTitle}>FINANÇAS</Text>
        <SettingsRow
          icon="pricetags-outline"
          label="Categorias"
          onPress={() => router.push('/categories')}
        />
        <SettingsRow
          icon="card-outline"
          label="Cartões de Crédito"
          onPress={() => router.push('/credit-cards')}
        />
      </View>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f23' },
  header: {
    padding: 24, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#2d2d50',
  },
  title: { fontSize: 28, fontWeight: '700', color: '#fff', marginBottom: 4 },
  subtitle: { fontSize: 15, color: '#6b7280' },
  section: { marginTop: 24, paddingHorizontal: 16 },
  sectionTitle: {
    fontSize: 12, fontWeight: '600', color: '#6b7280',
    letterSpacing: 1, marginBottom: 8, paddingHorizontal: 8,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#1a1a35', borderRadius: 12, padding: 16, marginBottom: 8,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#2d2d50', alignItems: 'center', justifyContent: 'center',
  },
  rowLabel: { fontSize: 16, fontWeight: '500', color: '#fff' },
});
