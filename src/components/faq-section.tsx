type FAQ = { q: string; a: string };

export function FaqSection({ faqs }: { faqs: FAQ[] }) {
  return (
    <section className="mt-24">
      <h2 className="mb-8 text-3xl font-semibold text-white">Frequently asked questions</h2>
      <div className="space-y-6">
        {faqs.map((faq, i) => (
          <div key={i} className="border-b border-white/[0.06] pb-6">
            <h3 className="mb-2 text-[17px] font-medium text-white">{faq.q}</h3>
            <p className="text-[15px] leading-relaxed text-white/60">{faq.a}</p>
          </div>
        ))}
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }),
        }}
      />
    </section>
  );
}
