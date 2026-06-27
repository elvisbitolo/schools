import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthContextProvider, useAuth } from "@/contexts/AuthContext";
import NotFound from "@/pages/not-found";

import Home from "@/pages/home";
import SignIn from "@/pages/signin";
import SignUp from "@/pages/signup";
import Dashboard from "@/pages/dashboard";
import Chat from "@/pages/chat";
import Questions from "@/pages/questions";
import Profile from "@/pages/profile";
import Collaborate from "@/pages/collaborate";

import { PublicLayout } from "@/components/layout/PublicLayout";
import { ProtectedLayout } from "@/components/layout/ProtectedLayout";
import { ReactNode } from "react";
import { BookOpen } from "lucide-react";

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin text-primary">
          <BookOpen className="w-8 h-8" />
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Redirect to="/signin" />;
  }

  return <ProtectedLayout>{children}</ProtectedLayout>;
}

function PublicRoute({ children }: { children: ReactNode }) {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin text-primary">
          <BookOpen className="w-8 h-8" />
        </div>
      </div>
    );
  }

  if (currentUser) {
    return <Redirect to="/dashboard" />;
  }

  return <PublicLayout>{children}</PublicLayout>;
}

function Router() {
  return (
    <Switch>
      <Route path="/">
        <PublicRoute><Home /></PublicRoute>
      </Route>
      <Route path="/signin">
        <PublicRoute><SignIn /></PublicRoute>
      </Route>
      <Route path="/signup">
        <PublicRoute><SignUp /></PublicRoute>
      </Route>

      <Route path="/dashboard">
        <ProtectedRoute><Dashboard /></ProtectedRoute>
      </Route>
      <Route path="/chat">
        <ProtectedRoute><Chat /></ProtectedRoute>
      </Route>
      <Route path="/questions">
        <ProtectedRoute><Questions /></ProtectedRoute>
      </Route>
      <Route path="/collaborate">
        <ProtectedRoute><Collaborate /></ProtectedRoute>
      </Route>
      <Route path="/profile">
        <ProtectedRoute><Profile /></ProtectedRoute>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <AuthContextProvider>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </AuthContextProvider>
  );
}

export default App;
