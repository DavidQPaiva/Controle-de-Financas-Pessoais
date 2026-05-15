import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput, Modal,
  Alert, ScrollView, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { router } from 'expo-router';
import {
  getAllCategories, createCategory, updateCategory, deleteCategory,
  type Category,
} from '../database/categories';

const COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#ec4899',
  '#f43f5e', '#6b7280',
];

const ICONS = [
  'restaurant-outline', 'home-outline', 'car-outline', 'school-outline',
  'game-controller-outline', 'medkit-outline', 'airplane-outline', 'basket-outline',
  'repeat-outline', 'sparkles-outline', 'shirt-outline', 'cart-outline',
  'cash-outline', 'briefcase-outline', 'trending-up-outline', 'phone-portrait-outline',
  'musical-notes-outline', 'heart-outline', 'paw-outline', 'fitness-outline',
  'pizza-outline', 'cafe-outline', 'gift-outline', 'book-outline',
  'bicycle-outline', 'bus-outline', 'train-outline', 'add-circle-outline',
  'ellipsis-horizontal-outline',
];

interface ModalProps {
  visible: boolean;
  category: Category | null;
  defaultType: 'expense' | 'income';
  onSave: (data: Omit<Category, 'id'>) => Promise<void>;
  onClose: () => void;
}

