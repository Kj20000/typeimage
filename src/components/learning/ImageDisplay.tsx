interface ImageDisplayProps {
  imageUrl: string;
  word: string;
}

export const ImageDisplay = ({ imageUrl, word }: ImageDisplayProps) => {
  return (
    <div className="mt-6 animate-in fade-in zoom-in duration-500">
      <img
        src={imageUrl}
        alt={word}
        className="max-w-md w-full h-auto rounded-3xl shadow-2xl border-8 border-primary/30"
      />
    </div>
  );
};
