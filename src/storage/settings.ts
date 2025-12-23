// App settings storage

export type ImageDisplayMode = "S" | "R";

const IMAGE_MODE_KEY = "image-display-mode";
const CELEBRATION_KEY = "celebration-enabled";
const AUTO_BACKUP_ENABLED_KEY = "auto-backup-enabled";

// Store file handle in memory (cannot persist FileSystemFileHandle)
let autoBackupFileHandle: FileSystemFileHandle | null = null;

export function getImageDisplayMode(): ImageDisplayMode {
  const stored = localStorage.getItem(IMAGE_MODE_KEY);
  if (stored === "S" || stored === "R") {
    return stored;
  }
  return "R"; // Default to Reverse
}

export function setImageDisplayMode(mode: ImageDisplayMode): void {
  localStorage.setItem(IMAGE_MODE_KEY, mode);
}

export function getCelebrationEnabled(): boolean {
  const stored = localStorage.getItem(CELEBRATION_KEY);
  if (stored === null) {
    return true; // Default to enabled
  }
  return stored === "true";
}

export function setCelebrationEnabled(enabled: boolean): void {
  localStorage.setItem(CELEBRATION_KEY, enabled.toString());
}

export function getAutoBackupEnabled(): boolean {
  const stored = localStorage.getItem(AUTO_BACKUP_ENABLED_KEY);
  return stored === "true";
}

export function setAutoBackupEnabled(enabled: boolean): void {
  localStorage.setItem(AUTO_BACKUP_ENABLED_KEY, enabled.toString());
}

export function setAutoBackupFileHandle(handle: FileSystemFileHandle | null): void {
  autoBackupFileHandle = handle;
}

export function getAutoBackupFileHandle(): FileSystemFileHandle | null {
  return autoBackupFileHandle;
}
