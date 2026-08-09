import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { Button, Text } from '@nexgen/ui';

/** 403 Handling (Phase 2.1's own requirement) — rendered by `RequirePermission` for a route the operator lacks permission for. Distinct from `NotFoundPage`: the route exists, the operator just isn't allowed to see it. */
export function ForbiddenPage() {
  return (
    <div className="flex h-full min-h-[24rem] flex-col items-center justify-center gap-3 text-center">
      <ShieldAlert className="size-10 text-feedback-danger" aria-hidden="true" />
      <Text variant="subheading">You don’t have permission to view this page</Text>
      <Text variant="body" className="max-w-sm text-text-secondary">
        If you believe this is a mistake, contact an administrator to review your role’s permissions.
      </Text>
      <Button asChild variant="secondary" className="mt-2">
        <Link to="/">Back to dashboard</Link>
      </Button>
    </div>
  );
}
