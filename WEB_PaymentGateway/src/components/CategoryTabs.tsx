import { CATEGORY_TABS, type Category } from "@/lib/categories";

interface CategoryTabsProps {
  value: Category | "all";
  counts: Record<Category | "all", number>;
  onChange: (value: Category | "all") => void;
}

export default function CategoryTabs({ value, counts, onChange }: CategoryTabsProps) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none]" role="tablist" aria-label="Categories">
      <div className="flex min-w-max gap-6 border-b border-line">
        {CATEGORY_TABS.map((tab) => {
          const active = tab.value === value;
          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(tab.value)}
              className={`-mb-px flex items-center gap-1.5 border-b-2 pb-3 pt-1 text-sm transition ${
                active ? "border-ink font-semibold text-ink" : "border-transparent text-muted hover:text-ink"
              }`}
            >
              {tab.label}
              <span className="text-[11px] tabular-nums text-muted">{counts[tab.value]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
