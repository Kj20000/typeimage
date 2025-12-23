export type Word = {
  id: string;
  word: string;
  image: string;
  category_id: string | null;
};

const KEY = "words";

export function getWords(): Word[] {
  return JSON.parse(localStorage.getItem(KEY) || "[]");
}

export function saveWord(word: Word) {
  const words = getWords();
  localStorage.setItem(KEY, JSON.stringify([word, ...words]));
}

export function deleteWord(id: string) {
  const words = getWords().filter(w => w.id !== id);
  localStorage.setItem(KEY, JSON.stringify(words));
}

/* =========================
   REQUIRED FOR BACKUP/RESTORE
========================= */
export function clearWords() {
  localStorage.removeItem(KEY);
}
