import { Link } from 'react-router-dom';
import { Button, Text } from '@nexgen/ui';

export function NotFoundPage() {
  return (
    <div className="flex h-full min-h-[24rem] flex-col items-center justify-center gap-3 text-center">
      <Text variant="display">404</Text>
      <Text variant="subheading">Page not found</Text>
      <Text variant="body" className="text-text-secondary">
        The page you’re looking for doesn’t exist or may have moved.
      </Text>
      <Button asChild className="mt-2">
        <Link to="/">Back to dashboard</Link>
      </Button>
    </div>
  );
}
