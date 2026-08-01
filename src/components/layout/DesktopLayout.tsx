import { TopNav } from "./TopNav";
import { Sidebar } from "./Sidebar";
import { BottomBar } from "./BottomBar";

export function DesktopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen flex flex-col">
      <TopNav />
      <div className="flex flex-1 overflow-hidden">
        <div className="sidebar-desktop">
          <Sidebar />
        </div>
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </div>
      <BottomBar />
    </div>
  );
}