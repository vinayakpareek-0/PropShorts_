import AppLayout from "@/components/layout/AppLayout";

const tips = [
  {
    id: "01",
    title: "Start with the client brief",
    body: "Mention budget, preferred areas, bedrooms, purpose, timeline, and any hard no-go criteria before adding softer preferences.",
    accent: "bg-[#c8cc7c]",
  },
  {
    id: "02",
    title: "Use rejected properties",
    body: "If the client has already rejected options, describe why. Floor, noise, commute, building age, and layout notes help the next search improve fast.",
    accent: "bg-[#d489ff]",
  },
  {
    id: "03",
    title: "Keep voice notes structured",
    body: "Speak naturally, but group details: client name, location, budget, property type, must-haves, and deal breakers.",
    accent: "bg-[#8ecae6]",
  },
  {
    id: "04",
    title: "Review before generating",
    body: "Check the interpreted requirement carefully before creating the package. Small fixes here prevent weak property matches later.",
    accent: "bg-[#f0d35f]",
  },
  {
    id: "05",
    title: "Share with context",
    body: "When sending the package, add one short personal note explaining why these three options made the shortlist.",
    accent: "bg-[#9e94df]",
  },
  {
    id: "06",
    title: "Add practical filters",
    body: "Sqft range, amenities, parking, building age, floor preference, possession timeline, and distance from landmarks all improve recommendations.",
    accent: "bg-[#80cfa9]",
  },
];

export default function TipsPage() {
  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-6 rounded-3xl bg-white p-8 ring-1 ring-black/[0.06] lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[13px] font-medium uppercase tracking-[0.24em] text-black/35">
              Broker Playbook
            </p>
            <h1 className="mt-3 text-[40px] font-light leading-none tracking-[-0.02em] text-black sm:text-[56px]">
              Tips.
            </h1>
            <p className="mt-4 max-w-xl text-[16px] leading-7 text-black/50">
              Sharpen the input before the AI starts working. Better briefs turn into stronger
              property matches, cleaner PDFs, and easier client conversations.
            </p>
          </div>

          <div className="rounded-2xl bg-[#f5f5f5] p-5 text-left lg:w-[280px]">
            <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-black/35">
              Best result
            </p>
            <p className="mt-2 text-[24px] font-semibold leading-tight text-black">
              Clear constraints first.
            </p>
            <p className="mt-2 text-[13px] leading-5 text-black/45">
              Add nice-to-haves only after budget, location, type, and deal breakers are captured.
            </p>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tips.map((tip) => (
            <article
              key={tip.id}
              className="rounded-3xl border border-black/[0.06] bg-white p-5 transition-transform duration-200 hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between gap-4">
                <span
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl text-[14px] font-semibold text-black ${tip.accent}`}
                >
                  {tip.id}
                </span>
                <div className="h-2 w-2 rounded-full bg-black/20" />
              </div>
              <h2 className="mt-6 text-[20px] font-semibold leading-tight text-black">
                {tip.title}
              </h2>
              <p className="mt-3 text-[14px] leading-6 text-black/50">{tip.body}</p>
            </article>
          ))}
        </section>
      </div>
    </AppLayout>
  );
}
