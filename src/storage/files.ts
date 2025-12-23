/* =========================================================
   HYBRID FILE STORAGE
   - PWA (Web): IndexedDB
   - Android / iOS: Capacitor Filesystem
========================================================= */

import { imageDB } from "./db";

// Import auto-backup (avoid circular dependency)
let performAutoBackup: (() => Promise<void>) | null = null;

// Set auto-backup function after module loads
export function setAutoBackupFunction(fn: () => Promise<void>) {
  performAutoBackup = fn;
}

/* =========================
   SAFE DYNAMIC IMPORTS
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
   SAVE IMAGE
========================= */
export async function saveImageFile(
  filename: string,
  file: File
): Promise<string> {
  if (!filename) throw new Error("Invalid filename");

  const Capacitor = await getCapacitor();
  const platform = Capacitor?.getPlatform?.() ?? "web";

  // 🌐 WEB / PWA → IndexedDB
  if (platform === "web") {
    const db = await imageDB;
    await db.put("images", file, filename);
    
    // Trigger auto-backup after saving
    if (performAutoBackup) {
      performAutoBackup().catch(err => console.error('Auto-backup error:', err));
    }
    
    return filename;
  }

  // 📱 ANDROID / IOS
  const fs = await getFilesystem();
  if (!fs) throw new Error("Filesystem not available");

  const base64 = await fileToBase64(file);

  await fs.Filesystem.writeFile({
    path: filename,
    data: base64,
    directory: fs.Directory.Data,
  });

  // Trigger auto-backup after saving
  if (performAutoBackup) {
    performAutoBackup().catch(err => console.error('Auto-backup error:', err));
  }

  return filename;
}

/* =========================
   LOAD IMAGE
========================= */
export async function loadImageFile(filename: string): Promise<string> {
  const Capacitor = await getCapacitor();
  const platform = Capacitor?.getPlatform?.() ?? "web";

  // 🌐 WEB / PWA
  if (platform === "web") {
    const db = await imageDB;
    const file = await db.get("images", filename);
    if (!file) throw new Error("Image not found");
    return URL.createObjectURL(file);
  }

  // 📱 ANDROID / IOS
  const fs = await getFilesystem();
  if (!fs) throw new Error("Filesystem not available");

  const result = await fs.Filesystem.readFile({
    path: filename,
    directory: fs.Directory.Data,
  });

  return `data:image/png;base64,${result.data}`;
}

/* =========================
   DELETE IMAGE
========================= */
export async function deleteImageFile(filename: string) {
  const Capacitor = await getCapacitor();
  const platform = Capacitor?.getPlatform?.() ?? "web";

  if (platform === "web") {
    const db = await imageDB;
    await db.delete("images", filename);
    
    // Trigger auto-backup after deletion
    if (performAutoBackup) {
      performAutoBackup().catch(err => console.error('Auto-backup error:', err));
    }
    
    return;
  }

  const fs = await getFilesystem();
  if (!fs) return;

  await fs.Filesystem.deleteFile({
    path: filename,
    directory: fs.Directory.Data,
  });
  
  // Trigger auto-backup after deletion
  if (performAutoBackup) {
    performAutoBackup().catch(err => console.error('Auto-backup error:', err));
  }
}

/* =========================
   RESIZE IMAGE (SMART) - FIT WITHOUT DISTORTION
========================= */
export async function resizeImageForApp(file: File): Promise<File> {
  const size = getBestImageSize();

  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;

      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size, size);

      // Scale image to fit container while maintaining aspect ratio (contain)
      const scale = Math.min(size / img.width, size / img.height);
      const scaledWidth = img.width * scale;
      const scaledHeight = img.height * scale;

      // Center the image on the canvas
      const offsetX = (size - scaledWidth) / 2;
      const offsetY = (size - scaledHeight) / 2;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(
        img,
        offsetX,
        offsetY,
        scaledWidth,
        scaledHeight
      );

      canvas.toBlob(blob => {
        resolve(
          new File([blob!], "image.png", {
            type: "image/png",
          })
        );
      }, "image/png", 0.95);
    };

    img.src = URL.createObjectURL(file);
  });
}

/* =========================
   HELPERS
========================= */
function getBestImageSize() {
  const min = Math.min(window.innerWidth, window.innerHeight);
  return min < 600 ? 512 : 768; // mobile : tablet/desktop
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
