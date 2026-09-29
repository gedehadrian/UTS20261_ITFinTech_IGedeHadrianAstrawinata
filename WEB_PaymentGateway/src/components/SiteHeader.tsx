import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { CartIcon, CloseIcon, LogoMark, MenuIcon } from "@/components/Icons";
import { useCart } from "@/lib/cart";

const NAV_LINKS = [
  { href: "/", label: "Shop" },
  { href: "/checkout", label: "Cart" },
];

export default function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { count, hydrated } = useCart();
  const { pathname } = useRouter();

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="-ml-2 grid h-10 w-10 place-items-center rounded-full hover:bg-ink/5"
          aria-label="Open menu"
        >
          <MenuIcon />
        </button>
        <Link href="/" className="flex items-center gap-2 text-accent">
          <LogoMark />
          <span className="font-display text-2xl font-semibold tracking-tight text-ink">Goresan</span>
        </Link>
        <Link
          href="/checkout"
          className="relative -mr-2 ml-auto grid h-10 w-10 place-items-center rounded-full hover:bg-ink/5"
          aria-label={hydrated && count > 0 ? `Cart, ${count} items` : "Cart"}
        >
          <CartIcon width={22} height={22} />
          {hydrated && count > 0 && (
            <span className="absolute right-0 top-0 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] font-semibold text-white">
              {count}
            </span>
          )}
        </Link>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label="Menu">
          <button
            type="button"
            className="absolute inset-0 h-full w-full bg-ink/30"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
          <nav className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-paper p-5 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <span className="font-display text-xl font-semibold">Goresan</span>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-full hover:bg-ink/5"
                aria-label="Close menu"
              >
                <CloseIcon />
              </button>
            </div>
            <ul className="space-y-1">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className={`block rounded-lg px-3 py-2.5 text-[15px] ${
                      pathname === link.href ? "bg-ink/5 font-semibold" : "hover:bg-ink/5"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-auto text-xs leading-relaxed text-muted">
              Original drawings, paintings, prints and crafts from independent Indonesian studios.
            </p>
          </nav>
        </div>
      )}
    </header>
  );
}
