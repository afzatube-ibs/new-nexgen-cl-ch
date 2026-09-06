import type { Metadata } from 'next';
import { BackToTop, GatewayRequestError, getBranding, getCategories, getContentPages, StoreFooter, StoreHeader, type PublishedContentPage } from '@nexgen/storefront-engine';
import { CartDrawerProvider } from '@nexgen/storefront-engine/client';
import { categoryHref } from '@/lib/hrefs';
import './globals.css';

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBranding({ revalidateSeconds: 60 });
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
    title: { default: branding.storeName, template: `%s | ${branding.storeName}` },
    description: `${branding.storeName} — an online store.`,
    robots: { index: true, follow: true },
    icons: branding.favicon ? { icon: branding.favicon.url } : undefined,
  };
}

async function getFooterPages(): Promise<PublishedContentPage[]> {
  try {
    return await getContentPages({ revalidateSeconds: 60 });
  } catch (error) {
    // A brand-new installation may legitimately have no Store/CMS pages
    // yet. That is an empty footer state, not a reason to fail every route.
    if (error instanceof GatewayRequestError && error.isNotFound) return [];
    throw error;
  }
}

/**
 * Root app shell. Store identity comes from published Appearance, product
 * navigation from the real category tree, and information/legal links from
 * published CMS pages. Draft content can never enter this customer shell.
 */
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [categories, branding, pages] = await Promise.all([
    getCategories({ revalidateSeconds: 300 }),
    getBranding({ revalidateSeconds: 60 }),
    getFooterPages(),
  ]);
  const navCategories = categories.data.map((category) => ({ ...category, href: categoryHref(category) }));

  return (
    <html lang="en">
      <body>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-brand focus:px-4 focus:py-2 focus:text-white">
          Skip to content
        </a>
        <CartDrawerProvider>
          <StoreHeader categories={navCategories} branding={branding} />
          <main id="main-content" className="mx-auto max-w-6xl px-4 py-8">
            {children}
          </main>
          <StoreFooter categories={categories.data} categoryHref={categoryHref} branding={branding} pages={pages} />
          <BackToTop />
        </CartDrawerProvider>
      </body>
    </html>
  );
}
