import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { GatewayRequestError, getContentPage, resolveSections } from '@nexgen/storefront-engine';

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function loadPage(slug: string) {
  try {
    return await getContentPage(slug);
  } catch (error) {
    if (error instanceof GatewayRequestError && error.isNotFound) notFound();
    throw error;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = await loadPage(slug);
  return {
    title: page.metaTitle ?? page.title,
    description: page.metaDescription ?? undefined,
    alternates: { canonical: `/pages/${page.slug}` },
  };
}

export default async function ContentPage({ params }: PageProps) {
  const { slug } = await params;
  const page = await loadPage(slug);
  const sections = resolveSections({ sections: page.content });

  return (
    <article className="flex flex-col gap-12">
      {sections.map(({ key, Component, props }) => <Component key={key} {...props} />)}
    </article>
  );
}
