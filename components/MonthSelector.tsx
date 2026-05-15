import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFinanceStore } from '../store/useFinanceStore';

const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export default function MonthSelector() {
  const { selectedMonth, goToPreviousMonth, goToNextMonth } = useFinanceStore();
  const month = MONTHS_PT[selectedMonth.getMonth()];
  const year = selectedMonth.getFullYear();

  return (
    <View style={S.container}>
      <TouchableOpacity onPress={goToPreviousMonth} style={S.arrow} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="chevron-back" size={24} color="#9ca3af" />
      </TouchableOpacity>
      <Text style={S.label}>{month} {year}</Text>
      <TouchableOpacity onPress={goToNextMonth} style={S.arrow} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="chevron-forward" size={24} color="#9ca3af" />
      </TouchableOpacity>
    </View>
  );
}

const S = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2d2d50',
  },
  arrow: { padding: 8 },
  label: { fontSize: 18, fontWeight: '700', color: '#fff' },
});
