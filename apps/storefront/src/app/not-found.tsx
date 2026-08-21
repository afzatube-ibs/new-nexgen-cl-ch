import Link from 'next/link';
import { Button } from '@nexgen/ui';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <p className="text-heading text-text-primary">Page not found</p>
      <p className="max-w-sm text-body text-text-secondary">The page you&apos;re looking for doesn&apos;t exist or may have been moved.</p>
      <Button asChild>
        <Link href="/">Back to homepage</Link>
      </Button>
    </div>
  );
}
