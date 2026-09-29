import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeftIcon } from "@/components/Icons";

interface PageHeaderProps {
  title: ReactNode;
  backHref: string;
}

/** Compact "< Back   Title" bar used by the checkout and payment steps. */
export default function PageHeader({ title, backHref }: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
        <Link
          href={backHref}
          className="-ml-2 flex items-center gap-0.5 rounded-full py-1 pl-1 pr-2 text-sm text-muted hover:bg-ink/5 hover:text-ink"
        >
          <ChevronLeftIcon width={18} height={18} />
          Back
        </Link>
        <h1 className="flex items-center gap-1.5 text-base font-semibold">{title}</h1>
      </div>
    </header>
  );
}
