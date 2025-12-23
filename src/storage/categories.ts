export type Category = {
  id: string;
  name: string;
};

const KEY = "categories";

const DEFAULT_CATEGORIES: Category[] = [
  { id: "animals", name: "Animals" },
  { id: "fruits", name: "Fruits" },
  { id: "objects", name: "Objects" },
];

export function getCategories(): Category[] {
  const raw = localStorage.getItem(KEY);
  if (!raw) {
    localStorage.setItem(KEY, JSON.stringify(DEFAULT_CATEGORIES));
    return DEFAULT_CATEGORIES;
  }
  return JSON.parse(raw);
}

export function saveCategory(category: Category) {
  const categories = getCategories();
  localStorage.setItem(KEY, JSON.stringify([...categories, category]));
}

export function deleteCategory(id: string) {
  const categories = getCategories().filter(c => c.id !== id);
  localStorage.setItem(KEY, JSON.stringify(categories));
}

/* =========================
   REQUIRED FOR BACKUP/RESTORE
========================= */
export function clearCategories() {
  // Remove all categories
  localStorage.removeItem(KEY);

  // Re-initialize defaults so app never breaks
  localStorage.setItem(KEY, JSON.stringify(DEFAULT_CATEGORIES));
}
