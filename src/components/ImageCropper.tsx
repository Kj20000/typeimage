import { useState, useRef, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ZoomIn, ZoomOut, RotateCw } from "lucide-react";

interface ImageCropperProps {
  imageUrl: string;
  open: boolean;
  onClose: () => void;
  onCrop: (croppedFile: File) => void;
  onSaveOriginal: (originalFile: File) => void;
}

export default function ImageCropper({
  imageUrl,
  open,
  onClose,
  onCrop,
  onSaveOriginal,
}: ImageCropperProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate optimal initial zoom when dialog opens
  useEffect(() => {
    if (!open) return;

    // Set a reasonable default zoom that works on all devices
    // Use 1.2x which provides good coverage without being too zoomed
    setZoom(1.2);
    setPosition({ x: 0, y: 0 });
  }, [open]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    setPosition({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const getCroppedImage = useCallback(async () => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cropSize = 800; // Larger output size for better quality
    canvas.width = cropSize;
    canvas.height = cropSize;

    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, cropSize, cropSize);

    // Account for zoom, rotation, and position
    ctx.save();
    ctx.translate(cropSize / 2, cropSize / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    
    // Calculate image dimensions after zoom
    const scaledWidth = image.naturalWidth * zoom;
    const scaledHeight = image.naturalHeight * zoom;
    
    // Calculate the position to draw the image (scale position by 2 for larger output)
    const drawX = -scaledWidth / 2 + (position.x * 2);
    const drawY = -scaledHeight / 2 + (position.y * 2);

    ctx.drawImage(
      image,
      drawX,
      drawY,
      scaledWidth,
      scaledHeight
    );
    
    ctx.restore();

    return new Promise<File>((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], "cropped-image.png", {
            type: "image/png",
          });
          resolve(file);
        }
      }, "image/png");
    });
  }, [zoom, rotation, position]);

  const getOriginalImage = useCallback(async () => {
    const image = imageRef.current;
    if (!image) return;

    // Fetch the original image and convert to File
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    return new File([blob], "original-image.png", { type: blob.type || "image/png" });
  }, [imageUrl]);

  const handleCrop = async () => {
    const croppedFile = await getCroppedImage();
    if (croppedFile) {
      onCrop(croppedFile);
      resetAndClose();
    }
  };

  const handleSaveOriginal = async () => {
    const originalFile = await getOriginalImage();
    if (originalFile) {
      onSaveOriginal(originalFile);
      resetAndClose();
    }
  };

  const resetAndClose = () => {
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
    onClose();
  };

  const handleRotate = () => {
    setRotation((r) => (r + 90) % 360);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Crop Image</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Crop Area */}
          <div className="relative bg-muted rounded-lg overflow-hidden">
            <div
              ref={containerRef}
              className="relative w-full aspect-square overflow-hidden cursor-move select-none bg-black"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <img
                ref={imageRef}
                src={imageUrl}
                alt="Crop preview"
                crossOrigin="anonymous"
                className="absolute pointer-events-none"
                style={{
                  top: "50%",
                  left: "50%",
                  transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px)) scale(${zoom}) rotate(${rotation}deg)`,
                  transformOrigin: "center",
                  maxWidth: "none",
                  maxHeight: "none",
                  width: "auto",
                  height: "auto",
                }}
              />
              {/* Crop frame overlay with darkened edges */}
              <div className="absolute inset-0 pointer-events-none">
                {/* Top dark overlay */}
                <div className="absolute top-0 left-0 right-0 h-[10%] bg-black/50" />
                {/* Bottom dark overlay */}
                <div className="absolute bottom-0 left-0 right-0 h-[10%] bg-black/50" />
                {/* Left dark overlay */}
                <div className="absolute top-[10%] bottom-[10%] left-0 w-[10%] bg-black/50" />
                {/* Right dark overlay */}
                <div className="absolute top-[10%] bottom-[10%] right-0 w-[10%] bg-black/50" />
                
                {/* Crop frame border */}
                <div className="absolute top-[10%] bottom-[10%] left-[10%] right-[10%] border-4 border-white/80 shadow-lg">
                  {/* Corner markers */}
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary" />
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-4">
            {/* Zoom Control */}
            <div className="flex items-center gap-3">
              <ZoomOut className="h-4 w-4" />
              <Slider
                value={[zoom]}
                onValueChange={([value]) => setZoom(value)}
                min={0.5}
                max={3}
                step={0.1}
                className="flex-1"
              />
              <ZoomIn className="h-4 w-4" />
              <span className="text-sm font-medium w-12 text-right">
                {Math.round(zoom * 100)}%
              </span>
            </div>

            {/* Rotate Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRotate}
              className="w-full"
            >
              <RotateCw className="h-4 w-4 mr-2" />
              Rotate 90°
            </Button>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={resetAndClose}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={handleSaveOriginal}>
            Save Without Crop
          </Button>
          <Button onClick={handleCrop} className="bg-primary text-white">
            Crop & Save
          </Button>
        </DialogFooter>

        {/* Hidden canvas for processing */}
        <canvas ref={canvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  );
}
