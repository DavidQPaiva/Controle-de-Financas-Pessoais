import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from '@react-navigation/native';
import { useFinanceStore } from '../../store/useFinanceStore';
import { getTransactionsByMonth, type TransactionWithCategory } from '../../database/transactions';
import { formatCurrency } from '../../utils/creditCardUtils';
import MonthSelector from '../../components/MonthSelector';

function computeProjections(txs: TransactionWithCategory[]) {
  let netSalary = 0;
  let totalInstallments = 0;
  let otherExpenses = 0;

  for (const tx of txs) {
    if (tx.type === 'income') {
      netSalary += tx.amount;
    } else if (tx.installment_count > 1) {
      totalInstallments += tx.amount;
    } else {
      otherExpenses += tx.amount;
    }
  }

  const grandTotal = totalInstallments + otherExpenses;
  const commitment = netSalary > 0 ? (grandTotal / netSalary) * 100 : grandTotal > 0 ? 100 : 0;
  const freeBalance = netSalary - grandTotal;
  const isCritical = commitment >= 80;

  return { netSalary, totalInstallments, otherExpenses, grandTotal, commitment, freeBalance, isCritical };
}

function DetailRow({
  dot, label, value, bold,
}: { dot: string; label: string; value: number; bold?: boolean }) {
  const isExpense = label !== 'Salário Líquido';
  return (
    <View style={S.tableRow}>
      <View style={S.tableRowLeft}>
        <View style={[S.dot, { backgroundColor: dot }]} />
        <Text style={[S.tableLabel, bold && S.tableLabelBold]}>{label}</Text>
      </View>
      <Text style={[S.tableValue, isExpense ? S.expenseColor : S.incomeColor, bold && S.tableValueBold]}>
        {formatCurrency(value)}
      </Text>
    </View>
  );
}

export default function Dashboard() {
  const db = useSQLiteContext();
  const { selectedMonth } = useFinanceStore();
  const [transactions, setTransactions] = useState<TransactionWithCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTransactionsByMonth(
        db,
        selectedMonth.getFullYear(),
        selectedMonth.getMonth() + 1
      );
      setTransactions(data);
    } finally {
      setLoading(false);
    }
  }, [db, selectedMonth]);

  useEffect(() => { loadData(); }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      getTransactionsByMonth(db, selectedMonth.getFullYear(), selectedMonth.getMonth() + 1)
        .then(setTransactions);
    }, [db, selectedMonth])
  );

  const proj = computeProjections(transactions);
  const clampedPct = Math.min(Math.max(proj.commitment, 0), 100);

  return (
    <SafeAreaView style={S.container} edges={['top']}>
      <MonthSelector />

      {loading ? (
        <View style={S.loadingBox}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={S.scroll} showsVerticalScrollIndicator={false}>

          <View style={[S.heroCard, proj.isCritical ? S.heroCritical : S.heroHealthy]}>
            <View style={S.statusBadge}>
              <Text style={S.statusText}>
                {proj.isCritical ? '🔴 CRÍTICO' : '🟢 SAUDÁVEL'}
              </Text>
            </View>
            <Text style={S.freeLabel}>Saldo Livre</Text>
            <Text style={[S.freeValue, proj.freeBalance < 0 && S.negative]}>
              {formatCurrency(proj.freeBalance)}
            </Text>
          </View>

          <View style={S.card}>
            <View style={S.commitRow}>
              <Text style={S.cardTitle}>Comprometimento</Text>
              <Text style={[S.commitPct, proj.isCritical ? S.pctCritical : S.pctHealthy]}>
                {proj.commitment.toFixed(1)}%
              </Text>
            </View>

            <View style={S.barBg}>
              <View
                style={[
                  S.barFill,
                  { width: `${clampedPct}%` },
                  proj.isCritical ? S.barCritical : S.barHealthy,
                ]}
              />
              <View style={S.barMarker} />
            </View>

            <View style={S.barLabels}>
              <Text style={S.barLabelText}>0%</Text>
              <Text style={[S.barLabelText, { color: '#f59e0b' }]}>80% limite</Text>
              <Text style={S.barLabelText}>100%</Text>
            </View>
          </View>

          <View style={S.card}>
            <Text style={S.cardTitle}>Detalhamento</Text>

            <DetailRow dot="#22c55e" label="Salário Líquido" value={proj.netSalary} />

            <View style={S.divider} />

            <DetailRow dot="#6366f1" label="Total Parcelas" value={proj.totalInstallments} />
            <DetailRow dot="#f97316" label="Outros Gastos" value={proj.otherExpenses} />

            <View style={S.divider} />

            <DetailRow dot="#ef4444" label="Total Geral" value={proj.grandTotal} bold />
          </View>

          {transactions.length === 0 && (
            <View style={S.emptyBox}>
              <Text style={S.emptyTitle}>Nenhuma transação neste mês</Text>
              <Text style={S.emptyText}>
                Registre receitas e despesas na aba Adicionar para ver as projeções.
              </Text>
            </View>
          )}

        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f23' },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 16, paddingBottom: 32, gap: 14 },

  heroCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 6,
  },
  heroHealthy: { backgroundColor: '#052e16', borderWidth: 1, borderColor: '#166534' },
  heroCritical: { backgroundColor: '#2d0a0a', borderWidth: 1, borderColor: '#7f1d1d' },
  statusBadge: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginBottom: 8,
  },
  statusText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  freeLabel: { fontSize: 14, color: '#9ca3af', fontWeight: '500' },
  freeValue: { fontSize: 36, fontWeight: '800', color: '#fff', letterSpacing: -1 },
  negative: { color: '#ef4444' },

  card: {
    backgroundColor: '#1a1a35',
    borderRadius: 16,
    padding: 18,
    gap: 12,
  },
  cardTitle: { fontSize: 13, fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.8 },
  commitRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  commitPct: { fontSize: 22, fontWeight: '800' },
  pctHealthy: { color: '#22c55e' },
  pctCritical: { color: '#ef4444' },

  barBg: {
    height: 10,
    backgroundColor: '#2d2d50',
    borderRadius: 5,
    overflow: 'hidden',
    position: 'relative',
  },
  barFill: { height: 10, borderRadius: 5 },
  barHealthy: { backgroundColor: '#22c55e' },
  barCritical: { backgroundColor: '#ef4444' },
  barMarker: {
    position: 'absolute',
    left: '80%',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#f59e0b',
  },
  barLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  barLabelText: { fontSize: 11, color: '#6b7280' },

  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  tableRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  tableLabel: { fontSize: 14, color: '#d1d5db', fontWeight: '500' },
  tableLabelBold: { color: '#fff', fontWeight: '700', fontSize: 15 },
  tableValue: { fontSize: 14, fontWeight: '600' },
  tableValueBold: { fontSize: 15, fontWeight: '700' },
  incomeColor: { color: '#22c55e' },
  expenseColor: { color: '#f87171' },
  divider: { height: 1, backgroundColor: '#2d2d50', marginVertical: 4 },

  emptyBox: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#6b7280' },
  emptyText: { fontSize: 13, color: '#4b5563', textAlign: 'center', lineHeight: 20 },
});
