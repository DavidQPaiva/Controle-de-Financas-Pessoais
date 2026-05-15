import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from '@react-navigation/native';
import { useFinanceStore } from '../../store/useFinanceStore';
import {
  getTransactionsByMonth, deleteTransaction, deleteTransactionGroup,
  type TransactionWithCategory,
} from '../../database/transactions';
import { formatCurrency } from '../../utils/creditCardUtils';
import MonthSelector from '../../components/MonthSelector';

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Dinheiro',
  pix: 'Pix',
  debit: 'Débito',
  credit: 'Crédito',
};

function TxRow({ item, onDelete }: { item: TransactionWithCategory; onDelete: (item: TransactionWithCategory) => void }) {
  const isIncome = item.type === 'income';
  const day = item.date.slice(8, 10);
  const month = item.date.slice(5, 7);

  return (
    <View style={S.txRow}>
      <View style={[S.txIconWrap, { backgroundColor: item.category_color + '26' }]}>
        <Ionicons name={item.category_icon as any} size={20} color={item.category_color} />
      </View>

      <View style={S.txBody}>
        <Text style={S.txTitle} numberOfLines={1}>{item.title}</Text>
        <View style={S.txMeta}>
          <Text style={[S.txTag, { color: item.category_color }]}>{item.category_name}</Text>
          <Text style={S.txDot}>·</Text>
          <Text style={S.txMetaText}>{day}/{month}</Text>
          <Text style={S.txDot}>·</Text>
          <Text style={S.txMetaText}>{PAYMENT_LABELS[item.payment_method]}</Text>
        </View>
      </View>

      <View style={S.txRight}>
        <Text style={[S.txAmount, isIncome ? S.incomeColor : S.expenseColor]}>
          {isIncome ? '+' : '-'}{formatCurrency(item.amount)}
        </Text>
        <TouchableOpacity onPress={() => onDelete(item)} style={S.txDeleteBtn} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
          <Ionicons name="trash-outline" size={15} color="#4b5563" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function Statement() {
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

  const handleDelete = (tx: TransactionWithCategory) => {
    const isInstallment = tx.installment_count > 1 && tx.base_transaction_id != null;

    if (isInstallment) {
      Alert.alert(
        'Excluir Transação',
        `"${tx.title}" é uma parcela (${tx.current_installment}/${tx.installment_count}). O que deseja excluir?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Só esta parcela',
            onPress: async () => { await deleteTransaction(db, tx.id); await loadData(); },
          },
          {
            text: 'Todas as parcelas',
            style: 'destructive',
            onPress: async () => {
              await deleteTransactionGroup(db, tx.base_transaction_id!);
              await loadData();
            },
          },
        ]
      );
    } else {
      Alert.alert(
        'Excluir Transação',
        `Excluir "${tx.title}"?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Excluir',
            style: 'destructive',
            onPress: async () => { await deleteTransaction(db, tx.id); await loadData(); },
          },
        ]
      );
    }
  };

  const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = income - expense;

  return (
    <SafeAreaView style={S.container} edges={['top']}>
      <MonthSelector />

      {!loading && transactions.length > 0 && (
        <View style={S.summaryBar}>
          <View style={S.summaryItem}>
            <Text style={S.summaryLabel}>Entradas</Text>
            <Text style={[S.summaryValue, S.incomeColor]}>+{formatCurrency(income)}</Text>
          </View>
          <View style={S.summaryDivider} />
          <View style={S.summaryItem}>
            <Text style={S.summaryLabel}>Saídas</Text>
            <Text style={[S.summaryValue, S.expenseColor]}>-{formatCurrency(expense)}</Text>
          </View>
          <View style={S.summaryDivider} />
          <View style={S.summaryItem}>
            <Text style={S.summaryLabel}>Saldo</Text>
            <Text style={[S.summaryValue, balance >= 0 ? S.incomeColor : S.expenseColor]}>
              {formatCurrency(balance)}
            </Text>
          </View>
        </View>
      )}

      {loading ? (
        <View style={S.loadingBox}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={S.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <TxRow item={item} onDelete={handleDelete} />}
          ItemSeparatorComponent={() => <View style={S.separator} />}
          ListHeaderComponent={
            transactions.length > 0 ? (
              <Text style={S.listCount}>{transactions.length} transaç{transactions.length === 1 ? 'ão' : 'ões'}</Text>
            ) : null
          }
          ListEmptyComponent={
            <View style={S.emptyBox}>
              <Ionicons name="receipt-outline" size={56} color="#2d2d50" />
              <Text style={S.emptyTitle}>Nenhuma transação</Text>
              <Text style={S.emptyText}>
                Não há lançamentos neste mês.{'\n'}Use a aba Adicionar para registrar.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f23' },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  summaryBar: {
    flexDirection: 'row',
    backgroundColor: '#1a1a35',
    borderBottomWidth: 1,
    borderBottomColor: '#2d2d50',
  },
  summaryItem: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  summaryLabel: { fontSize: 11, color: '#6b7280', fontWeight: '600', marginBottom: 3 },
  summaryValue: { fontSize: 13, fontWeight: '700' },
  summaryDivider: { width: 1, backgroundColor: '#2d2d50', marginVertical: 8 },

  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32 },
  listCount: { fontSize: 12, color: '#6b7280', fontWeight: '600', paddingVertical: 8 },
  separator: { height: 1, backgroundColor: '#1a1a35', marginLeft: 68 },

  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  txIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  txBody: { flex: 1, gap: 4 },
  txTitle: { fontSize: 14, fontWeight: '600', color: '#fff' },
  txMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  txTag: { fontSize: 11, fontWeight: '600' },
  txDot: { fontSize: 11, color: '#374151' },
  txMetaText: { fontSize: 11, color: '#6b7280' },
  txRight: { alignItems: 'flex-end', gap: 6, flexShrink: 0 },
  txAmount: { fontSize: 14, fontWeight: '700' },
  txDeleteBtn: { padding: 2 },
  incomeColor: { color: '#22c55e' },
  expenseColor: { color: '#f87171' },

  emptyBox: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: '#6b7280' },
  emptyText: { fontSize: 13, color: '#4b5563', textAlign: 'center', lineHeight: 20 },
});
