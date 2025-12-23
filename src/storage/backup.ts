import { getWords, saveWord, clearWords } from "./words";
import { getCategories, saveCategory, clearCategories } from "./categories";
import { saveImageFile, loadImageFile, setAutoBackupFunction } from "./files";
import { 
  getAutoBackupFileHandle, 
  setAutoBackupFileHandle,
  getAutoBackupEnabled,
  setAutoBackupEnabled 
} from "./settings";

/* =========================
   CAPACITOR DYNAMIC IMPORTS
========================= */
async function getCapacitor() {
  try {
    const mod = await import("@capacitor/core");
    return mod.Capacitor;
  } catch {
    return null;
  }
}

async function getFilesystem() {
  try {
    return await import("@capacitor/filesystem");
  } catch {
    return null;
  }
}

/* =========================
   CONSTANTS
========================= */
// JPEG quality for backup compression (0.75 = 75% quality)
// Reduces file size by ~70-80% while maintaining good visual quality
// Resolution (dimensions) remain unchanged
const BACKUP_IMAGE_QUALITY = 0.75;

// Debounce delay for auto-backup (in milliseconds)
// Prevents creating multiple backup files on rapid changes
const AUTO_BACKUP_DEBOUNCE_DELAY = 3000; // 3 seconds

// Debounce timer for auto-backup
let autoBackupTimer: number | null = null;

/* =========================
   TYPES
========================= */
interface BackupFile {
  version: number;
  createdAt: string;
  categories: any[];
  words: any[];
  images: Record<string, string>; // imageId -> base64 (JPEG compressed)
}

/* =========================
   EXPORT BACKUP
========================= */
export async function exportBackup() {
  const words = getWords();
  const categories = getCategories();

  const images: Record<string, string> = {};

  for (const w of words) {
    try {
      const src = await loadImageFile(w.image);
      // Compress image to reduce backup file size
      images[w.image] = await imageUrlToBase64(src, BACKUP_IMAGE_QUALITY);
    } catch {
      // skip missing image
    }
  }

  const backup: BackupFile = {
    version: 1,
    createdAt: new Date().toISOString(),
    categories,
    words,
    images,
  };

  const blob = new Blob([JSON.stringify(backup)], {
    type: "application/json",
  });

  downloadBlob(blob, `typeimage-backup-${Date.now()}.json`);
}

/* =========================
   SETUP AUTO-BACKUP FILE
========================= */
export async function setupAutoBackupFile() {
  try {
    const isMobileOrTablet = isMobileOrTabletDevice();

    // For mobile/tablet devices: use automatic periodic backups (no file picker needed)
    if (isMobileOrTablet) {
      setAutoBackupFileHandle(null); // No file handle needed for mobile/tablets
      setAutoBackupEnabled(true);
      
      // Create initial backup immediately
      await performTabletAutoBackup();
      
      return true;
    }

    // For Desktop: use File System Access API
    if (!('showSaveFilePicker' in window)) {
      throw new Error("Auto-backup is not supported on this browser. Please use manual backup instead.");
    }

    const handle = await (window as any).showSaveFilePicker({
      suggestedName: `typeimage-auto-backup-${Date.now()}.json`,
      types: [{
        description: 'JSON Backup File',
        accept: { 'application/json': ['.json'] },
      }],
    });

    setAutoBackupFileHandle(handle);
    setAutoBackupEnabled(true);
    
    // Create initial backup
    await performAutoBackup();
    
    return true;
  } catch (err) {
    console.error('Failed to setup auto-backup:', err);
    throw err;
  }
}

/* =========================
   CHECK AUTO-BACKUP SUPPORT
========================= */
export function isAutoBackupSupported(): boolean {
  // File System Access API is supported on desktop
  // Mobile/Tablet devices (iPhone, iPad, Android) use alternative auto-backup method
  const hasFileSystemAPI = 'showSaveFilePicker' in window;
  const isMobileOrTablet = isMobileOrTabletDevice();
  
  return hasFileSystemAPI || isMobileOrTablet;
}

