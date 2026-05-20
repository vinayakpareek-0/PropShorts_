import Link from "next/link";

interface PageFooterProps {
  href?: string;
  label?: string;
  className?: string;
  bleed?: boolean;
}

export default function PageFooter({
  href = "/dashboard",
  label = "Back to Dashboard",
  className = "",
  bleed = true,
}: PageFooterProps) {
  const widthClass = bleed ? "-mx-5 w-[calc(100%+2.5rem)]" : "w-full";

  return (
    <footer className={`${widthClass} mt-12 max-w-none bg-[#f7f7f7] px-5 pb-10 pt-10 ${className}`}>
      <div className="mx-auto flex w-full max-w-[560px] flex-col items-center gap-2">
        <Link
          href={href}
          className="text-[15px] font-medium text-black underline underline-offset-2 transition-opacity hover:opacity-60"
        >
          {label}
        </Link>
        <p className="mt-2 text-[12px] text-black/25">2026 propshorts</p>
      </div>
    </footer>
  );
}
