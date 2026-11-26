import React, { useMemo } from 'react';
import { Alert, FlatList, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Crypto from 'expo-crypto';
import * as Sharing from 'expo-sharing';
import { ArrowLeft, ExternalLink, FileText, Plus, Trash2 } from 'lucide-react-native';
import { useMobileApp } from '@/context/MobileAppContext';
import { pickDocumentFile, stageOrUploadMedia } from '@/services/mediaService';
import { DocumentItem } from '@/types';

export default function DocumentsVaultScreen() {
  const router = useRouter();
  const { user, isOnline, documents, saveDocument, deleteEntity } = useMobileApp();
  const active = useMemo(() => documents.filter(d => !(d as any).isDeleted), [documents]);

  const handleUpload = async () => {
    if (!user?.id) return;
    try {
      const picked = await pickDocumentFile();
      if (!picked) return;
      const uploaded = await stageOrUploadMedia({
        userId: user.id,
        media: picked,
        isOnline,
        category: 'Vault',
      });
      const now = new Date().toISOString();
      const doc: DocumentItem = {
        id: uploaded.appFileId || `doc_${Crypto.randomUUID()}`,
        title: uploaded.fileName,
        category: 'receipt',
        fileUrl: uploaded.url,
        fileType: uploaded.mimeType,
        fileSize: String(picked.size || 0),
        driveFileId: uploaded.driveFileId,
        uploadedAt: now,
        updatedAt: now,
      };
      await saveDocument(doc, false);
      Alert.alert('Uploaded', `${doc.title} (${uploaded.storageProvider})`);
    } catch (e: any) {
      Alert.alert('Upload Failed', e?.message || 'Could not upload file');
    }
  };

  const handleOpen = async (doc: DocumentItem) => {
    if (doc.fileUrl?.startsWith('file://')) {
      await Sharing.shareAsync(doc.fileUrl);
    } else if (doc.fileUrl) {
      Linking.openURL(doc.fileUrl);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color="#0F172A" />
        </Pressable>
        <Text style={styles.title}>Document Vault ({active.length})</Text>
        <Pressable onPress={handleUpload} style={styles.addBtn}>
          <Plus size={18} color="#FFFFFF" />
        </Pressable>
      </View>

      <FlatList
        data={active}
        keyExtractor={d => d.id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<Text style={styles.empty}>No documents uploaded yet. Tap + to upload PDF/Image.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <FileText size={20} color="#4F46E5" />
            <Pressable onPress={() => handleOpen(item)} style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.meta}>{item.category} • {new Date(item.uploadedAt).toLocaleDateString('en-IN')}</Text>
            </Pressable>
            <Pressable onPress={() => handleOpen(item)} style={{ marginRight: 10 }}>
              <ExternalLink size={16} color="#4F46E5" />
            </Pressable>
            <Pressable onPress={() => deleteEntity('documents', item.id, item.updatedAt)}>
              <Trash2 size={15} color="#94A3B8" />
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  backBtn: { padding: 4 },
  title: { flex: 1, fontSize: 18, fontWeight: '800', color: '#0F172A' },
  addBtn: { backgroundColor: '#4F46E5', padding: 8, borderRadius: 10 },
  empty: { textAlign: 'center', color: '#94A3B8', marginTop: 40 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFF', padding: 14, borderRadius: 14, marginBottom: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  name: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  meta: { fontSize: 11, color: '#64748B', marginTop: 2 },
});
