import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Minus,
  Trash2,
  Upload,
  Loader2,
  Download,
  UploadCloud,
  Pencil,
  ChevronDown,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import ThemeSelector from "@/components/ThemeSelector";

import { getWords, saveWord, deleteWord } from "@/storage/words";
import {
  getCategories,
  saveCategory,
  deleteCategory,
} from "@/storage/categories";
import {
  saveImageFile,
  loadImageFile,
  resizeImageForApp,
} from "@/storage/files";
import { 
  exportBackup, 
  restoreBackup,
  setupAutoBackupFile,
  disableAutoBackup,
  performAutoBackup,
  isAutoBackupSupported
} from "@/storage/backup";
import {
  getImageDisplayMode,
  setImageDisplayMode,
  getCelebrationEnabled,
  setCelebrationEnabled,
  getAutoBackupEnabled,
  setAutoBackupEnabled,
  type ImageDisplayMode,
} from "@/storage/settings";

/* =========================
   TYPES
========================= */
const wordSchema = z.object({
  word: z.string().min(1),
});

interface Word {
  id: string;
  word: string;
  image: string;
  category_id: string | null;
}

interface Category {
  id: string;
  name: string;
}

/* =========================
   IMAGE THUMB
========================= */
function WordImage({ image }: { image: string }) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    let alive = true;
    loadImageFile(image)
      .then(url => alive && setSrc(url))
      .catch(() => setSrc(""));
    return () => {
      alive = false;
    };
  }, [image]);

  return src ? (
    <img
      src={src}
      className="w-12 h-12 rounded object-cover bg-white"
    />
  ) : (
    <div className="w-12 h-12 rounded bg-muted" />
  );
}

