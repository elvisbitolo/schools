import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { 
  LayoutDashboard, 
  MessageSquare, 
  HelpCircle, 
  User as UserIcon, 
  Menu, 
  X,
  BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ProtectedLayout({ children }: { children: ReactNode }) {
  const { userProfile, loading } = useAuth();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin text-primary">
          <BookOpen className="w-8 h-8" />
        </div>
      </div>
    );
  }

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const canAccessChat = ["Principal", "Teacher", "Librarian"].includes(userProfile?.role || "");
  const isTeacher = userProfile?.role === "Teacher";
  const isStudent = userProfile?.role === "Student";
  const canAccessQuestions = isTeacher || isStudent;

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, visible: true },
    { name: "Chat", href: "/chat", icon: MessageSquare, visible: canAccessChat },
    { name: "Questions", href: "/questions", icon: HelpCircle, visible: canAccessQuestions },
    { name: "Profile", href: "/profile", icon: UserIcon, visible: true },
  ].filter(item => item.visible);

  return (
    <div className="min-h-screen flex bg-background font-sans">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border transform transition-transform duration-200 ease-in-out md:translate-x-0 flex flex-col",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-16 flex items-center px-4 border-b border-sidebar-border bg-sidebar-primary text-sidebar-primary-foreground">
          <BookOpen className="w-6 h-6 mr-2" />
          <span className="font-bold text-xl tracking-tight">SchoolHub</span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto text-sidebar-foreground">
          {navItems.map((item) => (
            <Link key={item.name} href={item.href}>
              <div className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer",
                location === item.href 
                  ? "bg-primary text-primary-foreground font-medium" 
                  : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}>
                <item.icon className="w-5 h-5" />
                {item.name}
              </div>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-sidebar-border bg-sidebar-accent/50 text-sidebar-foreground">
          <div className="font-medium text-sm truncate">{userProfile?.fullName || "User"}</div>
          <div className="text-xs opacity-80">{userProfile?.role || "Role"}</div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:ml-64 w-full">
        <header className="h-16 flex items-center px-4 border-b border-border bg-card text-card-foreground md:hidden shrink-0">
          <Button variant="ghost" size="icon" onClick={toggleSidebar}>
            <Menu className="w-6 h-6" />
          </Button>
          <span className="font-bold text-lg ml-2">SchoolHub</span>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
