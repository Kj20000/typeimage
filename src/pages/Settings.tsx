import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, Trash2, Loader2, Upload, LogIn, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

const wordSchema = z.object({
  word: z.string().trim().min(1, "Word is required").max(50, "Word must be 50 characters or less").regex(/^[a-zA-Z]+$/, "Word must contain only letters"),
  image_url: z.string().min(1, "Image is required").max(500, "URL must be 500 characters or less")
});

interface Word {
  id: string;
  word: string;
  image_url: string;
  is_default: boolean;
}

const Settings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [newWord, setNewWord] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchWords();
  }, []);

  const fetchWords = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("words")
      .select("*")
      .order("word");
    
    if (error) {
      toast.error("Failed to load words");
      return;
    }
    
    setWords(data || []);
    setLoading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      console.log("No file selected");
      return;
    }

    console.log("File selected:", file.name, file.type, file.size);

    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    if (!user?.id) {
      toast.error("You must be logged in to upload images");
      return;
    }

    setUploading(true);

    try {
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => setPreviewImage(e.target?.result as string);
      reader.readAsDataURL(file);

      // Upload to Supabase Storage with user ID prefix for ownership verification
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      console.log("Uploading to path:", filePath);

      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('word-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        toast.error(`Upload failed: ${uploadError.message}`);
        setPreviewImage(null);
        return;
      }

      console.log("Upload successful:", uploadData);

      const { data: { publicUrl } } = supabase.storage
        .from('word-images')
        .getPublicUrl(filePath);

      setNewImageUrl(publicUrl);
      toast.success("Image uploaded!");
    } catch (err) {
      console.error("Upload exception:", err);
      toast.error("Failed to upload image");
      setPreviewImage(null);
    } finally {
      setUploading(false);
      // Reset file input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleAddWord = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = wordSchema.safeParse({ word: newWord, image_url: newImageUrl });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    if (!user) {
      toast.error("You must be logged in");
      return;
    }

    setAdding(true);

    const { error } = await supabase
      .from("words")
      .insert({
        user_id: user.id,
        word: newWord.toLowerCase(),
        image_url: newImageUrl,
        is_default: false,
      });

    if (error) {
      if (error.message.includes("duplicate")) {
        toast.error("This word already exists");
      } else {
        toast.error("Failed to add word");
      }
    } else {
      toast.success("Word added successfully!");
      setNewWord("");
      setNewImageUrl("");
      setPreviewImage(null);
      fetchWords();
    }

    setAdding(false);
  };

  const handleDeleteWord = async (id: string, word: string) => {
    const { error } = await supabase
      .from("words")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete word");
    } else {
      toast.success(`"${word}" deleted`);
      fetchWords();
    }
  };

  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-secondary p-3 md:p-4 shadow-lg">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 md:gap-4">
            <Button
              onClick={() => navigate("/")}
              variant="secondary"
              size="icon"
              className="bg-white/20 hover:bg-white/30 text-white h-9 w-9 md:h-10 md:w-10"
            >
              <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
            </Button>
            <h1 className="text-xl md:text-3xl font-bold text-white">
              ⚙️ Settings
            </h1>
          </div>
          {user ? (
            <Button
              onClick={signOut}
              variant="secondary"
              className="bg-white/20 hover:bg-white/30 text-white"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          ) : (
            <Button
              onClick={() => navigate("/auth")}
              variant="secondary"
              className="bg-white/20 hover:bg-white/30 text-white"
            >
              <LogIn className="h-4 w-4 mr-2" />
              Login
            </Button>
          )}
        </div>
      </div>

      <div className="container mx-auto p-3 md:p-4 max-w-4xl">
        {/* Add New Word Card */}
        <Card className="mb-4 md:mb-6 shadow-xl">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
              <Plus className="h-4 w-4 md:h-5 md:w-5" />
              Add New Word
            </CardTitle>
            <CardDescription className="text-sm">
              Add custom words with images to personalize learning
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
            <form onSubmit={handleAddWord} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="word">Word</Label>
                <Input
                  id="word"
                  type="text"
                  placeholder="e.g., tiger"
                  value={newWord}
                  onChange={(e) => setNewWord(e.target.value)}
                  disabled={adding}
                  className="h-11"
                />
              </div>

              {/* Image Upload Section */}
              <div className="space-y-2">
                <Label>Image</Label>
                <div className="flex flex-col gap-3">
                  {/* Upload Button */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={triggerFileInput}
                    disabled={uploading || adding}
                    className="w-full h-12 border-dashed border-2"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload from Device
                      </>
                    )}
                  </Button>

                  {/* OR Divider */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground">OR</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  {/* URL Input */}
                  <Input
                    type="url"
                    placeholder="Paste image URL here..."
                    value={newImageUrl}
                    onChange={(e) => {
                      setNewImageUrl(e.target.value);
                      setPreviewImage(null);
                    }}
                    disabled={adding || uploading}
                    className="h-11"
                  />

                  {/* Image Preview */}
                  {(previewImage || newImageUrl) && (
                    <div className="flex justify-center p-2 bg-muted rounded-lg">
                      <img
                        src={previewImage || newImageUrl}
                        alt="Preview"
                        className="max-h-32 md:max-h-40 object-contain rounded"
                        onError={() => {
                          if (!previewImage) setPreviewImage(null);
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-primary to-secondary hover:opacity-90"
                disabled={adding || uploading}
              >
                {adding ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Word
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Words List */}
        <Card className="shadow-xl">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-lg md:text-xl">Your Words</CardTitle>
            <CardDescription className="text-sm">
              Manage your custom words (default words cannot be deleted)
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {words.map((word) => (
                  <div
                    key={word.id}
                    className="flex items-center justify-between p-3 md:p-4 bg-muted rounded-lg hover:bg-muted/70 transition-colors"
                  >
                    <div className="flex items-center gap-3 md:gap-4">
                      <img
                        src={word.image_url}
                        alt={word.word}
                        className="w-12 h-12 md:w-16 md:h-16 object-cover rounded-lg"
                      />
                      <div>
                        <p className="font-bold text-base md:text-lg capitalize">{word.word}</p>
                        {word.is_default && (
                          <span className="text-xs text-muted-foreground">
                            Default word
                          </span>
                        )}
                      </div>
                    </div>
                    {!word.is_default && (
                      <Button
                        onClick={() => handleDeleteWord(word.id, word.word)}
                        variant="destructive"
                        size="icon"
                        className="h-9 w-9 md:h-10 md:w-10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;