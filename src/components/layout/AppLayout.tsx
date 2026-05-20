import SidebarShell from "./SidebarShell";
import PageFooter from "./PageFooter";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarShell>
      <div className="flex min-h-full flex-col bg-white text-black">
        <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
          {children}
        </div>
        <PageFooter bleed={false} />
      </div>
    </SidebarShell>
  );
}
