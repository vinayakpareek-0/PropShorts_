import Link from "next/link";

interface SelectOptionCardProps {
  href: string;
  title: string;
  description: string;
  /** Tailwind bg class e.g. "bg-[#c8cc7c]" */
  bgClass: string;
  /** Card height in px */
  cardHeight?: number;
}

export default function SelectOptionCard({
  href,
  title,
  description,
  bgClass,
  cardHeight = 180,
}: SelectOptionCardProps) {
  return (
    <Link
      href={href}
      className={`flex w-full flex-col items-center justify-center gap-3 rounded-[14px] px-8 py-8 text-center transition-transform duration-200 hover:opacity-90 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 ${bgClass}`}
      style={{ minHeight: cardHeight }}
    >
      <h3 className="text-[26px] font-semibold leading-tight text-black">
        {title}
      </h3>
      <p className="text-[17px] font-normal leading-relaxed text-black/80">
        {description}
      </p>
    </Link>
  );
}