/* =========================
   COMPONENT
========================= */
export default function Settings() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);

  const [words, setWords] = useState<Word[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [newWord, setNewWord] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("none");
  const [newCategory, setNewCategory] = useState("");

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  
  const [imageDisplayMode, setImageDisplayModeState] = useState<ImageDisplayMode>("R");
  const [celebrationEnabled, setCelebrationEnabledState] = useState(true);
  const [autoBackupEnabled, setAutoBackupEnabledState] = useState(false);
  const [autoBackupSupported, setAutoBackupSupported] = useState(false);

  // Edit word state
  const [editingWord, setEditingWord] = useState<Word | null>(null);
  const [editWordText, setEditWordText] = useState("");
  const [editWordCategory, setEditWordCategory] = useState<string>("none");
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editPreview, setEditPreview] = useState("");
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // Import dialog state
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importData, setImportData] = useState<any>(null);
  const [importCategory, setImportCategory] = useState("none");
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    setWords(getWords());
    setCategories(getCategories());
    setImageDisplayModeState(getImageDisplayMode());
    setAutoBackupEnabledState(getAutoBackupEnabled());
    setAutoBackupSupported(isAutoBackupSupported());
    setCelebrationEnabledState(getCelebrationEnabled());
    setLoading(false);
  }, []);

  /* =========================
     IMAGE DISPLAY MODE
  ========================= */
  const handleImageDisplayModeChange = (mode: ImageDisplayMode) => {
    setImageDisplayModeState(mode);
    setImageDisplayMode(mode);
    toast.success(mode === "S" ? "Sequential mode" : "Reverse mode");
  };

  /* =========================
     CELEBRATION TOGGLE
  ========================= */
  const handleCelebrationToggle = (checked: boolean) => {
    setCelebrationEnabledState(checked);
    setCelebrationEnabled(checked);
    toast.success(checked ? "Celebration enabled" : "Celebration disabled");
  };

  /* =========================
     CATEGORY
  ========================= */
  const addCategoryInline = () => {
    if (!newCategory.trim()) return;
    const cat = { id: crypto.randomUUID(), name: newCategory.trim() };
    saveCategory(cat);
    setCategories(p => [...p, cat]);
    setSelectedCategory(cat.id);
    setNewCategory("");
  };

  const removeSelectedCategory = () => {
    if (!selectedCategory || selectedCategory === "none") return;
    
    // Update all words in this category to have no category
    const updatedWords = words.map(w => 
      w.category_id === selectedCategory 
        ? { ...w, category_id: null } 
        : w
    );
    
    // Save updated words to localStorage
    localStorage.setItem('words', JSON.stringify(updatedWords));
    setWords(updatedWords);
    
    // Delete the category
    deleteCategory(selectedCategory);
    setCategories(p => p.filter(c => c.id !== selectedCategory));
    setSelectedCategory("none");
    
    toast.success("Category deleted and words updated");
  };

  /* =========================
     IMAGE PICK
  ========================= */
  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (preview) URL.revokeObjectURL(preview);

    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  };

  /* =========================
     ADD WORD (FIXED)
  ========================= */
  const handleAddWord = async () => {
    try {
      if (!imageFile) return toast.error("Image required");
      if (!wordSchema.safeParse({ word: newWord }).success)
        return toast.error("Invalid word");

      const imageId =
        `${Date.now()}-${Math.random().toString(36).slice(2)}.png`;

      const resized = await resizeImageForApp(imageFile);
      await saveImageFile(imageId, resized);

      const word: Word = {
        id: crypto.randomUUID(),
        word: newWord.toLowerCase(),
        image: imageId,
        category_id: selectedCategory === "none" ? null : selectedCategory,
      };

      saveWord(word);
      setWords(p => [word, ...p]);

      setNewWord("");
      setSelectedCategory("none");
      setImageFile(null);
      setPreview("");

      toast.success("Word added");
    } catch (e) {
      console.error(e);
      toast.error("Failed to add word");
    }
  };

  /* =========================
     BACKUP & AUTO-BACKUP
  ========================= */
  const handleSetupAutoBackup = async () => {
    try {
      await setupAutoBackupFile();
      setAutoBackupEnabledState(true);
      // Different success message for mobile/tablet devices
      const isMobileOrTablet = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobileOrTablet) {
        toast.success("Auto-backup enabled! Backups will be saved to Downloads");
      } else {
        toast.success("Auto-backup enabled");
      }
    } catch (err: any) {
      console.error(err);
      if (err.name === 'AbortError') {
        toast.info("Auto-backup setup cancelled");
      } else {
        toast.error(err.message || "Failed to setup auto-backup");
      }
    }
  };

  const handleDisableAutoBackup = () => {
    disableAutoBackup();
    setAutoBackupEnabledState(false);
    toast.success("Auto-backup disabled");
  };

  const handleManualBackup = async () => {
    try {
      if (autoBackupEnabled) {
        await performAutoBackup();
        toast.success("Auto-backup file updated");
      } else {
        await exportBackup();
        toast.success("Backup downloaded");
      }
    } catch {
      toast.error("Backup failed");
    }
  };

  /* =========================
     BACKUP & RESTORE
  ========================= */
  const handleBackup = async () => {
    try {
      await exportBackup();
      toast.success("Backup downloaded");
    } catch {
      toast.error("Backup failed");
    }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await restoreBackup(file);
      toast.success("Restore complete");
      setTimeout(() => window.location.reload(), 800);
    } catch {
      toast.error("Restore failed");
    }
  };

  /* =========================
     EDIT WORD
  ========================= */
  const handleEditWord = (word: Word) => {
    setEditingWord(word);
    setEditWordText(word.word);
    setEditWordCategory(word.category_id || "none");
    setEditImageFile(null);
    setEditPreview("");
  };

  const handleEditImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (editPreview) URL.revokeObjectURL(editPreview);

    setEditImageFile(file);
    setEditPreview(URL.createObjectURL(file));
  };

  const handleUpdateWord = async () => {
    if (!editingWord) return;
    
    try {
      if (!wordSchema.safeParse({ word: editWordText }).success)
        return toast.error("Invalid word");

      let imageId = editingWord.image;

      // If new image selected, save it
      if (editImageFile) {
        imageId = `${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
        const resized = await resizeImageForApp(editImageFile);
        await saveImageFile(imageId, resized);
      }

      const updatedWord: Word = {
        ...editingWord,
        word: editWordText.toLowerCase(),
        image: imageId,
        category_id: editWordCategory === "none" ? null : editWordCategory,
      };

      saveWord(updatedWord);
      setWords(p => p.map(w => w.id === updatedWord.id ? updatedWord : w));

      setEditingWord(null);
      setEditWordText("");
      setEditWordCategory("none");
      setEditImageFile(null);
      setEditPreview("");

      toast.success("Word updated");
    } catch (e) {
      console.error(e);
      toast.error("Failed to update word");
    }
  };

  /* =========================
     IMPORT WORDS FROM JSON
  ========================= */
  const handleImportFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        
        // Validate JSON structure
        if (!Array.isArray(json)) {
          toast.error("Invalid JSON format. Expected an array of items.");
          return;
        }

        // Check if items have required fields
        const hasValidStructure = json.every(
          item => item.word && item.image
        );

        if (!hasValidStructure) {
          toast.error("Invalid data structure. Each item must have 'word' and 'image' fields.");
          return;
        }

        setImportData(json);
        setImportDialogOpen(true);
      } catch (err) {
        console.error(err);
        toast.error("Failed to parse JSON file");
      }
    };
    reader.readAsText(file);

    // Reset input
    if (e.target) e.target.value = '';
  };

  const handleImportWords = async () => {
    if (!importData) return;

    setIsImporting(true);
    let successCount = 0;
    let failCount = 0;
    const newWords: Word[] = [];

    try {
      for (const item of importData) {
        try {
          if (!item.word || !item.image) {
            failCount++;
            continue;
          }

          // Convert base64 image to File
          let imageFile: File;
          
          if (item.image.startsWith('data:image/svg')) {
            // SVG - convert directly without extra processing
            const blob = await (await fetch(item.image)).blob();
            imageFile = new File([blob], `imported.svg`, { type: 'image/svg+xml' });
          } else if (item.image.startsWith('data:image')) {
            // Other base64 data URL
            const blob = await (await fetch(item.image)).blob();
            imageFile = new File([blob], `imported.png`, { type: blob.type });
          } else if (item.image.startsWith('http')) {
            // URL - fetch and convert
            const response = await fetch(item.image);
            const blob = await response.blob();
            imageFile = new File([blob], `imported.${blob.type.split('/')[1]}`, { type: blob.type });
          } else {
            // Assume base64 string without prefix
            const byteString = atob(item.image);
            const arrayBuffer = new ArrayBuffer(byteString.length);
            const uint8Array = new Uint8Array(arrayBuffer);
            for (let i = 0; i < byteString.length; i++) {
              uint8Array[i] = byteString.charCodeAt(i);
            }
            const blob = new Blob([uint8Array], { type: 'image/png' });
            imageFile = new File([blob], `imported.png`, { type: 'image/png' });
          }

          // Generate unique image ID
          const imageId = `${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
          
          // Resize and save image
          const resized = await resizeImageForApp(imageFile);
          await saveImageFile(imageId, resized);

          // Create word object
          const word: Word = {
            id: crypto.randomUUID(),
            word: item.word.toLowerCase(),
            image: imageId,
            category_id: importCategory === "none" ? null : importCategory,
          };

          newWords.push(word);
          successCount++;
        } catch (err) {
          console.error(`Failed to import word: ${item.word}`, err);
          failCount++;
        }
      }

      // Save all words at once
      if (newWords.length > 0) {
        newWords.forEach(word => saveWord(word));
        setWords(p => [...newWords, ...p]);
      }

      // Show result
      if (successCount > 0) {
        toast.success(`Successfully imported ${successCount} word${successCount > 1 ? 's' : ''}`);
      }
      if (failCount > 0) {
        toast.error(`Failed to import ${failCount} word${failCount > 1 ? 's' : ''}`);
      }

      // Close dialog
      setImportDialogOpen(false);
      setImportData(null);
      setImportCategory("none");
    } catch (err) {
      console.error("Import error:", err);
      toast.error("Import failed: " + (err instanceof Error ? err.message : "Unknown error"));
      setImportDialogOpen(false);
      setImportData(null);
      setImportCategory("none");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10">
      <div className="p-4 bg-gradient-to-r from-primary to-secondary flex items-center justify-between">
        <Button variant="secondary" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft />
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white/20 rounded-lg px-3 py-1.5">
            <span className="text-white text-sm font-medium">Celebration</span>
            <Switch
              checked={celebrationEnabled}
              onCheckedChange={handleCelebrationToggle}
            />
          </div>
          <ThemeSelector />
        </div>
      </div>

      <div className="container mx-auto p-4 max-w-3xl space-y-6">
        {/* ADD WORD */}
        <Card>
          <CardHeader>
            <CardTitle>Add Word</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAddWord();
              }}
              className="space-y-4"
            >
              {/* WORD */}
              <div>
                <Label htmlFor="word-input">Word</Label>
                <Input
                  id="word-input"
                  name="word"
                  value={newWord}
                  onChange={e => setNewWord(e.target.value)}
                />
              </div>

              {/* IMAGE */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="image-input">Image</Label>

                <input
                  id="image-input"
                  name="image"
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImagePick}
                  className="hidden"
                  accept="image/*"
                />

                <Button
                  type="button"
                  className="bg-primary hover:bg-primary/90 text-white w-fit"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={16} className="mr-2" />
                  Upload Image
                </Button>

                {preview && (
                  <div className="mt-2 w-32 h-32 rounded border overflow-hidden bg-muted">
                    <img
                      src={preview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>

              {/* CATEGORY */}
              <div className="space-y-2">
                <Label>Category</Label>

                <div className="flex items-center gap-2">
                  <Select
                    value={selectedCategory}
                    onValueChange={setSelectedCategory}
                  >
                    <SelectTrigger className="w-1/2 min-w-[160px]">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {categories.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    type="button"
                    size="icon"
                    className="bg-purple-600 hover:bg-purple-700"
                    onClick={addCategoryInline}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>

                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    onClick={removeSelectedCategory}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                </div>

                <Input
                  id="category-input"
                  name="category"
                  placeholder="New category"
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
                  className="w-1/2 min-w-[160px]"
                />
              </div>

              {/* ACTIONS */}
              <div className="flex items-center gap-2">
                <Button type="submit" className="bg-primary text-white">
                  <Plus size={16} className="mr-1" />
                  Add Word
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-10 px-3"
                      title="Image Display Mode"
                    >
                      {imageDisplayMode}
                      <ChevronDown className="ml-1 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem
                      onClick={() => handleImageDisplayModeChange("S")}
                      className={imageDisplayMode === "S" ? "bg-accent" : ""}
                    >
                      <span className="font-semibold mr-2">S</span>
                      <span className="text-sm">Sequential</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleImageDisplayModeChange("R")}
                      className={imageDisplayMode === "R" ? "bg-accent" : ""}
                    >
                      <span className="font-semibold mr-2">R</span>
                      <span className="text-sm">Reverse</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Auto-backup button (only show on supported browsers) */}
                {autoBackupSupported && autoBackupEnabled ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        title="Auto-Backup (Active)"
                        className="border-green-600"
                      >
                        <Download className="h-4 w-4 text-green-600" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handleManualBackup}>
                        <Download className="h-4 w-4 mr-2" />
                        Update Auto-Backup File
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleDisableAutoBackup}>
                        <span className="text-red-600 flex items-center">
                          <span className="h-4 w-4 mr-2">✕</span>
                          Disable Auto-Backup
                        </span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : autoBackupSupported ? (
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    title={/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? "Setup Auto-Backup to Downloads" : "Setup Auto-Backup"}
                    onClick={handleSetupAutoBackup}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                ) : null}

                <input
                  id="backup-input"
                  name="backup"
                  type="file"
                  ref={backupInputRef}
                  hidden
                  accept="application/json"
                  onChange={handleRestore}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  title="Restore"
                  onClick={() => backupInputRef.current?.click()}
                >
                  <UploadCloud className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* WORD LIST */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Your Words</CardTitle>
              <div className="flex gap-2">
                <input
                  id="import-input"
                  name="import"
                  type="file"
                  ref={importFileInputRef}
                  onChange={handleImportFileSelect}
                  className="hidden"
                  accept="application/json"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => importFileInputRef.current?.click()}
                  title="Import words from JSON"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Import
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="animate-spin" />
            ) : (
              words.map(w => (
                <div
                  key={w.id}
                  className="flex justify-between items-center p-2 border-b last:border-b-0"
                >
                  <div className="flex gap-2 items-center">
                    <WordImage image={w.image} />
                    <span className="font-medium">{w.word}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => handleEditWord(w)}
                      title="Edit word"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="destructive"
                      onClick={() => {
                        deleteWord(w.id);
                        setWords(words.filter(word => word.id !== w.id));
                      }}
                      title="Delete word"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Words from JSON</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm">
                Found <strong>{importData?.length || 0}</strong> word{importData?.length !== 1 ? 's' : ''} in the file
              </p>
            </div>

            {/* Category Selection */}
            <div className="space-y-2">
              <Label>Select Category</Label>
              <Select
                value={importCategory}
                onValueChange={setImportCategory}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {categories.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                All imported words will be assigned to this category
              </p>
            </div>

            {/* Expected Format Info */}
            <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-xs font-semibold mb-2">Expected JSON format:</p>
              <pre className="text-xs bg-white dark:bg-gray-900 p-2 rounded overflow-x-auto">
{`[
  {
    "word": "apple",
    "image": "data:image/png;base64,..."
  },
  {
    "word": "banana",
    "image": "https://example.com/img.jpg"
  }
]`}
              </pre>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setImportDialogOpen(false);
                setImportData(null);
                setImportCategory("none");
              }}
              disabled={isImporting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleImportWords} 
              className="bg-primary text-white"
              disabled={isImporting}
            >
              {isImporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Import Words
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Word Dialog */}
      <Dialog open={!!editingWord} onOpenChange={() => setEditingWord(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Word</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Word Input */}
            <div>
              <Label htmlFor="edit-word-input">Word</Label>
              <Input
                id="edit-word-input"
                name="edit-word"
                value={editWordText}
                onChange={e => setEditWordText(e.target.value)}
              />
            </div>

            {/* Image */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-image-input">Image</Label>
              
              <input
                id="edit-image-input"
                name="edit-image"
                type="file"
                ref={editFileInputRef}
                onChange={handleEditImagePick}
                className="hidden"
                accept="image/*"
              />

              <Button
                type="button"
                variant="outline"
                className="w-fit"
                onClick={() => editFileInputRef.current?.click()}
              >
                <Upload size={16} className="mr-2" />
                {editImageFile ? "Change Image" : "Update Image"}
              </Button>

              {/* Preview */}
              {editPreview ? (
                <div className="mt-2 w-32 h-32 rounded border overflow-hidden bg-muted">
                  <img
                    src={editPreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : editingWord ? (
                <div className="mt-2">
                  <WordImage image={editingWord.image} />
                </div>
              ) : null}
            </div>

            {/* Category Selection */}
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={editWordCategory}
                onValueChange={setEditWordCategory}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {categories.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingWord(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateWord} className="bg-primary text-white">
              Update Word
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
