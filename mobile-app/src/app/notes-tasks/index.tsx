import React, { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { ArrowLeft, CheckSquare, Plus, Square, Trash2 } from 'lucide-react-native';
import { useMobileApp } from '@/context/MobileAppContext';

export default function NotesTasksScreen() {
  const router = useRouter();
  const { notes, tasks, saveNote, saveTask, deleteEntity } = useMobileApp();
  const [tab, setTab] = useState<'tasks' | 'notes'>('tasks');
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const activeTasks = useMemo(() => tasks.filter(t => !(t as any).isDeleted), [tasks]);
  const activeNotes = useMemo(() => notes.filter(n => !(n as any).isDeleted), [notes]);

  const handleSave = async () => {
    if (!title.trim()) return;
    const now = new Date().toISOString();
    if (tab === 'tasks') {
      await saveTask(
        {
          id: `task_${Crypto.randomUUID()}`,
          title: title.trim(),
          description: content.trim(),
          isCompleted: false,
          priority: 'medium',
          createdAt: now,
          updatedAt: now,
        },
        false
      );
    } else {
      await saveNote(
        {
          id: `note_${Crypto.randomUUID()}`,
          title: title.trim(),
          description: content.trim(),
          isPinned: false,
          createdAt: now,
          updatedAt: now,
        },
        false
      );
    }
    setModalOpen(false);
    setTitle('');
    setContent('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color="#0F172A" />
        </Pressable>
        <Text style={styles.title}>Notes & Tasks</Text>
        <Pressable onPress={() => setModalOpen(true)} style={styles.addBtn}>
          <Plus size={18} color="#FFFFFF" />
        </Pressable>
      </View>

      <View style={styles.tabRow}>
        <Pressable onPress={() => setTab('tasks')} style={[styles.tabBtn, tab === 'tasks' && styles.tabBtnActive]}>
          <Text style={[styles.tabText, tab === 'tasks' && { color: '#FFFFFF' }]}>Tasks ({activeTasks.length})</Text>
        </Pressable>
        <Pressable onPress={() => setTab('notes')} style={[styles.tabBtn, tab === 'notes' && styles.tabBtnActive]}>
          <Text style={[styles.tabText, tab === 'notes' && { color: '#FFFFFF' }]}>Notes ({activeNotes.length})</Text>
        </Pressable>
      </View>

      {tab === 'tasks' ? (
        <FlatList
          data={activeTasks}
          keyExtractor={t => t.id}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={<Text style={styles.empty}>No tasks yet.</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Pressable onPress={() => saveTask({ ...item, isCompleted: !item.isCompleted }, true)}>
                {item.isCompleted ? <CheckSquare size={20} color="#059669" /> : <Square size={20} color="#64748B" />}
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemTitle, item.isCompleted && { textDecorationLine: 'line-through', color: '#94A3B8' }]}>
                  {item.title}
                </Text>
                {item.description ? <Text style={styles.itemSub}>{item.description}</Text> : null}
              </View>
              <Pressable onPress={() => deleteEntity('tasks', item.id, item.updatedAt)}>
                <Trash2 size={15} color="#94A3B8" />
              </Pressable>
            </View>
          )}
        />
      ) : (
        <FlatList
          data={activeNotes}
          keyExtractor={n => n.id}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={<Text style={styles.empty}>No notes yet.</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                {item.description ? <Text style={styles.itemSub}>{item.description}</Text> : null}
              </View>
              <Pressable onPress={() => deleteEntity('notes', item.id, item.updatedAt)}>
                <Trash2 size={15} color="#94A3B8" />
              </Pressable>
            </View>
          )}
        />
      )}

      <Modal visible={modalOpen} transparent animationType="slide">
        <View style={styles.backdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New {tab === 'tasks' ? 'Task' : 'Note'}</Text>
            <TextInput style={styles.input} placeholder="Title" value={title} onChangeText={setTitle} />
            <TextInput style={[styles.input, { height: 80 }]} placeholder="Details" multiline value={content} onChangeText={setContent} />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setModalOpen(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleSave} style={styles.saveBtn}>
                <Text style={styles.saveText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  backBtn: { padding: 4 },
  title: { flex: 1, fontSize: 18, fontWeight: '800', color: '#0F172A' },
  addBtn: { backgroundColor: '#4F46E5', padding: 8, borderRadius: 10 },
  tabRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12 },
  tabBtn: { flex: 1, paddingVertical: 9, borderRadius: 10, backgroundColor: '#E2E8F0', alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#4F46E5' },
  tabText: { fontSize: 12, fontWeight: '800', color: '#475569' },
  empty: { textAlign: 'center', color: '#94A3B8', marginTop: 40 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFF', padding: 14, borderRadius: 14, marginBottom: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  itemTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  itemSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, gap: 12 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14 },
  modalActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center' },
  cancelText: { fontWeight: '700', color: '#475569' },
  saveBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#4F46E5', alignItems: 'center' },
  saveText: { fontWeight: '800', color: '#FFFFFF' },
});
