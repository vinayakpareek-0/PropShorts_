import Link from "next/link";

interface CircularNavButtonProps {
  href: string;
  label: string;
  children: React.ReactNode;
}

export default function CircularNavButton({ href, label, children }: CircularNavButtonProps) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="flex h-[60px] w-[60px] items-center justify-center rounded-full bg-black text-white transition-colors hover:bg-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
    >
      {children}
    </Link>
  );
}
