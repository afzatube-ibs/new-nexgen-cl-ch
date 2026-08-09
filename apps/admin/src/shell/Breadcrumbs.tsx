import { Link, useMatches } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface RouteHandle {
  breadcrumb?: string;
}

/**
 * ADMIN_SHELL_ARCHITECTURE.md §5: "Derived automatically from the current
 * route's own React Router route configuration... never hand-maintained
 * per screen." Each registered `ModuleRoute.breadcrumb` becomes a route
 * `handle`; this component reads `useMatches()` and needs no per-page code.
 */
export function Breadcrumbs() {
  const matches = useMatches();
  const crumbs = matches
    .filter((match) => Boolean((match.handle as RouteHandle | undefined)?.breadcrumb))
    .map((match) => ({
      label: (match.handle as RouteHandle).breadcrumb!,
      pathname: match.pathname,
    }));

  if (crumbs.length <= 1) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 border-b border-border px-6 py-3 text-caption">
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;
        return (
          <span key={crumb.pathname} className="flex items-center gap-1.5">
            {index > 0 && <ChevronRight className="size-3.5 text-text-secondary" aria-hidden="true" />}
            {isLast ? (
              <span className="text-text-primary" aria-current="page">
                {crumb.label}
              </span>
            ) : (
              <Link to={crumb.pathname} className="text-text-secondary hover:text-text-primary">
                {crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
