import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { SearchIcon } from "@/components/Icons";
import type { AreaSuggestion } from "@/lib/types";

const DEBOUNCE_MS = 300;

type Status = "idle" | "loading" | "empty" | "error";

interface AreaSearchProps {
  onSelect: (suggestion: AreaSuggestion) => void;
}

/** Search-as-you-type for kelurahan / kecamatan / postal code; picking one fills city and postal code. */
export default function AreaSearch({ onSelect }: AreaSearchProps) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AreaSuggestion[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const inflight = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      clearTimeout(timer.current);
      inflight.current?.abort();
    },
    [],
  );

  function search(value: string) {
    setQuery(value);
    setActive(-1);
    clearTimeout(timer.current);
    inflight.current?.abort();

    if (value.trim().length < 3) {
      setResults([]);
      setStatus("idle");
      setOpen(false);
      return;
    }

    setStatus("loading");
    setOpen(true);
    timer.current = setTimeout(async () => {
      const controller = new AbortController();
      inflight.current = controller;
      try {
        const res = await fetch(`/api/address/search?q=${encodeURIComponent(value.trim())}`, { signal: controller.signal });
        const data = (await res.json()) as { results?: AreaSuggestion[] };
        const found = data.results ?? [];
        setResults(found);
        setStatus(!res.ok ? "error" : found.length ? "idle" : "empty");
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setResults([]);
        setStatus("error");
      }
    }, DEBOUNCE_MS);
  }

  function choose(suggestion: AreaSuggestion) {
    onSelect(suggestion);
    setQuery("");
    setResults([]);
    setStatus("idle");
    setOpen(false);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      choose(results[active]);
    }
  }

  const listId = `${id}-list`;
  const message =
    status === "loading"
      ? "Searching…"
      : status === "empty"
        ? "No area found. Try a kelurahan, kecamatan or 5-digit postal code."
        : status === "error"
          ? "Suggestions are unavailable right now. Fill in city and postal code below."
          : null;

  return (
    <div className="relative">
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-muted">
        Find your area <span className="font-normal">(fills city &amp; postal code)</span>
      </label>
      <div className="relative">
        <input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${id}-option-${active}` : undefined}
          autoComplete="off"
          value={query}
          onChange={(e) => search(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => (results.length > 0 || message) && query.trim().length >= 3 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          placeholder="Kelurahan, kecamatan or postal code"
          className="h-11 w-full rounded-lg border border-line bg-white pl-3 pr-10 text-[15px] outline-none transition placeholder:text-ink/30 focus:border-ink/40 focus:ring-2 focus:ring-ink/5"
        />
        <SearchIcon className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" width={18} height={18} />
      </div>

      {open && (
        <ul id={listId} role="listbox" className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-line bg-white py-1 shadow-lg">
          {message ? (
            <li className="px-3 py-2 text-sm text-muted">{message}</li>
          ) : (
            results.map((s, i) => (
              <li
                key={`${s.postalCode}-${s.village}-${s.district}`}
                id={`${id}-option-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(s);
                }}
                onMouseEnter={() => setActive(i)}
                className={`cursor-pointer px-3 py-2 text-sm ${i === active ? "bg-ink/5" : ""}`}
              >
                <span className="font-medium">{s.village}</span>, Kec. {s.district}
                <span className="block text-xs text-muted">
                  {s.city}, {s.province} · {s.postalCode}
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
