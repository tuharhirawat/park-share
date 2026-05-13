type Section = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

type TermsAndPrivacyContentProps = {
  badge?: string;
  title: string;
  description: string;
  sections: Section[];
  updatedAt?: string;
};

const TermsAndPrivacyContent = ({
  badge,
  title,
  description,
  sections,
  updatedAt,
}: TermsAndPrivacyContentProps) => {
  return (
    <section className="w-full bg-background">
      <div className="mx-auto max-w-6xl px-4">

        {/* Hero */}
        <div className="mb-8">
          {badge && (
            <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-5">
              {badge}
            </div>
          )}

          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground leading-tight mb-5">
            {title}
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground leading-8">
            {description}
          </p>
        </div>

        {/* Content Card */}
        <div className="rounded-3xl border border-border bg-card/40 backdrop-blur-md shadow-sm p-6 sm:p-8 md:p-10">
          <div className="space-y-12">
            {sections.map((section, index) => (
              <section key={section.title} className="space-y-5">

                {/* Section Heading */}
                <h2 className="text-2xl md:text-3xl font-semibold text-foreground">
                  {index + 1}. {section.title}
                </h2>

                {/* Paragraphs */}
                {section.paragraphs?.map((paragraph, paragraphIndex) => (
                  <div
                    key={paragraph}
                    className="flex gap-4 text-base md:text-lg text-muted-foreground leading-8"
                  >
                    <span className="min-w-[42px] font-medium text-primary">
                      {index + 1}.{paragraphIndex + 1}
                    </span>

                    <p>{paragraph}</p>
                  </div>
                ))}

                {/* Bullets */}
                {section.bullets && (
                  <ul className="space-y-4 pt-1">
                    {section.bullets.map((bullet) => (
                      <li
                        key={bullet}
                        className="flex items-start gap-4 text-base md:text-lg text-muted-foreground leading-8"
                      >
                        <div className="mt-3 h-2.5 w-2.5 rounded-full bg-primary shrink-0" />

                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </div>

        {/* Footer */}
        {updatedAt && (
          <div className="pt-8 text-center text-sm text-muted-foreground">
            Last updated: {updatedAt}
          </div>
        )}
      </div>
    </section>
  );
};

export default TermsAndPrivacyContent;