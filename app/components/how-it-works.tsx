const STEPS = [
  {
    n: "01",
    title: "Create",
    body: "Ask a question, link a public URL, write how the agent should decide.",
  },
  {
    n: "02",
    title: "Stake",
    body: "Back YES or NO with STT before the deadline closes.",
  },
  {
    n: "03",
    title: "Resolve",
    body: "Anyone triggers Somnia’s Parse Website agent after the deadline.",
  },
  {
    n: "04",
    title: "Claim",
    body: "Winners withdraw pro-rata; INVALID refunds everyone.",
  },
] as const;

export function HowItWorks() {
  return (
    <section className="workflow page-gutter fade-rise fade-rise-2" aria-label="How Verdict works">
      <h2 className="workflow__label">How it works</h2>
      <ol className="workflow__grid">
        {STEPS.map((step) => (
          <li key={step.n} className="workflow__step glass-panel">
            <span className="workflow__n">{step.n}</span>
            <h3 className="workflow__title">{step.title}</h3>
            <p className="workflow__body">{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
