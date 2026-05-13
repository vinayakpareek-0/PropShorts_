import Link from "next/link";

interface CircularNavButtonProps {
  href: string;
  label: string;
  /** Button diameter in px */
  size?: number;
  children: React.ReactNode;
}

export default function CircularNavButton({ href, label, size = 72, children }: CircularNavButtonProps) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="flex items-center justify-center rounded-full bg-black text-white transition-colors hover:bg-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
      style={{ width: size, height: size }}
    >
      {children}
    </Link>
  );
}