function CategoryFormModal({ visible, category, defaultType, onSave, onClose }: ModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [color, setColor] = useState(COLORS[0]);
  const [icon, setIcon] = useState(ICONS[0]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      if (category) {
        setName(category.name);
        setType(category.type);
        setColor(category.color);
        setIcon(category.icon);
      } else {
        setName('');
        setType(defaultType);
        setColor(COLORS[0]);
        setIcon(ICONS[0]);
      }
    }
  }, [visible, category, defaultType]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Atenção', 'Informe o nome da categoria.');
      return;
    }
    setSaving(true);
    try {
      await onSave({ name: name.trim(), type, color, icon });
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
        <View style={S.sheet}>
          <Text style={S.sheetTitle}>
            {category ? 'Editar Categoria' : 'Nova Categoria'}
          </Text>

          <Text style={S.label}>Nome</Text>
          <TextInput
            style={S.input}
            value={name}
            onChangeText={setName}
            placeholder="Ex: Alimentação"
            placeholderTextColor="#6b7280"
            autoFocus
          />

          {!category && (
            <>
              <Text style={S.label}>Tipo</Text>
              <View style={S.toggleRow}>
                <TouchableOpacity
                  style={[S.toggleBtn, type === 'expense' && S.toggleExpenseActive]}
                  onPress={() => setType('expense')}
                >
                  <Text style={[S.toggleBtnText, type === 'expense' && S.toggleBtnTextActive]}>
                    Despesa
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[S.toggleBtn, type === 'income' && S.toggleIncomeActive]}
                  onPress={() => setType('income')}
                >
                  <Text style={[S.toggleBtnText, type === 'income' && S.toggleBtnTextActive]}>
                    Receita
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          <Text style={S.label}>Cor</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
            {COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[S.swatch, { backgroundColor: c }, color === c && S.swatchSelected]}
                onPress={() => setColor(c)}
              />
            ))}
          </ScrollView>

          <Text style={S.label}>Ícone</Text>
          <ScrollView style={{ maxHeight: 150 }} showsVerticalScrollIndicator={false}>
            <View style={S.iconGrid}>
              {ICONS.map((ic) => (
                <TouchableOpacity
                  key={ic}
                  style={[S.iconBtn, icon === ic && { backgroundColor: color }]}
                  onPress={() => setIcon(ic)}
                >
                  <Ionicons name={ic as any} size={22} color={icon === ic ? '#fff' : '#9ca3af'} />
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <View style={S.modalActions}>
            <TouchableOpacity style={S.cancelBtn} onPress={onClose}>
              <Text style={S.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={S.saveBtn} onPress={handleSave} disabled={saving}>
              <Text style={S.saveBtnText}>{saving ? 'Salvando...' : 'Salvar'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function CategoriesScreen() {
  const db = useSQLiteContext();
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeType, setActiveType] = useState<'expense' | 'income'>('expense');
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);

  const load = useCallback(async () => {
    setCategories(await getAllCategories(db));
  }, [db]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (data: Omit<Category, 'id'>) => {
    if (editing) {
      await updateCategory(db, editing.id, data);
    } else {
      await createCategory(db, data);
    }
    await load();
    setModalVisible(false);
    setEditing(null);
  };

  const handleDelete = (id: number, name: string) => {
    Alert.alert(
      'Excluir Categoria',
      `Excluir "${name}"?\n\nTransações vinculadas não serão excluídas.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: async () => { await deleteCategory(db, id); await load(); } },
      ]
    );
  };

  const filtered = categories.filter((c) => c.type === activeType);

  return (
    <SafeAreaView style={S.container} edges={['top']}>
      <View style={S.header}>
        <TouchableOpacity onPress={() => router.back()} style={S.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={S.title}>Categorias</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={S.typeTabs}>
        <TouchableOpacity
          style={[S.typeTab, activeType === 'expense' && S.typeExpenseActive]}
          onPress={() => setActiveType('expense')}
        >
          <Text style={[S.typeTabText, activeType === 'expense' && S.typeTabTextActive]}>
            Despesas
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[S.typeTab, activeType === 'income' && S.typeIncomeActive]}
          onPress={() => setActiveType('income')}
        >
          <Text style={[S.typeTabText, activeType === 'income' && S.typeTabTextActive]}>
            Receitas
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={S.listContent}
        renderItem={({ item }) => (
          <View style={S.row}>
            <View style={[S.iconCircle, { backgroundColor: item.color + '33' }]}>
              <Ionicons name={item.icon as any} size={20} color={item.color} />
            </View>
            <Text style={S.rowName} numberOfLines={1}>{item.name}</Text>
            <View style={S.rowActions}>
              <TouchableOpacity
                style={S.actionBtn}
                onPress={() => { setEditing(item); setModalVisible(true); }}
              >
                <Ionicons name="pencil-outline" size={18} color="#9ca3af" />
              </TouchableOpacity>
              <TouchableOpacity
                style={S.actionBtn}
                onPress={() => handleDelete(item.id, item.name)}
              >
                <Ionicons name="trash-outline" size={18} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={S.empty}>
            <Text style={S.emptyText}>Nenhuma categoria encontrada.</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={S.fab}
        onPress={() => { setEditing(null); setModalVisible(true); }}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <CategoryFormModal
        visible={modalVisible}
        category={editing}
        defaultType={activeType}
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
  typeTabs: {
    flexDirection: 'row', margin: 16, backgroundColor: '#1a1a35',
    borderRadius: 12, padding: 4,
  },
  typeTab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 9 },
  typeExpenseActive: { backgroundColor: '#ef4444' },
  typeIncomeActive: { backgroundColor: '#22c55e' },
  typeTabText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  typeTabTextActive: { color: '#fff' },
  listContent: { paddingHorizontal: 16, paddingBottom: 100 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1a1a35', borderRadius: 12,
    padding: 14, marginBottom: 8,
  },
  iconCircle: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  rowName: { flex: 1, fontSize: 15, fontWeight: '500', color: '#fff' },
  rowActions: { flexDirection: 'row' },
  actionBtn: { padding: 8 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: '#6b7280', fontSize: 15 },
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center',
    elevation: 6, shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8,
  },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' },
  sheet: {
    backgroundColor: '#1a1a35', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, maxHeight: '90%',
  },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 20, textAlign: 'center' },
  label: { fontSize: 12, fontWeight: '600', color: '#9ca3af', marginTop: 14, marginBottom: 8, letterSpacing: 0.5 },
  input: {
    backgroundColor: '#0f0f23', borderRadius: 10, padding: 14,
    fontSize: 16, color: '#fff', borderWidth: 1, borderColor: '#2d2d50',
  },
  toggleRow: { flexDirection: 'row', gap: 8 },
  toggleBtn: {
    flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10,
    backgroundColor: '#0f0f23', borderWidth: 1, borderColor: '#2d2d50',
  },
  toggleExpenseActive: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
  toggleIncomeActive: { backgroundColor: '#22c55e', borderColor: '#22c55e' },
  toggleBtnText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  toggleBtnTextActive: { color: '#fff' },
  swatch: { width: 32, height: 32, borderRadius: 16, marginRight: 10 },
  swatchSelected: { borderWidth: 3, borderColor: '#fff' },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 8 },
  iconBtn: {
    width: 44, height: 44, borderRadius: 10,
    backgroundColor: '#0f0f23', alignItems: 'center', justifyContent: 'center',
  },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: {
    flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 12,
    backgroundColor: '#0f0f23', borderWidth: 1, borderColor: '#2d2d50',
  },
  cancelBtnText: { color: '#9ca3af', fontSize: 16, fontWeight: '600' },
  saveBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 12, backgroundColor: '#6366f1' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
