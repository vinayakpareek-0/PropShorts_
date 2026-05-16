import SidebarShell from "@/components/layout/SidebarShell";

type CreateStep = "select" | "talk" | "write" | "confirm";

interface CreateFlowShellProps {
  activeStep: CreateStep;
  children: React.ReactNode;
}

const steps: Array<{
  id: CreateStep;
  label: string;
  description: string;
}> = [
  {
    id: "select",
    label: "Select",
    description: "Choose the package type.",
  },
  {
    id: "talk",
    label: "Capture",
    description: "Speak or type the client brief.",
  },
  {
    id: "write",
    label: "Details",
    description: "Add the useful property constraints.",
  },
  {
    id: "confirm",
    label: "Confirm",
    description: "Review before generation.",
  },
];

export default function CreateFlowShell({ activeStep, children }: CreateFlowShellProps) {
  const activeIndex = steps.findIndex((step) => step.id === activeStep);
  const sidePanel = getSidePanel(activeStep);

  return (
    <SidebarShell>
      <div className="grid min-h-full bg-white text-black xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-h-full flex-col items-center justify-between bg-white px-5">
          {children}
        </div>

        <aside className="hidden border-l border-black/[0.06] bg-white px-7 py-8 xl:flex xl:flex-col">
          <div className="rounded-3xl bg-white p-6 ring-1 ring-black/[0.06]">
            <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-black/35">
              Create flow
            </p>
            <h2 className="mt-3 text-[30px] font-light leading-none tracking-[-0.02em] text-black">
              Build the brief.
            </h2>
            <p className="mt-3 text-[13px] leading-6 text-black/45">
              Complete the steps on the left. PropShorts will use this brief to build the final
              package.
            </p>

            <div className="mt-7 flex flex-col gap-4">
              {steps.map((step, index) => {
                const isActive = index === activeIndex;
                const isDone = index < activeIndex;

                return (
                  <div key={step.id} className="relative flex gap-3">
                    {index < steps.length - 1 && (
                      <div className="absolute left-[18px] top-10 h-[calc(100%+16px)] w-px bg-black/10" />
                    )}
                    <div
                      className={`relative z-10 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[12px] font-semibold transition-all ${
                        isActive
                          ? "bg-black text-white shadow-[0_0_0_8px_rgba(0,0,0,0.06)]"
                          : isDone
                            ? "bg-[#c8cc7c] text-black"
                            : "bg-[#f1f1f1] text-black/35"
                      }`}
                    >
                      {isDone ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" className="h-4 w-4">
                          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        index + 1
                      )}
                    </div>
                    <div className="pb-2">
                      <p className={`text-[15px] font-semibold ${isActive ? "text-black" : "text-black/45"}`}>
                        {step.label}
                      </p>
                      <p className="mt-0.5 text-[12px] leading-5 text-black/40">{step.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {sidePanel ? <div className="mt-5">{sidePanel}</div> : null}
        </aside>
      </div>
    </SidebarShell>
  );
}

function getSidePanel(activeStep: CreateStep) {
  if (activeStep === "talk") {
    return (
      <div className="rounded-3xl bg-black p-6 text-white">
        <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-white/45">
          Voice brief
        </p>
        <h3 className="mt-3 text-[24px] font-semibold leading-tight">Say it like a broker note.</h3>
        <div className="mt-5 rounded-2xl bg-white/10 p-4">
          <p className="text-[13px] leading-6 text-white/70">
            “Client needs a 3BHK in Bandra or Khar, budget around 1.5 Cr, prefers parking,
            newer building, and rejected noisy main-road flats.”
          </p>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {["Client", "Location", "Budget", "Deal breakers"].map((tag) => (
            <span key={tag} className="rounded-full bg-white/10 px-3 py-1 text-[12px] text-white/65">
              {tag}
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (activeStep === "write") {
    return (
      <div className="rounded-3xl bg-black p-6 text-white">
        <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-white/45">
          Writing guide
        </p>
        <h3 className="mt-3 text-[24px] font-semibold leading-tight">Include the constraints first.</h3>
        <div className="mt-5 flex flex-col gap-3">
          {[
            ["Must have", "Budget, area, bedrooms, purpose"],
            ["Helpful", "Parking, amenities, sqft, floor"],
            ["Avoid", "Rejected layouts, noisy roads, old buildings"],
          ].map(([label, body]) => (
            <div key={label} className="rounded-2xl bg-white/10 p-4">
              <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-white/45">{label}</p>
              <p className="mt-1 text-[13px] leading-5 text-white/72">{body}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
