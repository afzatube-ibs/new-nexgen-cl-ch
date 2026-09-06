import { Text } from '@nexgen/ui';

export interface RichTextProps {
  heading?: string;
  body: string;
}

/**
 * Safe CMS text primitive. Merchant content is rendered as React text,
 * never `dangerouslySetInnerHTML`; blank-line groups become paragraphs.
 * This deliberately supports policy/about/contact prose before any future
 * rich HTML/editor capability is allowed to expand the XSS surface.
 */
export function RichText({ heading, body }: RichTextProps) {
  const paragraphs = body.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-5 py-4">
      {heading && <Text as="h1" variant="display">{heading}</Text>}
      <div className="flex flex-col gap-4">
        {paragraphs.map((paragraph, index) => (
          <Text key={`${index}-${paragraph.slice(0, 24)}`} as="p" variant="body" className="whitespace-pre-line leading-7 text-text-secondary">
            {paragraph}
          </Text>
        ))}
      </div>
    </section>
  );
}
