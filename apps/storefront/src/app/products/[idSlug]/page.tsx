import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PackageSearch, ShieldCheck, Truck as TruckIcon } from 'lucide-react';
import {
  Breadcrumb,
  CodAvailableBadge,
  GatewayRequestError,
  PriceBlock,
  ProductGallery,
  ProductGrid,
  QASection,
  RatingSummary,
  RecentlyViewedRail,
  ReviewList,
  SectionHeader,
  ShippingCalculator,
  StickyMobileBuyBar,
  StockBadge,
  TrustBadge,
  buildBreadcrumbSchema,
  buildProductSchema,
  extractIdFromSegment,
  getBrand,
  getProduct,
  getRecommendations,
  getReviews,
  getReviewSummary,
  toMoney,
} from '@nexgen/storefront-engine';
import { AddToCartButton, BuyNowButton, ReviewForm } from '@nexgen/storefront-engine/client';
import { Badge, Text } from '@nexgen/ui';
import { ShareButton } from '@/components/ShareButton';
import { ViewTracker } from '@/components/ViewTracker';
import { categoryHref, productHref } from '@/lib/hrefs';

interface PageProps {
  params: Promise<{ idSlug: string }>;
}

async function loadProduct(idSlug: string) {
  const id = extractIdFromSegment(idSlug);
  try {
    return await getProduct(id);
  } catch (error) {
    if (error instanceof GatewayRequestError && (error.isNotFound || error.isUnsupportedIdentifier)) notFound();
    throw error;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { idSlug } = await params;
  const product = await loadProduct(idSlug);
  return {
    title: product.metaTitle ?? product.name,
    description: product.metaDescription ?? product.shortDescription ?? product.description ?? `${product.name} at neXgen Store.`,
    alternates: { canonical: `/products/${idSlug}` },
    openGraph: { images: product.images.slice(0, 1).map((image) => image.src) },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { idSlug } = await params;
  const product = await loadProduct(idSlug);
  const emptyReviewSummary = { averageRating: null, totalCount: 0, distribution: [] };

  const [brand, related, recommended, reviewsResult, reviewSummary] = await Promise.all([
    product.brandId ? getBrand(product.brandId).catch(() => null) : Promise.resolve(null),
    getRecommendations({ slot: 'related', productId: product.id, limit: 8 }, { revalidateSeconds: 180 }),
    getRecommendations({ slot: 'recommended', productId: product.id, limit: 8 }, { revalidateSeconds: 300 }),
    getReviews(product.id, { revalidateSeconds: 60 }).catch(() => ({ data: [], pagination: undefined })),
    getReviewSummary(product.id, { revalidateSeconds: 60 }).catch(() => emptyReviewSummary),
  ]);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const productUrl = `${siteUrl}/products/${idSlug}`;
  const breadcrumbItems = [
    { name: 'Home', url: siteUrl },
    ...product.categories.map((category) => ({ name: category.name, url: `${siteUrl}${categoryHref(category)}` })),
    { name: product.name, url: productUrl },
  ];
  const breadcrumbSchema = buildBreadcrumbSchema(breadcrumbItems);
  const productSchema = buildProductSchema(product, productUrl);
  const galleryImages = product.images.length > 0 ? product.images : product.image ? [product.image] : [];
  const { price, compareAtPrice } = toMoney(product.price);
  const isAvailable = product.availability?.isAvailable ?? null;
  const unavailable = product.status !== 'active' || isAvailable === false;
  const unavailableReason = isAvailable === false ? 'Out of stock' : 'Unavailable';

  return (
    <div className="flex flex-col gap-10 pb-20 lg:pb-0">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} />
      <ViewTracker id={product.id} name={product.name} href={productUrl.replace(siteUrl, '')} imageSrc={product.image?.src ?? null} />

      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          ...product.categories.map((category) => ({ label: category.name, href: categoryHref(category) })),
          { label: product.name },
        ]}
      />

      <div className="grid gap-8 lg:grid-cols-2 lg:items-start lg:gap-12">
        <ProductGallery images={galleryImages} productName={product.name} />

        <div className="flex flex-col gap-6 lg:sticky lg:top-20">
          <div className="flex flex-col gap-5 rounded-xl border border-border bg-surface p-6 shadow-elevation-1">
            <div>
              {brand && (
                <Text as="p" variant="caption" className="uppercase tracking-wide text-text-secondary">{brand.name}</Text>
              )}
              <Text as="h1" variant="display">{product.name}</Text>
              <Text variant="caption" className="mt-1 text-text-secondary">SKU: {product.sku}</Text>
            </div>

            <PriceBlock size="lg" price={price} compareAtPrice={compareAtPrice} />
            {product.shortDescription && <Text variant="body-strong">{product.shortDescription}</Text>}

            <div className="flex items-center gap-3">
              <StockBadge status={product.status} isAvailable={isAvailable} />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <BuyNowButton
                productId={product.id}
                sku={product.sku}
                name={product.name}
                href={productUrl.replace(siteUrl, '')}
                imageSrc={product.image?.src ?? null}
                unitPrice={price ? price.amountMinor / 100 : null}
                currencyCode={price?.currencyCode ?? null}
                disabled={unavailable}
                disabledReason={unavailableReason}
                size="lg"
                className="w-full sm:w-auto"
              />
              <AddToCartButton
                productId={product.id}
                sku={product.sku}
                name={product.name}
                href={productUrl.replace(siteUrl, '')}
                imageSrc={product.image?.src ?? null}
                unitPrice={price ? price.amountMinor / 100 : null}
                currencyCode={price?.currencyCode ?? null}
                disabled={unavailable}
                disabledReason={unavailableReason}
                emphasis="secondary"
                size="lg"
                className="w-full sm:w-auto"
              />
            </div>

            {isAvailable !== false && <CodAvailableBadge />}
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 rounded-xl border border-border p-5">
              <TrustBadge icon={ShieldCheck} label="Payment options" description="Available methods are confirmed at checkout" />
              <TrustBadge icon={TruckIcon} label="Delivery options" description="Rates and availability are confirmed at checkout" />
            </div>

            <div className="flex flex-col gap-2 rounded-xl border border-dashed border-border bg-surface-subtle p-4">
              <div className="flex items-center gap-2 text-text-secondary">
                <PackageSearch className="h-4 w-4" aria-hidden="true" />
                <Text as="p" variant="caption" className="font-medium uppercase tracking-wide">More ways to buy</Text>
              </div>
              <Text as="p" variant="caption" className="text-text-secondary">
                Bundle deals, frequently-bought-together sets, and cross-sell picks are coming soon — no real bundling or co-purchase backend exists yet. Related products below use today&apos;s real recommendation data instead.
              </Text>
            </div>

            <div className="flex items-center gap-2"><ShareButton title={product.name} /></div>
          </div>

          <div className="flex flex-col gap-4 border-t border-border pt-8">
            {product.categories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {product.categories.map((category) => (
                  <Link key={category.id} href={categoryHref(category)}><Badge variant="outline">{category.name}</Badge></Link>
                ))}
              </div>
            )}

            {product.description && <Text variant="body" className="whitespace-pre-line text-text-secondary">{product.description}</Text>}

            <div className="flex flex-col divide-y divide-border">
              <details className="group py-3">
                <summary className="flex cursor-pointer list-none items-center justify-between text-body-strong text-text-primary">
                  Shipping information
                  <span className="text-text-secondary transition-transform group-open:rotate-180">⌄</span>
                </summary>
                <div className="mt-2 flex flex-col gap-3">
                  <Text as="p" variant="body" className="text-text-secondary">
                    Delivery options, rates and availability depend on the destination and are calculated during checkout.
                  </Text>
                  <ShippingCalculator />
                </div>
              </details>

              <details className="group py-3">
                <summary className="flex cursor-pointer list-none items-center justify-between text-body-strong text-text-primary">
                  Returns
                  <span className="text-text-secondary transition-transform group-open:rotate-180">⌄</span>
                </summary>
                <Text as="p" variant="body" className="mt-2 text-text-secondary">
                  Return policy details are not published for this store yet. Contact the store before ordering if you need return information.
                </Text>
              </details>

              <details className="group py-3">
                <summary className="flex cursor-pointer list-none items-center justify-between text-body-strong text-text-primary">
                  Questions about this product?
                  <span className="text-text-secondary transition-transform group-open:rotate-180">⌄</span>
                </summary>
                <Text as="p" variant="body" className="mt-2 text-text-secondary">
                  Use the store contact details if you need product information before ordering.
                </Text>
              </details>
            </div>
          </div>
        </div>
      </div>

      {related.length > 0 && <ProductGrid products={related} buildHref={productHref} columns={4} heading="Related products" />}
      {recommended.length > 0 && <ProductGrid products={recommended} buildHref={productHref} columns={4} heading="You may also like" />}

      <div className="flex flex-col gap-6">
        <SectionHeader eyebrow="Reviews" heading="Ratings & reviews" />
        <RatingSummary averageRating={reviewSummary.averageRating} totalCount={reviewSummary.totalCount} distribution={reviewSummary.distribution} />
        <ReviewList reviews={reviewsResult.data} />
        <ReviewForm productId={product.id} className="max-w-xl" />
      </div>

      <div className="flex flex-col gap-6">
        <SectionHeader eyebrow="Questions" heading="Questions & answers" />
        <QASection questions={[]} />
      </div>

      <RecentlyViewedRail excludeId={product.id} />

      <StickyMobileBuyBar
        productId={product.id}
        name={product.name}
        href={productUrl.replace(siteUrl, '')}
        imageSrc={product.image?.src ?? null}
        status={product.status}
        isAvailable={isAvailable}
        price={price}
        compareAtPrice={compareAtPrice}
      />
    </div>
  );
}
