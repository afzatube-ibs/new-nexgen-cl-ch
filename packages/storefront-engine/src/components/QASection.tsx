import { Text, cn } from '@nexgen/ui';

/**
 * Store Components library — Beta Milestone 2.6's own "Q&A layout" and
 * "Merchant response architecture" build items. Real, reusable — no Q&A
 * backend exists yet (a real gap distinct from Reviews), so every real
 * call site passes an empty `questions` array and this renders its
 * honest empty state.
 */
export interface QAEntry {
  id: string;
  question: string;
  askedBy: string;
  askedAt: string;
  answer?: { body: string; answeredBy: string; answeredAt: string };
}

export interface QASectionProps {
  questions: QAEntry[];
  className?: string;
}

export function QASection({ questions, className }: QASectionProps) {
  if (questions.length === 0) {
    return (
      <div className={cn('flex flex-col gap-1 py-4', className)}>
        <Text as="p" variant="body-strong">
          No questions yet
        </Text>
        <Text as="p" variant="caption" className="text-text-secondary">
          Have a question about this product? Reach out to customer support.
        </Text>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {questions.map((entry) => (
        <div key={entry.id} className="flex flex-col gap-1 border-b border-border pb-4">
          <Text as="p" variant="body-strong">
            Q: {entry.question}
          </Text>
          <Text as="p" variant="caption" className="text-text-secondary">
            Asked by {entry.askedBy} · {entry.askedAt}
          </Text>
          {entry.answer && (
            <div className="ml-4 mt-1 flex flex-col gap-1 rounded-md bg-surface-subtle p-3">
              <Text as="p" variant="body">
                A: {entry.answer.body}
              </Text>
              <Text as="p" variant="caption" className="text-text-secondary">
                {entry.answer.answeredBy} · {entry.answer.answeredAt}
              </Text>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
