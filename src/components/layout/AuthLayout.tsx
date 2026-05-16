import PropShortsLogo from "@/components/PropShortsLogo";

interface AuthLayoutProps {
  children: React.ReactNode;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
}

export default function AuthLayout({
  children,
  eyebrow = "Broker workspace",
  title = "Welcome to PropShorts.",
  subtitle = "Sign in to create recommendation packages, videos, and PDF reports.",
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-white px-4 py-6 text-black sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-48px)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1fr_460px]">
        <section className="hidden min-h-[620px] flex-col justify-between rounded-[28px] bg-[#f3f3f3] p-10 lg:flex">
          <PropShortsLogo width={170} className="h-auto w-[170px]" />

          <div>
            <p className="text-[13px] font-semibold uppercase tracking-[0.32em] text-black/35">
              {eyebrow}
            </p>
            <h1 className="mt-5 max-w-[560px] text-[64px] font-normal leading-[1.02] tracking-[-0.02em] text-black">
              {title}
            </h1>
            <p className="mt-6 max-w-[520px] text-[19px] leading-8 text-black/50">
              {subtitle}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {["Brief", "PropShort", "PDF"].map((label, index) => (
              <div key={label} className="rounded-2xl bg-white p-5">
                <div
                  className="mb-8 h-3 w-12 rounded-full"
                  style={{
                    background: ["#d489ff", "#8ecae6", "#c8cc7c"][index],
                  }}
                />
                <p className="text-[15px] font-semibold text-black">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-[460px]">
          <div className="mb-8 flex justify-center lg:hidden">
            <PropShortsLogo width={150} className="h-auto w-[150px]" />
          </div>
          {children}
        </section>
      </div>
    </div>
  );
}
