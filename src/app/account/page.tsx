import Link from "next/link";
import SidebarShell from "@/components/layout/SidebarShell";
import PageFooter from "@/components/layout/PageFooter";

const SETTINGS = [
  {
    href: "/account/profile",
    title: "Profile",
    desc: "Name, company, and contact details.",
  },
  {
    href: "/account/subscription",
    title: "Subscription",
    desc: "Current plan and monthly usage.",
  },
  {
    href: "/account/payment",
    title: "Payment Info",
    desc: "Billing details and payment method.",
  },
  {
    href: "/account/security",
    title: "Security",
    desc: "Password and account security.",
  },
];

export default function AccountPage() {
  return (
    <SidebarShell>
      <div className="flex min-h-full flex-col items-center bg-white px-5 text-black">
        <main className="mx-auto flex w-full max-w-[520px] flex-1 flex-col items-center">
          <div className="mb-8 mt-24 w-full text-center">
            <h1 className="text-[54px] font-light leading-[1.1] tracking-[-0.02em] text-black">
              Account
            </h1>
            <p className="mt-2 text-[15px] text-black/40">Manage your profile and settings.</p>
          </div>

          <div className="flex w-full flex-col gap-4">
            {SETTINGS.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className="w-full rounded-2xl border border-[#e2e2e2] bg-[#f3f3f3] px-6 py-5 text-left transition-colors hover:bg-[#eeeeee] focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
              >
                <h2 className="text-[20px] font-semibold leading-tight text-black">{s.title}</h2>
                <p className="mt-1 text-[15px] font-normal leading-relaxed text-black/50">{s.desc}</p>
              </Link>
            ))}
          </div>
        </main>

        <PageFooter />
      </div>
    </SidebarShell>
  );
}
