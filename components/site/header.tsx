"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { navLinks } from "@/lib/site";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";

function useIsActive() {
  const pathname = usePathname();
  return (href: string) => pathname === href || pathname.startsWith(`${href}/`);
}

function DesktopLinks({ active }: { active?: (href: string) => boolean }) {
  return (
    <ul className="hidden items-center gap-1 lg:flex">
      {navLinks.map((link) => {
        const current = active?.(link.href) ?? false;
        return (
          <li key={link.href}>
            <Link
              href={link.href}
              aria-current={current ? "page" : undefined}
              className={cn(
                "relative px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:text-brand",
                current &&
                  "text-brand after:absolute after:inset-x-3 after:-bottom-0.5 after:h-0.5 after:bg-brand",
              )}
            >
              {link.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function ActiveDesktopLinks() {
  return <DesktopLinks active={useIsActive()} />;
}

function MobileMenu({ siteName }: { siteName: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="-mr-2 inline-flex size-11 items-center justify-center rounded-md text-ink hover:bg-mist lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="size-6" />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/50" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-y-0 right-0 z-50 flex w-[min(20rem,85vw)] flex-col bg-white p-6 shadow-xl"
        >
          <div className="flex items-center justify-between">
            <Dialog.Title className="sr-only">Menu</Dialog.Title>
            <Logo name={siteName} />
            <Dialog.Close asChild>
              <button
                type="button"
                className="-mr-2 inline-flex size-11 items-center justify-center rounded-md hover:bg-mist"
                aria-label="Close menu"
              >
                <X className="size-6" />
              </button>
            </Dialog.Close>
          </div>
          <nav aria-label="Mobile" className="mt-8">
            <ul className="divide-y divide-line border-y border-line">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="heading-display block py-4 text-2xl hover:text-brand"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <Button asChild size="lg" className="mt-8">
            <Link href="/contact" onClick={() => setOpen(false)}>
              Contact us
            </Link>
          </Button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function Header({ siteName }: { siteName: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur">
      <div className="container-page flex h-18 items-center justify-between gap-6">
        <Link href="/" aria-label={`${siteName} home`}>
          <Logo name={siteName} />
        </Link>
        <nav aria-label="Main">
          <Suspense fallback={<DesktopLinks />}>
            <ActiveDesktopLinks />
          </Suspense>
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild className="hidden sm:inline-flex">
            <Link href="/contact">Contact us</Link>
          </Button>
          <MobileMenu siteName={siteName} />
        </div>
      </div>
    </header>
  );
}
