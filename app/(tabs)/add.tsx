import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Modal, FlatList, Alert, Platform, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, addMonths } from 'date-fns';
import { getAllCategories, type Category } from '../../database/categories';
import { getAllCreditCards, type CreditCard } from '../../database/creditCards';
import { createTransaction } from '../../database/transactions';
import { getInvoiceDueDate, formatDatePtBr, parseAmountInput } from '../../utils/creditCardUtils';

type TxType = 'expense' | 'income';
type PaymentMethod = 'cash' | 'pix' | 'debit' | 'credit';

const PAYMENT_METHODS: { key: PaymentMethod; label: string }[] = [
  { key: 'cash', label: 'Dinheiro' },
  { key: 'pix', label: 'Pix' },
  { key: 'debit', label: 'Débito' },
  { key: 'credit', label: 'Crédito' },
];

const INSTALLMENT_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 24];

export default function AddTransaction() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();

  const [txType, setTxType] = useState<TxType>('expense');
  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [date, setDate] = useState(new Date());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [selectedCard, setSelectedCard] = useState<CreditCard | null>(null);
  const [installments, setInstallments] = useState(1);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);

  const loadData = useCallback(async () => {
    const [cats, cards] = await Promise.all([getAllCategories(db), getAllCreditCards(db)]);
    setCategories(cats);
    setCreditCards(cards);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      const loadData = async () => {
        try {
          const [cats, cards] = await Promise.all([
            getAllCategories(db),
            getAllCreditCards(db),
          ]);
          if (isMounted) {
            setCategories(cats);
            setCreditCards(cards);
            console.log('Cartões carregados:', cards.length);
          }
        } catch (error) {
          console.error('Erro ao carregar dados:', error);
        }
      };

      loadData();
      return () => { isMounted = false; };
    }, [db])
  );

  const handleTxTypeChange = (type: TxType) => {
    setTxType(type);
    setSelectedCategory(null);
    if (type === 'income') {
      setPaymentMethod('pix');
      setSelectedCard(null);
      setInstallments(1);
    }
  };

  const handlePaymentMethodChange = (method: PaymentMethod) => {
    setPaymentMethod(method);
    if (method !== 'credit') {
      setSelectedCard(null);
      setInstallments(1);
    }
  };

  const resetForm = () => {
    setAmount('');
    setTitle('');
    setSelectedCategory(null);
    setDate(new Date());
    setPaymentMethod('pix');
    setSelectedCard(null);
    setInstallments(1);
  };

  const handleSave = async () => {
    const numAmount = parseAmountInput(amount);
    if (!amount || numAmount <= 0) { Alert.alert('Atenção', 'Informe um valor válido.'); return; }
    if (!title.trim()) { Alert.alert('Atenção', 'Informe a descrição.'); return; }
    if (!selectedCategory) { Alert.alert('Atenção', 'Selecione uma categoria.'); return; }
    if (paymentMethod === 'credit' && !selectedCard) { Alert.alert('Atenção', 'Selecione o cartão de crédito.'); return; }

    setSaving(true);
    try {
      if (paymentMethod === 'credit' && selectedCard && installments > 1) {
        const installmentAmount = parseFloat((numAmount / installments).toFixed(2));

        const firstDue = getInvoiceDueDate(date, selectedCard.due_day, selectedCard.closing_days_before_due);

        const firstId = await createTransaction(db, {
          title: `${title.trim()} (1/${installments})`,
          type: 'expense',
          amount: installmentAmount,
          date: format(firstDue, 'yyyy-MM-dd'),
          category_id: selectedCategory.id,
          payment_method: 'credit',
          credit_card_id: selectedCard.id,
          installment_count: installments,
          current_installment: 1,
          base_transaction_id: null,
        });

        await db.runAsync(
          'UPDATE transactions SET base_transaction_id = ? WHERE id = ?',
          [firstId, firstId]
        );

        for (let i = 1; i < installments; i++) {
          const due = addMonths(firstDue, i);
          await createTransaction(db, {
            title: `${title.trim()} (${i + 1}/${installments})`,
            type: 'expense',
            amount: installmentAmount,
            date: format(due, 'yyyy-MM-dd'),
            category_id: selectedCategory.id,
            payment_method: 'credit',
            credit_card_id: selectedCard.id,
            installment_count: installments,
            current_installment: i + 1,
            base_transaction_id: firstId,
          });
        }
      } else {
        let txDate = format(date, 'yyyy-MM-dd');
        if (paymentMethod === 'credit' && selectedCard) {
          const due = getInvoiceDueDate(date, selectedCard.due_day, selectedCard.closing_days_before_due);
          txDate = format(due, 'yyyy-MM-dd');
        }
        await createTransaction(db, {
          title: title.trim(),
          type: txType,
          amount: numAmount,
          date: txDate,
          category_id: selectedCategory.id,
          payment_method: paymentMethod,
          credit_card_id: paymentMethod === 'credit' && selectedCard ? selectedCard.id : null,
          installment_count: 1,
          current_installment: 1,
          base_transaction_id: null,
        });
      }

      resetForm();
      Alert.alert('Sucesso', 'Transação registrada com sucesso! ✓');
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível salvar a transação.');
    } finally {
      setSaving(false);
    }
  };

  const filteredCategories = categories.filter((c) => c.type === txType);

  return (
    <SafeAreaView style={S.container} edges={['top']}>
      <View style={S.typeToggle}>
        <TouchableOpacity
          style={[S.typeBtn, txType === 'expense' && S.typeBtnExpense]}
          onPress={() => handleTxTypeChange('expense')}
        >
          <Text style={[S.typeBtnText, txType === 'expense' && S.typeBtnTextActive]}>
            Despesa
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[S.typeBtn, txType === 'income' && S.typeBtnIncome]}
          onPress={() => handleTxTypeChange('income')}
        >
          <Text style={[S.typeBtnText, txType === 'income' && S.typeBtnTextActive]}>
            Receita
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={S.form} keyboardShouldPersistTaps="handled">

          <View style={S.amountRow}>
            <Text style={S.currencySymbol}>R$</Text>
            <TextInput
              style={S.amountInput}
              value={amount}
              onChangeText={(v) => setAmount(v.replace(/[^0-9,]/g, ''))}
              placeholder="0,00"
              placeholderTextColor="#374151"
              keyboardType="decimal-pad"
            />
          </View>

          <View style={S.field}>
            <Text style={S.fieldLabel}>Descrição</Text>
            <TextInput
              style={S.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Ex: Almoço no restaurante"
              placeholderTextColor="#6b7280"
            />
          </View>

          <View style={S.field}>
            <Text style={S.fieldLabel}>Categoria</Text>
            <TouchableOpacity style={S.selector} onPress={() => setShowCategoryModal(true)}>
              {selectedCategory ? (
                <View style={S.selectorValue}>
                  <View style={[S.selectorIcon, { backgroundColor: selectedCategory.color + '33' }]}>
                    <Ionicons name={selectedCategory.icon as any} size={16} color={selectedCategory.color} />
                  </View>
                  <Text style={S.selectorText}>{selectedCategory.name}</Text>
                </View>
              ) : (
                <Text style={S.selectorPlaceholder}>Selecione uma categoria</Text>
              )}
              <Ionicons name="chevron-forward" size={18} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <View style={S.field}>
            <Text style={S.fieldLabel}>Data</Text>
            <TouchableOpacity style={S.selector} onPress={() => setShowDatePicker(true)}>
              <Text style={S.selectorText}>{formatDatePtBr(date)}</Text>
              <Ionicons name="calendar-outline" size={18} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display="default"
              onChange={(_, d) => { setShowDatePicker(false); if (d) setDate(d); }}
            />
          )}

          <View style={S.field}>
            <Text style={S.fieldLabel}>Forma de pagamento</Text>
            <View style={S.paymentRow}>
              {PAYMENT_METHODS.filter((m) => txType === 'income' ? m.key !== 'credit' : true).map((m) => (
                <TouchableOpacity
                  key={m.key}
                  style={[S.paymentBtn, paymentMethod === m.key && S.paymentBtnActive]}
                  onPress={() => handlePaymentMethodChange(m.key)}
                >
                  <Text style={[S.paymentBtnText, paymentMethod === m.key && S.paymentBtnTextActive]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {paymentMethod === 'credit' && (
            <>
              <View style={S.field}>
                <Text style={S.fieldLabel}>Cartão de Crédito</Text>
                <TouchableOpacity style={S.selector} onPress={() => setShowCardModal(true)}>
                  {selectedCard ? (
                    <Text style={S.selectorText}>
                      {selectedCard.nickname} **** {selectedCard.last_four_digits}
                    </Text>
                  ) : (
                    <Text style={S.selectorPlaceholder}>Selecione o cartão</Text>
                  )}
                  <Ionicons name="chevron-forward" size={18} color="#6b7280" />
                </TouchableOpacity>
              </View>

              <View style={S.field}>
                <Text style={S.fieldLabel}>Parcelas</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {INSTALLMENT_OPTIONS.map((n) => (
                    <TouchableOpacity
                      key={n}
                      style={[S.installmentBtn, installments === n && S.installmentBtnActive]}
                      onPress={() => setInstallments(n)}
                    >
                      <Text style={[S.installmentBtnText, installments === n && S.installmentBtnTextActive]}>
                        {n}x
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </>
          )}

          <TouchableOpacity
            style={[S.saveButton, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={S.saveButtonText}>{saving ? 'Salvando...' : 'Salvar Transação'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showCategoryModal} animationType="slide" transparent statusBarTranslucent>
        <View style={S.modalOverlay}>
          <View style={[
            S.pickerSheet,
            { paddingBottom: insets.bottom > 0 ? insets.bottom + 20 : 30 }
          ]}>
            <View style={S.pickerHeader}>
              <Text style={S.pickerTitle}>Categoria</Text>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={filteredCategories}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[S.pickerItem, selectedCategory?.id === item.id && S.pickerItemSelected]}
                  onPress={() => { setSelectedCategory(item); setShowCategoryModal(false); }}
                >
                  <View style={[S.pickerIcon, { backgroundColor: item.color + '33' }]}>
                    <Ionicons name={item.icon as any} size={18} color={item.color} />
                  </View>
                  <Text style={S.pickerItemText}>{item.name}</Text>
                  {selectedCategory?.id === item.id && (
                    <Ionicons name="checkmark" size={18} color="#6366f1" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={showCardModal} animationType="slide" transparent statusBarTranslucent>
        <View style={S.modalOverlay}>
          <View style={[
            S.pickerSheet,
            { paddingBottom: insets.bottom > 0 ? insets.bottom + 20 : 30 }
          ]}>
            <View style={S.pickerHeader}>
              <Text style={S.pickerTitle}>Cartão de Crédito</Text>
              <TouchableOpacity onPress={() => setShowCardModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            {creditCards.length === 0 ? (
              <View style={S.noItems}>
                <Text style={S.noItemsText}>Nenhum cartão cadastrado.</Text>
                <Text style={S.noItemsSub}>Vá em Configurações → Cartões de Crédito.</Text>
              </View>
            ) : (
              <FlatList
                data={creditCards}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[S.pickerItem, selectedCard?.id === item.id && S.pickerItemSelected]}
                    onPress={() => { setSelectedCard(item); setShowCardModal(false); }}
                  >
                    <View style={S.pickerCardIcon}>
                      <Ionicons name="card-outline" size={18} color="#6366f1" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={S.pickerItemText}>{item.nickname}</Text>
                      <Text style={S.pickerItemSub}>**** {item.last_four_digits}</Text>
                    </View>
                    {selectedCard?.id === item.id && (
                      <Ionicons name="checkmark" size={18} color="#6366f1" />
                    )}
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f23' },
  typeToggle: {
    flexDirection: 'row', margin: 16,
    backgroundColor: '#1a1a35', borderRadius: 14, padding: 4,
  },
  typeBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 11 },
  typeBtnExpense: { backgroundColor: '#ef4444' },
  typeBtnIncome: { backgroundColor: '#22c55e' },
  typeBtnText: { fontSize: 15, fontWeight: '700', color: '#6b7280' },
  typeBtnTextActive: { color: '#fff' },
  form: { paddingHorizontal: 16, paddingBottom: 40 },
  amountRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 20, gap: 8,
  },
  currencySymbol: { fontSize: 28, fontWeight: '700', color: '#9ca3af' },
  amountInput: {
    fontSize: 48, fontWeight: '700', color: '#fff', minWidth: 160, textAlign: 'center',
  },
  field: { marginBottom: 16 },
  fieldLabel: {
    fontSize: 12, fontWeight: '600', color: '#9ca3af',
    marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#1a1a35', borderRadius: 12, padding: 14,
    fontSize: 15, color: '#fff', borderWidth: 1, borderColor: '#2d2d50',
  },
  selector: {
    backgroundColor: '#1a1a35', borderRadius: 12, padding: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: '#2d2d50',
  },
  selectorValue: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  selectorIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  selectorText: { fontSize: 15, color: '#fff', flex: 1 },
  selectorPlaceholder: { fontSize: 15, color: '#6b7280' },
  paymentRow: { flexDirection: 'row', gap: 8 },
  paymentBtn: {
    flex: 1, paddingVertical: 10, alignItems: 'center',
    backgroundColor: '#1a1a35', borderRadius: 10, borderWidth: 1, borderColor: '#2d2d50',
  },
  paymentBtnActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  paymentBtnText: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  paymentBtnTextActive: { color: '#fff' },
  installmentBtn: {
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: '#1a1a35', borderRadius: 10, borderWidth: 1, borderColor: '#2d2d50', marginRight: 8,
  },
  installmentBtnActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  installmentBtnText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  installmentBtnTextActive: { color: '#fff' },
  saveButton: {
    backgroundColor: '#6366f1', borderRadius: 14, padding: 16,
    alignItems: 'center', marginTop: 8,
  },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' },
  pickerSheet: {
    backgroundColor: '#1a1a35', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '70%',
  },
  pickerHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: '#2d2d50',
  },
  pickerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  pickerItem: {
    flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12,
    borderBottomWidth: 1, borderBottomColor: '#2d2d50',
  },
  pickerItemSelected: { backgroundColor: '#2d2d50' },
  pickerIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  pickerCardIcon: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: '#2d2d50', alignItems: 'center', justifyContent: 'center',
  },
  pickerItemText: { flex: 1, fontSize: 15, fontWeight: '500', color: '#fff' },
  pickerItemSub: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  noItems: { padding: 32, alignItems: 'center', gap: 8 },
  noItemsText: { color: '#9ca3af', fontSize: 16, fontWeight: '500' },
  noItemsSub: { color: '#6b7280', fontSize: 13, textAlign: 'center' },
});
