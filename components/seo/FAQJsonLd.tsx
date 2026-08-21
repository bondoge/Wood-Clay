export type FAQEntry = { question: string; answer: string };

/**
 * Only ever pass real, visibly-rendered Q&A content — never invent
 * questions to have something to mark up. See the corporate page for the
 * one current real use.
 */
export function FAQJsonLd({ entries }: { entries: FAQEntry[] }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: entries.map((entry) => ({
      "@type": "Question",
      name: entry.question,
      acceptedAnswer: { "@type": "Answer", text: entry.answer },
    })),
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}
