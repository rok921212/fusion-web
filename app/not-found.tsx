import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-24 text-center">
      <div>
        <p className="heading-display text-8xl text-brand">404</p>
        <h1 className="heading-display mt-4 text-4xl">Page not found</h1>
        <p className="mt-3 text-muted">
          The page you are looking for has moved or no longer exists.
        </p>
        <Button asChild size="lg" className="mt-8">
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </main>
  );
}
