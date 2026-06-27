import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  MessageSquare,
  HelpCircle,
  User as UserIcon,
  Menu,
  BookOpen,
  FileEdit,
  X
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

  const role = userProfile?.role || "";
  const canAccessChat = ["Principal", "Teacher", "Librarian", "Non-Teaching Staff"].includes(role);
  const isTeacher = role === "Teacher" || role === "Principal";
  const isStudent = role === "Student";
  const canAccessQuestions = isTeacher || isStudent;

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, visible: true },
    { name: "Chat", href: "/chat", icon: MessageSquare, visible: canAccessChat },
    { name: "Questions", href: "/questions", icon: HelpCircle, visible: canAccessQuestions },
    { name: "Collaborate", href: "/collaborate", icon: FileEdit, visible: true },
    { name: "Profile", href: "/profile", icon: UserIcon, visible: true },
  ].filter(item => item.visible);

  const closeOnNav = () => setSidebarOpen(false);

  return (
    <div className="min-h-screen flex bg-background font-sans">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-60 bg-sidebar border-r border-sidebar-border transform transition-transform duration-200 ease-in-out md:translate-x-0 flex flex-col",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-sidebar-border bg-sidebar-primary text-sidebar-primary-foreground shrink-0">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            <span className="font-bold text-lg tracking-tight">SchoolHub</span>
          </div>
          <button className="md:hidden p-1 rounded hover:bg-white/10" onClick={() => setSidebarOpen(false)}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto text-sidebar-foreground">
          {navItems.map(item => (
            <Link key={item.name} href={item.href} onClick={closeOnNav}>
              <div className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors cursor-pointer text-sm",
                location === item.href
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )} data-testid={`nav-${item.name.toLowerCase()}`}>
                <item.icon className="w-4 h-4 shrink-0" />
                {item.name}
              </div>
            </Link>
          ))}
        </nav>

        {/* User info */}
        <div className="p-3 border-t border-sidebar-border bg-sidebar-accent/40 text-sidebar-foreground shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary text-sm shrink-0">
              {userProfile?.fullName?.[0] || "?"}
            </div>
            <div className="min-w-0">
              <div className="font-medium text-sm truncate">{userProfile?.fullName || "User"}</div>
              <div className="text-xs opacity-70 truncate">{userProfile?.role || "Role"}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col md:ml-60 w-full min-w-0">
        {/* Mobile header */}
        <header className="h-14 flex items-center px-4 border-b border-border bg-card text-card-foreground md:hidden shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2 ml-2">
            <BookOpen className="w-4 h-4 text-primary" />
            <span className="font-bold text-base">SchoolHub</span>
          </div>
          <div className="ml-auto text-xs text-muted-foreground font-medium truncate max-w-[120px]">
            {userProfile?.role}
          </div>
        </header>

        <main className="flex-1 overflow-auto p-3 sm:p-5 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
