'use client';

import { useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { StorageService } from '@/services/storage';
import { CustomerDriveFile, CustomerDriveFolder } from '@/types';
import { uploadToDriveFiles } from '@/lib/driveUploadClient';

export interface CustomerDriveUploadTaskItem {
  fileObj: File;
  name: string;
  size: number;
  type: string;
  relativePath?: string;
  targetFolderId: string | null;
  targetFolderName?: string;
}

export interface CustomerDriveUploadProgressEvent {
  batchId: string;
  customerId: string;
  customerName: string;
  status: 'uploading' | 'paused' | 'completed' | 'cancelled' | 'error';
  currentFileName?: string;
  currentFileIndex: number;
  totalFiles: number;
  totalFolders: number;
  uploadedBytes: number;
  totalBytes: number;
  uploadedMb: number;
  totalMb: number;
  progressPercent: number;
  durationSeconds: number;
  finalSizeMb?: string;
  timestamp?: string;
  error?: string;
}

export default function CustomerDriveUploadGuardian() {
  const { currentUser, syncWithDatabase, addToast } = useApp();

  const isPausedRef = useRef<boolean>(false);
  const isCancelledRef = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const activeBatchIdRef = useRef<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const durationSecondsRef = useRef<number>(0);
  const resumeResolverRef = useRef<(() => void) | null>(null);

  // Lists of files and folders uploaded in current batch (for rollback if cancelled)
  const uploadedFilesRef = useRef<Array<{ appFileId: string; driveFileId?: string; name: string }>>([]);
  const createdFoldersRef = useRef<CustomerDriveFolder[]>([]);

  const broadcastProgress = (data: CustomerDriveUploadProgressEvent) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('skp_customer_drive_upload_progress', JSON.stringify(data));
      } catch {}
      window.dispatchEvent(new CustomEvent('khatapro_customer_drive_upload_progress', { detail: data }));
    }
  };

  useEffect(() => {
    // 1. Listen for Start Batch Upload
    const handleStartUpload = async (e: any) => {
      const detail = e.detail;
      if (!detail || !detail.customerId || !Array.isArray(detail.files) || detail.files.length === 0) {
        return;
      }

      const { customerId, customerName, files, targetFolderId, targetFolderName, currentFolders } = detail;
      const batchId = `up_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      activeBatchIdRef.current = batchId;

      isPausedRef.current = false;
      isCancelledRef.current = false;
      durationSecondsRef.current = 0;
      uploadedFilesRef.current = [];
      createdFoldersRef.current = [];

      // Start elapsed seconds timer
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        if (!isPausedRef.current && !isCancelledRef.current) {
          durationSecondsRef.current += 1;
        }
      }, 1000);

      // Normalize taskItems (handles raw File[] or CustomerDriveUploadTaskItem[])
      const taskItems: CustomerDriveUploadTaskItem[] = (files || []).map((f: any) => {
        if (f.fileObj) {
          return f;
        }
        return {
          fileObj: f,
          name: f.name || 'document',
          size: f.size || 0,
          type: f.type || 'application/octet-stream',
          relativePath: f.webkitRelativePath || f.relativePath || '',
          targetFolderId: targetFolderId || null,
          targetFolderName: targetFolderName,
        };
      });

      // Analyze folder structure for folder uploads
      const folderMap = new Map<string, string>(); // relativePathPrefix -> folderId
      const uniqueFoldersToCreate = new Set<string>();

      taskItems.forEach((f) => {
        if (f.relativePath && f.relativePath.includes('/')) {
          const parts = f.relativePath.split('/');
          const folderParts = parts.slice(0, -1);
          // Topmost relative folder name
          const fldName = folderParts[0].trim().toUpperCase();
          uniqueFoldersToCreate.add(fldName);
        }
      });

      // Retrieve latest folders from storage
      const currentCustData = StorageService.getCustomerDriveData(customerId);
      let existingFolders: CustomerDriveFolder[] = [
        ...(currentCustData.folders || currentFolders || []),
      ];

      // Auto-create folders if they don't exist yet
      for (const fldName of Array.from(uniqueFoldersToCreate)) {
        let matched = existingFolders.find(
          (f) => f.name.toUpperCase() === fldName.toUpperCase()
        );
        if (!matched) {
          const newFolder: CustomerDriveFolder = {
            id: `fld_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            name: fldName,
            createdAt: new Date().toISOString(),
            color: '#F59E0B',
          };
          existingFolders.push(newFolder);
          createdFoldersRef.current.push(newFolder);
          folderMap.set(fldName, newFolder.id);
        } else {
          folderMap.set(fldName, matched.id);
        }
      }

      // Save any newly created folders
      if (createdFoldersRef.current.length > 0) {
        StorageService.saveCustomerDriveData(customerId, {
          folders: existingFolders,
          files: currentCustData.files || [],
        });
        syncWithDatabase();
        window.dispatchEvent(new CustomEvent('khatapro_customer_drive_updated', { detail: { customerId } }));
      }

      const totalFiles = taskItems.length;
      const totalFolders = uniqueFoldersToCreate.size;
      const totalBytes = taskItems.reduce((acc: number, f: any) => acc + (f.size || 0), 0);
      let uploadedBytes = 0;
      let completedFiles = 0;

      // Broadcast initial start progress
      broadcastProgress({
        batchId,
        customerId,
        customerName: customerName || 'Customer',
        status: 'uploading',
        currentFileName: taskItems[0]?.name || '',
        currentFileIndex: 1,
        totalFiles,
        totalFolders,
        uploadedBytes: 0,
        totalBytes,
        uploadedMb: 0,
        totalMb: Number((totalBytes / (1024 * 1024)).toFixed(2)),
        progressPercent: 0,
        durationSeconds: 0,
        timestamp: new Date().toISOString(),
      });

      // Loop through queue sequentially
      for (let i = 0; i < totalFiles; i++) {
        // Check if user cancelled
        if (isCancelledRef.current) {
          break;
        }

        // Check if user paused -> wait until resumed or cancelled
        if (isPausedRef.current) {
          await new Promise<void>((resolve) => {
            resumeResolverRef.current = resolve;
          });
          if (isCancelledRef.current) {
            break;
          }
        }

        const taskItem = taskItems[i];

        // Determine destination folder
        let effectiveFolderId = taskItem.targetFolderId || targetFolderId || null;
        let effectiveFolderName = taskItem.targetFolderName || targetFolderName;

        if (taskItem.relativePath && taskItem.relativePath.includes('/')) {
          const parts = taskItem.relativePath.split('/');
          const fldName = parts[0].trim().toUpperCase();
          if (folderMap.has(fldName)) {
            effectiveFolderId = folderMap.get(fldName) || null;
            effectiveFolderName = fldName;
          }
        }

        broadcastProgress({
          batchId,
          customerId,
          customerName: customerName || 'Customer',
          status: 'uploading',
          currentFileName: taskItem.name,
          currentFileIndex: i + 1,
          totalFiles,
          totalFolders,
          uploadedBytes,
          totalBytes,
          uploadedMb: Number((uploadedBytes / (1024 * 1024)).toFixed(2)),
          totalMb: Number((totalBytes / (1024 * 1024)).toFixed(2)),
          progressPercent: totalBytes > 0 ? Math.round((uploadedBytes / totalBytes) * 100) : Math.round((i / totalFiles) * 100),
          durationSeconds: durationSecondsRef.current,
        });

        try {
          // Read file data URL
          const fileDataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(taskItem.fileObj);
          });

          if (isCancelledRef.current) break;

          const uploadTimestamp = new Date().toISOString();
          const newFileId = `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

          abortControllerRef.current = new AbortController();

          // Upload to Google Drive
          const driveRes = await uploadToDriveFiles(
            taskItem.name,
            fileDataUrl,
            taskItem.type,
            undefined,
            {
              customerName,
              customerId,
              folderName: effectiveFolderName,
              appFileId: newFileId,
              uploadedAt: uploadTimestamp,
            }
          );

          if (isCancelledRef.current) {
            // If cancelled while fetch was finishing, track for deletion
            if (driveRes.fileId) {
              uploadedFilesRef.current.push({
                appFileId: newFileId,
                driveFileId: driveRes.fileId,
                name: taskItem.name,
              });
            }
            break;
          }

          const customerDriveFile: CustomerDriveFile = {
            id: newFileId,
            name: taskItem.name,
            size: taskItem.size,
            type: taskItem.type || 'application/octet-stream',
            dataUrl: fileDataUrl,
            url: driveRes.webViewLink || driveRes.webContentLink,
            driveFileId: driveRes.fileId,
            folderId: effectiveFolderId,
            uploadedAt: uploadTimestamp,
          };

          // Save into local storage & update view
          const latestData = StorageService.getCustomerDriveData(customerId);
          const updatedFileList = [...(latestData.files || []), customerDriveFile];
          StorageService.saveCustomerDriveData(customerId, {
            folders: latestData.folders || [],
            files: updatedFileList,
          });

          uploadedFilesRef.current.push({
            appFileId: newFileId,
            driveFileId: driveRes.fileId,
            name: taskItem.name,
          });

          uploadedBytes += taskItem.size;
          completedFiles += 1;

          window.dispatchEvent(
            new CustomEvent('khatapro_customer_drive_updated', { detail: { customerId } })
          );
        } catch (err: any) {
          if (isCancelledRef.current) break;
          console.warn('Customer drive single file upload warning:', taskItem.name, err);
        }
      }

      // Clear timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Check final state
      if (isCancelledRef.current) {
        // --- ROLLBACK: User clicked Cancel -> delete everything uploaded in this batch ---
        const filesToRollback = [...uploadedFilesRef.current];
        const foldersToRollback = [...createdFoldersRef.current];

        console.log(`🧹 Rolling back ${filesToRollback.length} uploaded files and ${foldersToRollback.length} folders...`);

        // 1. Delete uploaded files from Google Drive
        const driveFileIds = filesToRollback.map((f) => f.driveFileId).filter(Boolean) as string[];
        const fileNames = filesToRollback.map((f) => f.name);

        if (driveFileIds.length > 0 || fileNames.length > 0) {
          try {
            const effectiveUserId = currentUser?.id || (typeof window !== 'undefined' ? (JSON.parse(localStorage.getItem('skp_auth_user') || '{}')?.id) : undefined);
            await fetch('/api/backup/google-drive/delete-file', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: effectiveUserId,
                fileIds: driveFileIds,
                fileNames,
              }),
            });
          } catch (delErr) {
            console.warn('Google Drive rollback error:', delErr);
          }
        }

        // 2. Remove files & folders from local StorageService
        const latestData = StorageService.getCustomerDriveData(customerId);
        const rolledBackFileIds = new Set(filesToRollback.map((f) => f.appFileId));
        const rolledBackFolderIds = new Set(foldersToRollback.map((f) => f.id));

        const cleanFiles = (latestData.files || []).filter((f) => !rolledBackFileIds.has(f.id));
        const cleanFolders = (latestData.folders || []).filter((f) => !rolledBackFolderIds.has(f.id));

        StorageService.saveCustomerDriveData(customerId, {
          folders: cleanFolders,
          files: cleanFiles,
        });

        // 3. Sync deletion to Supabase Cloud
        await syncWithDatabase();

        window.dispatchEvent(
          new CustomEvent('khatapro_customer_drive_updated', { detail: { customerId } })
        );

        broadcastProgress({
          batchId,
          customerId,
          customerName,
          status: 'cancelled',
          currentFileIndex: completedFiles,
          totalFiles,
          totalFolders,
          uploadedBytes: 0,
          totalBytes,
          uploadedMb: 0,
          totalMb: Number((totalBytes / (1024 * 1024)).toFixed(2)),
          progressPercent: 0,
          durationSeconds: durationSecondsRef.current,
        });

        addToast(
          'Upload Cancelled & Rolled Back',
          `Upload was cancelled. ${filesToRollback.length} file(s) were removed and cleaned up.`,
          'info'
        );
      } else {
        // --- COMPLETED ---
        await syncWithDatabase();

        const finalTotalMb = (totalBytes / (1024 * 1024)).toFixed(2);

        broadcastProgress({
          batchId,
          customerId,
          customerName,
          status: 'completed',
          currentFileIndex: totalFiles,
          totalFiles,
          totalFolders,
          uploadedBytes: totalBytes,
          totalBytes,
          uploadedMb: Number(finalTotalMb),
          totalMb: Number(finalTotalMb),
          finalSizeMb: finalTotalMb,
          progressPercent: 100,
          durationSeconds: durationSecondsRef.current,
          timestamp: new Date().toISOString(),
        });

        addToast(
          'Cloud Drive Upload Completed! 📁',
          `Successfully uploaded ${totalFiles} file(s)${totalFolders > 0 ? ` across ${totalFolders} folder(s)` : ''} (${finalTotalMb} MB) in ${durationSecondsRef.current}s.`,
          'success'
        );
      }
    };

    // 2. Listen for Pause
    const handlePause = () => {
      isPausedRef.current = true;
      const saved = localStorage.getItem('skp_customer_drive_upload_progress');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          parsed.status = 'paused';
          broadcastProgress(parsed);
        } catch {}
      }
    };

    // 3. Listen for Resume
    const handleResume = () => {
      isPausedRef.current = false;
      if (resumeResolverRef.current) {
        resumeResolverRef.current();
        resumeResolverRef.current = null;
      }
      const saved = localStorage.getItem('skp_customer_drive_upload_progress');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          parsed.status = 'uploading';
          broadcastProgress(parsed);
        } catch {}
      }
    };

    // 4. Listen for Cancel
    const handleCancel = () => {
      isCancelledRef.current = true;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (resumeResolverRef.current) {
        resumeResolverRef.current();
        resumeResolverRef.current = null;
      }
    };

    window.addEventListener('khatapro_start_customer_drive_upload', handleStartUpload);
    window.addEventListener('khatapro_customer_drive_upload_pause', handlePause);
    window.addEventListener('khatapro_customer_drive_upload_resume', handleResume);
    window.addEventListener('khatapro_customer_drive_upload_cancel', handleCancel);

    return () => {
      window.removeEventListener('khatapro_start_customer_drive_upload', handleStartUpload);
      window.removeEventListener('khatapro_customer_drive_upload_pause', handlePause);
      window.removeEventListener('khatapro_customer_drive_upload_resume', handleResume);
      window.removeEventListener('khatapro_customer_drive_upload_cancel', handleCancel);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentUser?.id, syncWithDatabase, addToast]);

  return null;
}
