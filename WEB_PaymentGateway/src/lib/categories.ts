export const CATEGORY_VALUES = ["drawing", "painting", "print", "craft", "bundle"] as const;

export type Category = (typeof CATEGORY_VALUES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  drawing: "Drawing",
  painting: "Painting",
  print: "Print",
  craft: "Craft",
  bundle: "Bundle",
};

export const CATEGORY_TABS: { value: Category | "all"; label: string }[] = [
  { value: "all", label: "All" },
  ...CATEGORY_VALUES.map((value) => ({ value, label: CATEGORY_LABELS[value] })),
];
