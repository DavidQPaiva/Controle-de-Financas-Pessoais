import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput, Modal,
  Alert, StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { router } from 'expo-router';
import {
  getAllCreditCards, createCreditCard, updateCreditCard, deleteCreditCard,
  type CreditCard,
} from '../database/creditCards';

interface ModalProps {
  visible: boolean;
  card: CreditCard | null;
  onSave: (data: Omit<CreditCard, 'id'>) => Promise<void>;
  onClose: () => void;
}

function CardFormModal({ visible, card, onSave, onClose }: ModalProps) {
  const [nickname, setNickname] = useState('');
  const [lastFour, setLastFour] = useState('');
  const [closingDaysBeforeDue, setClosingDaysBeforeDue] = useState('7');
  const [dueDay, setDueDay] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      if (card) {
        setNickname(card.nickname);
        setLastFour(card.last_four_digits);
        setClosingDaysBeforeDue(String(card.closing_days_before_due));
        setDueDay(String(card.due_day));
      } else {
        setNickname('');
        setLastFour('');
        setClosingDaysBeforeDue('7');
        setDueDay('');
      }
    }
  }, [visible, card]);

  const handleSave = async () => {
    if (!nickname.trim()) { Alert.alert('Atenção', 'Informe o apelido do cartão.'); return; }
    if (!/^\d{4}$/.test(lastFour)) { Alert.alert('Atenção', 'Informe exatamente 4 dígitos.'); return; }
    const cDay = parseInt(closingDaysBeforeDue, 10);
    const vDay = parseInt(dueDay, 10);
    if (isNaN(cDay) || cDay < 1 || cDay > 31) { Alert.alert('Atenção', 'Dia de fechamento inválido (1–31).'); return; }
    if (isNaN(vDay) || vDay < 1 || vDay > 31) { Alert.alert('Atenção', 'Dia de vencimento inválido (1–31).'); return; }

    setSaving(true);
    try {
      await onSave({
        nickname,
        last_four_digits: lastFour,
        closing_days_before_due: Number(closingDaysBeforeDue) || 7,
        due_day: Number(dueDay) || 10,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <KeyboardAvoidingView
        style={S.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView keyboardShouldPersistTaps="handled">
          <View style={S.sheet}>
            <Text style={S.sheetTitle}>{card ? 'Editar Cartão' : 'Novo Cartão'}</Text>

            <Text style={S.label}>Apelido</Text>
            <TextInput
              style={S.input}
              value={nickname}
              onChangeText={setNickname}
              placeholder="Ex: Nubank, Itaú Platinum"
              placeholderTextColor="#6b7280"
              autoFocus
            />

            <Text style={S.label}>Últimos 4 dígitos</Text>
            <TextInput
              style={S.input}
              value={lastFour}
              onChangeText={(t) => setLastFour(t.replace(/\D/g, '').slice(0, 4))}
              placeholder="0000"
              placeholderTextColor="#6b7280"
              keyboardType="number-pad"
              maxLength={4}
            />

            <View style={S.rowInputs}>
              <View style={{ flex: 1 }}>
                <Text style={S.label}>Dias para Fechamento</Text>
                <TextInput
                  style={S.input}
                  value={closingDaysBeforeDue}
                  onChangeText={(t) => setClosingDaysBeforeDue(t.replace(/\D/g, '').slice(0, 2))}
                  placeholder="1–31"
                  placeholderTextColor="#6b7280"
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={S.label}>Dia de vencimento</Text>
                <TextInput
                  style={S.input}
                  value={dueDay}
                  onChangeText={(t) => setDueDay(t.replace(/\D/g, '').slice(0, 2))}
                  placeholder="1–31"
                  placeholderTextColor="#6b7280"
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>
            </View>

            <View style={S.modalActions}>
              <TouchableOpacity style={S.cancelBtn} onPress={onClose}>
                <Text style={S.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={S.saveBtn} onPress={handleSave} disabled={saving}>
                <Text style={S.saveBtnText}>{saving ? 'Salvando...' : 'Salvar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function CreditCardsScreen() {
  const db = useSQLiteContext();
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<CreditCard | null>(null);

  const load = useCallback(async () => {
    setCards(await getAllCreditCards(db));
  }, [db]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (data: Omit<CreditCard, 'id'>) => {
    if (editing) {
      await updateCreditCard(db, editing.id, data);
    } else {
      await createCreditCard(db, data);
    }
    await load();
    setModalVisible(false);
    setEditing(null);
  };

  const handleDelete = (id: number, name: string) => {
    Alert.alert('Excluir Cartão', `Excluir "${name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => { await deleteCreditCard(db, id); await load(); } },
    ]);
  };

  return (
    <SafeAreaView style={S.container} edges={['top']}>
      <View style={S.header}>
        <TouchableOpacity onPress={() => router.back()} style={S.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={S.title}>Cartões de Crédito</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={cards}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={S.listContent}
        renderItem={({ item }) => (
          <View style={S.row}>
            <View style={S.cardIcon}>
              <Ionicons name="card-outline" size={22} color="#6366f1" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={S.cardName}>{item.nickname}</Text>
              <Text style={S.cardInfo}>
                **** {item.last_four_digits} · Fecha dia {item.closing_days_before_due} · Vence dia {item.due_day}
              </Text>
            </View>
            <View style={S.rowActions}>
              <TouchableOpacity style={S.actionBtn} onPress={() => { setEditing(item); setModalVisible(true); }}>
                <Ionicons name="pencil-outline" size={18} color="#9ca3af" />
              </TouchableOpacity>
              <TouchableOpacity style={S.actionBtn} onPress={() => handleDelete(item.id, item.nickname)}>
                <Ionicons name="trash-outline" size={18} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={S.empty}>
            <Ionicons name="card-outline" size={52} color="#2d2d50" />
            <Text style={S.emptyTitle}>Nenhum cartão cadastrado</Text>
            <Text style={S.emptyText}>Adicione um cartão para registrar despesas parceladas.</Text>
          </View>
        }
      />

      <TouchableOpacity style={S.fab} onPress={() => { setEditing(null); setModalVisible(true); }}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <CardFormModal
        visible={modalVisible}
        card={editing}
        onSave={handleSave}
        onClose={() => { setModalVisible(false); setEditing(null); }}
      />
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f23' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#2d2d50',
  },
  backBtn: { padding: 4 },
  title: { fontSize: 20, fontWeight: '700', color: '#fff' },
  listContent: { padding: 16, paddingBottom: 100 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1a1a35', borderRadius: 12,
    padding: 14, marginBottom: 10, gap: 12,
  },
  cardIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#2d2d50', alignItems: 'center', justifyContent: 'center',
  },
  cardName: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 3 },
  cardInfo: { fontSize: 12, color: '#9ca3af' },
  rowActions: { flexDirection: 'row' },
  actionBtn: { padding: 8 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 10, paddingHorizontal: 32 },
  emptyTitle: { color: '#9ca3af', fontSize: 16, fontWeight: '600' },
  emptyText: { color: '#6b7280', fontSize: 13, textAlign: 'center' },
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center',
    elevation: 6, shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, marginBottom:50
  },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' },
  sheet: {
    backgroundColor: '#1a1a35', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24,
  },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 20, textAlign: 'center' },
  label: { fontSize: 12, fontWeight: '600', color: '#9ca3af', marginTop: 14, marginBottom: 8, letterSpacing: 0.5 },
  input: {
    backgroundColor: '#0f0f23', borderRadius: 10, padding: 14,
    fontSize: 16, color: '#fff', borderWidth: 1, borderColor: '#2d2d50',
  },
  rowInputs: { flexDirection: 'row' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelBtn: {
    flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 12,
    backgroundColor: '#0f0f23', borderWidth: 1, borderColor: '#2d2d50',
  },
  cancelBtnText: { color: '#9ca3af', fontSize: 16, fontWeight: '600' },
  saveBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 12, backgroundColor: '#6366f1' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
