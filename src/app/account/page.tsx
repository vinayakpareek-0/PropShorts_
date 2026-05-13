import AppLayout from "@/components/layout/AppLayout";
import Link from "next/link";
import { mockBroker } from "@/data/mock";

const sections = [
  { href: "/account/profile", label: "Profile", desc: "Name, company, contact details", icon: "👤" },
  { href: "/account/subscription", label: "Subscription", desc: "Plan and usage", icon: "📋" },
  { href: "/account/payment", label: "Payment Info", desc: "Billing and payment method", icon: "💳" },
  { href: "/account/security", label: "Security", desc: "Password and account security", icon: "🔒" },
];

export default function AccountPage() {
  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Profile summary */}
        <div className="flex items-center gap-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-600 text-xl font-bold text-white">
            {mockBroker.fullName
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{mockBroker.fullName}</h1>
            <p className="text-sm text-gray-500">{mockBroker.companyName}</p>
            <p className="text-sm text-gray-500">{mockBroker.email}</p>
          </div>
        </div>

        {/* Account sections */}
        <div className="grid gap-4 sm:grid-cols-2">
          {sections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="group flex items-center gap-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 transition-shadow hover:shadow-md"
            >
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-2xl group-hover:bg-indigo-50">
                {section.icon}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900 group-hover:text-indigo-600">
                  {section.label}
                </p>
                <p className="mt-0.5 text-sm text-gray-500">{section.desc}</p>
              </div>
              <span className="text-gray-400 group-hover:text-indigo-500">→</span>
            </Link>
          ))}
        </div>

        <div className="pt-4">
          <button className="text-sm font-medium text-red-600 hover:text-red-500">
            Sign out
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