/* =========================
   CHECK IF DEVICE IS MOBILE/TABLET (iOS, iPadOS, Android)
========================= */
function isMobileOrTabletDevice(): boolean {
  // Matches: iPhone, iPad, iPod, Android tablets and phones
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

/* =========================
   ALTERNATIVE AUTO-BACKUP FOR IPAD/TABLETS
   Saves to app's data directory (overwrites same file)
========================= */
async function performTabletAutoBackup() {
  try {
    const words = getWords();
    const categories = getCategories();
    const images: Record<string, string> = {};

    for (const w of words) {
      try {
        const src = await loadImageFile(w.image);
        images[w.image] = await imageUrlToBase64(src, BACKUP_IMAGE_QUALITY);
      } catch {
        // skip missing image
      }
    }

    const backup: BackupFile = {
      version: 1,
      createdAt: new Date().toISOString(),
      categories,
      words,
      images,
    };

    const backupJSON = JSON.stringify(backup, null, 2);

    // Try to use Capacitor Filesystem for native apps (iOS/Android)
    const Capacitor = await getCapacitor();
    const platform = Capacitor?.getPlatform?.() ?? "web";

    if (platform !== "web") {
      // Native app - save to Documents directory (user accessible)
      const fs = await getFilesystem();
      if (fs) {
        try {
          await fs.Filesystem.writeFile({
            path: 'typeimage-backup.json',
            data: backupJSON,
            directory: fs.Directory.Documents,
            encoding: fs.Encoding.UTF8
          });
          console.log('Auto-backup saved to Documents folder:', new Date().toISOString());
          return;
        } catch (fsErr) {
          console.error('Filesystem write failed, falling back to download:', fsErr);
        }
      }
    }

    // Fallback for web or if Capacitor failed - download to Downloads folder
    const blob = new Blob([backupJSON], {
      type: "application/json",
    });

    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `typeimage-backup.json`;
    a.click();
    URL.revokeObjectURL(a.href);

    console.log('Auto-backup downloaded:', new Date().toISOString());
  } catch (err) {
    console.error('Tablet auto-backup failed:', err);
  }
}

/* =========================
   DISABLE AUTO-BACKUP
========================= */
export function disableAutoBackup() {
  setAutoBackupFileHandle(null);
  setAutoBackupEnabled(false);
}

/* =========================
   PERFORM AUTO-BACKUP (DEBOUNCED)
========================= */
export async function performAutoBackup() {
  // Clear any existing timer
  if (autoBackupTimer !== null) {
    clearTimeout(autoBackupTimer);
  }

  // Set new timer to perform backup after delay
  autoBackupTimer = window.setTimeout(async () => {
    try {
      const enabled = getAutoBackupEnabled();
      if (!enabled) return;

      // For mobile/tablet devices: use alternative method
      if (isMobileOrTabletDevice()) {
        await performTabletAutoBackup();
        return;
      }

      // For Desktop: use File System Access API
      const handle = getAutoBackupFileHandle();
      if (!handle) return;

      // Check if we still have permission
      try {
        const permission = await (handle as any).queryPermission({ mode: 'readwrite' });
        if (permission !== 'granted') {
          // Try to request permission
          const newPermission = await (handle as any).requestPermission({ mode: 'readwrite' });
          if (newPermission !== 'granted') {
            console.warn('Auto-backup: Permission denied');
            disableAutoBackup();
            return;
          }
        }
      } catch (permErr) {
        console.warn('Auto-backup: Permission check failed', permErr);
        return;
      }

      const words = getWords();
      const categories = getCategories();
      const images: Record<string, string> = {};

      for (const w of words) {
        try {
          const src = await loadImageFile(w.image);
          // Compress image to reduce backup file size
          images[w.image] = await imageUrlToBase64(src, BACKUP_IMAGE_QUALITY);
        } catch {
          // skip missing image
        }
      }

      const backup: BackupFile = {
        version: 1,
        createdAt: new Date().toISOString(),
        categories,
        words,
        images,
      };

      try {
        const writable = await (handle as any).createWritable();
        await writable.write(JSON.stringify(backup, null, 2));
        await writable.close();
      } catch (writeErr) {
        console.error('Auto-backup write failed:', writeErr);
        // Don't disable on write errors, might be temporary
      }
    } catch (err) {
      console.error('Auto-backup failed:', err);
      // Don't disable on errors, might be temporary
    } finally {
      autoBackupTimer = null;
    }
  }, AUTO_BACKUP_DEBOUNCE_DELAY);
}

/* =========================
   RESTORE BACKUP
========================= */
export async function restoreBackup(file: File) {
  const text = await file.text();
  const backup: BackupFile = JSON.parse(text);

  if (!backup.words || !backup.categories || !backup.images) {
    throw new Error("Invalid backup file");
  }

  // Get existing data to merge with
  const existingWords = getWords();
  const existingCategories = getCategories();

  // Clear existing data
  clearWords();
  clearCategories();

  // Restore categories (merge with existing)
  const categoryMap = new Map();
  
  // Add existing categories first
  for (const c of existingCategories) {
    categoryMap.set(c.id, c);
  }
  
  // Add/update with backup categories
  for (const c of backup.categories) {
    categoryMap.set(c.id, c);
  }
  
  // Save merged categories
  for (const c of categoryMap.values()) {
    saveCategory(c);
  }

  // Restore images (sequential & safe) - add to existing images
  for (const [imageId, base64] of Object.entries(backup.images)) {
    const file = base64ToFile(base64);
    await saveImageFile(imageId, file);
  }

  // Restore words (merge with existing)
  const wordMap = new Map();
  
  // Add existing words first
  for (const w of existingWords) {
    wordMap.set(w.id, w);
  }
  
  // Add/update with backup words
  for (const w of backup.words) {
    wordMap.set(w.id, w);
  }
  
  // Save merged words
  for (const w of wordMap.values()) {
    saveWord(w);
  }
}

/* =========================
   HELPERS
========================= */
// Compress images to JPEG with quality 0.75 to reduce backup size
// Resolution (dimensions) remain the same, only file size is reduced
function imageUrlToBase64(src: string, quality: number = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      
      // Fill white background for JPEG (transparency becomes white)
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.drawImage(img, 0, 0);
      
      // Use JPEG compression with quality parameter (0.75 = 75% quality)
      // This significantly reduces file size while maintaining good visual quality
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = reject;
    img.src = src;
  });
}

function base64ToFile(base64: string): File {
  const arr = base64.split(",");
  const mime = arr[0].match(/:(.*?);/)![1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new File([u8arr], "image.png", { type: mime });
}

function downloadBlob(blob: Blob, filename: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

// Initialize auto-backup hook after performAutoBackup is declared
setAutoBackupFunction(performAutoBackup);
