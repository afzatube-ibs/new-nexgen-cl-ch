import type { Metadata } from 'next';
import {
  BackToTop,
  GatewayRequestError,
  getBranding,
  getCategories,
  getContentMenu,
  getContentPages,
  StoreFooter,
  StoreHeader,
  type PublishedContentMenu,
  type PublishedContentPage,
} from '@nexgen/storefront-engine';
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
    if (error instanceof GatewayRequestError && error.isNotFound) return [];
    throw error;
  }
}

async function getMainNavigation(): Promise<PublishedContentMenu | null> {
  try {
    return await getContentMenu('main-navigation', { revalidateSeconds: 60 });
  } catch (error) {
    // Until a merchant publishes a main-navigation menu, categories remain
    // the honest fallback. A missing CMS menu must never break the store.
    if (error instanceof GatewayRequestError && error.isNotFound) return null;
    throw error;
  }
}

/**
 * Root app shell. Store identity comes from published Appearance, legal/info
 * links from published CMS pages, and the header uses a published merchant
 * menu when present. The real category tree remains the safe fallback for a
 * fresh installation with no CMS navigation yet.
 */
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [categories, branding, pages, mainNavigation] = await Promise.all([
    getCategories({ revalidateSeconds: 300 }),
    getBranding({ revalidateSeconds: 60 }),
    getFooterPages(),
    getMainNavigation(),
  ]);
  const navCategories = categories.data.map((category) => ({ ...category, href: categoryHref(category) }));

  return (
    <html lang="en">
      <body>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-brand focus:px-4 focus:py-2 focus:text-white">
          Skip to content
        </a>
        <CartDrawerProvider>
          <StoreHeader categories={navCategories} branding={branding} navigation={mainNavigation?.items} />
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
