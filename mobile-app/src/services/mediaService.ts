import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Crypto from 'expo-crypto';
import { apiRequest } from '@/services/apiClient';

export interface PickedMediaResult {
  uri: string;
  fileName: string;
  mimeType: string;
  size?: number;
}

export interface UploadedMediaResult {
  appFileId: string;
  fileName: string;
  mimeType: string;
  url: string;
  localUri: string;
  storageProvider: 'google-drive' | 'supabase-storage' | 'local-offline';
  driveFileId?: string;
}

export async function pickImageFromCamera(): Promise<PickedMediaResult | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) {
    throw new Error('Camera permission is required to capture receipts.');
  }
  const res = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: 0.78,
  });
  if (res.canceled || !res.assets?.[0]) return null;
  const asset = res.assets[0];
  return {
    uri: asset.uri,
    fileName: asset.fileName || `receipt_${Date.now()}.jpg`,
    mimeType: asset.mimeType || 'image/jpeg',
    size: asset.fileSize,
  };
}

export async function pickImageFromGallery(): Promise<PickedMediaResult | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    throw new Error('Gallery permission is required to select images.');
  }
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.8,
  });
  if (res.canceled || !res.assets?.[0]) return null;
  const asset = res.assets[0];
  return {
    uri: asset.uri,
    fileName: asset.fileName || `photo_${Date.now()}.jpg`,
    mimeType: asset.mimeType || 'image/jpeg',
    size: asset.fileSize,
  };
}

export async function pickDocumentFile(): Promise<PickedMediaResult | null> {
  const res = await DocumentPicker.getDocumentAsync({
    type: ['application/pdf', 'image/*'],
    copyToCacheDirectory: true,
  });
  if (res.canceled || !res.assets?.[0]) return null;
  const asset = res.assets[0];
  return {
    uri: asset.uri,
    fileName: asset.name || `doc_${Date.now()}`,
    mimeType: asset.mimeType || 'application/octet-stream',
    size: asset.size,
  };
}

export async function stageOrUploadMedia(params: {
  userId: string;
  media: PickedMediaResult;
  isOnline: boolean;
  customerId?: string;
  customerName?: string;
  folderName?: string;
  category?: string;
}): Promise<UploadedMediaResult> {
  const appFileId = `file_${Crypto.randomUUID()}`;
  const safeName = params.media.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const localDir = `${FileSystem.documentDirectory}khatapro_media/`;
  await FileSystem.makeDirectoryAsync(localDir, { intermediates: true });
  const localUri = `${localDir}${appFileId}_${safeName}`;
  await FileSystem.copyAsync({ from: params.media.uri, to: localUri });

  if (!params.isOnline) {
    return {
      appFileId,
      fileName: params.media.fileName,
      mimeType: params.media.mimeType,
      url: localUri,
      localUri,
      storageProvider: 'local-offline',
    };
  }

  try {
    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const res = await apiRequest<{
      success: boolean;
      storageProvider?: 'google-drive' | 'supabase-storage';
      url?: string;
      webViewLink?: string;
      fileId?: string;
    }>('/api/backup/google-drive/upload-file', {
      method: 'POST',
      userId: params.userId,
      timeoutMs: 35000,
      body: {
        userId: params.userId,
        fileName: params.media.fileName,
        fileData: `data:${params.media.mimeType};base64,${base64}`,
        mimeType: params.media.mimeType,
        customerId: params.customerId,
        customerName: params.customerName,
        folderName: params.folderName,
        category: params.category,
        appFileId,
        uploadedAt: new Date().toISOString(),
      },
    });

    if (res.success && (res.url || res.webViewLink)) {
      return {
        appFileId,
        fileName: params.media.fileName,
        mimeType: params.media.mimeType,
        url: res.url || res.webViewLink || localUri,
        localUri,
        storageProvider: res.storageProvider || 'supabase-storage',
        driveFileId: res.fileId,
      };
    }
  } catch {
    // Fall back to local staged copy
  }

  return {
    appFileId,
    fileName: params.media.fileName,
    mimeType: params.media.mimeType,
    url: localUri,
    localUri,
    storageProvider: 'local-offline',
  };
}
