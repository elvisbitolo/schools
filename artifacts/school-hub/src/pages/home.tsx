import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { BookOpen, Users, MessageSquare, ShieldCheck, ArrowRight, CheckCircle2 } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-background border-b border-border overflow-hidden">
        <div className="absolute inset-0 bg-primary/5 -skew-y-3 origin-top-left -z-10" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 md:pt-32 md:pb-40">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                <span className="flex h-2 w-2 rounded-full bg-primary mr-2"></span>
                The Modern School Operating System
              </div>
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground leading-tight">
                Run your school with <span className="text-primary">clarity</span> and <span className="text-accent">confidence</span>.
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-lg">
                SchoolHub brings administrators, teachers, students, and parents together in one centralized platform designed for modern education.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button size="lg" asChild className="text-md h-12 px-8">
                  <Link href="/signup">
                    Get Started <ArrowRight className="ml-2 w-5 h-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="text-md h-12 px-8">
                  <Link href="/signin">Sign In</Link>
                </Button>
              </div>
            </div>
            <div className="relative">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-primary to-accent blur opacity-30"></div>
              <img 
                src="/images/hero.jpg" 
                alt="Students walking on modern school campus" 
                className="relative rounded-2xl shadow-2xl object-cover w-full aspect-video border border-border"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Everything a modern school needs</h2>
            <p className="text-lg text-muted-foreground">
              Built specifically for K-12 institutions, SchoolHub replaces disconnected tools with a unified experience.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 bg-background rounded-xl border border-border shadow-sm">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">Role-Based Workspaces</h3>
              <p className="text-muted-foreground">
                Tailored dashboards for Principals, Teachers, Students, and Parents. Everyone sees exactly what they need, nothing they don't.
              </p>
            </div>
            
            <div className="p-6 bg-background rounded-xl border border-border shadow-sm">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6">
                <MessageSquare className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">Real-Time Communication</h3>
              <p className="text-muted-foreground">
                Secure internal messaging for staff. Quick-send questions for teachers to poll their students instantly.
              </p>
            </div>
            
            <div className="p-6 bg-background rounded-xl border border-border shadow-sm">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6">
                <ShieldCheck className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">Institutional Security</h3>
              <p className="text-muted-foreground">
                Enterprise-grade security built on Firebase. Data privacy and compliance designed for educational standards.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Deep Dive 1 */}
      <section className="py-24 bg-background border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div>
              <img 
                src="/images/feature-1.jpg" 
                alt="Teacher helping students in classroom" 
                className="rounded-2xl shadow-xl object-cover w-full aspect-square border border-border"
              />
            </div>
            <div className="space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Empower your teaching staff</h2>
              <p className="text-lg text-muted-foreground">
                Teachers shouldn't spend hours wrestling with software. SchoolHub gives educators the tools they need to connect with students efficiently.
              </p>
              <ul className="space-y-4">
                {[
                  "Send questions instantly to entire classes",
                  "Receive structured responses in real-time",
                  "Secure staff-to-staff messaging",
                  "Clear overview of daily tasks"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-accent" />
                    <span className="text-foreground font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Deep Dive 2 */}
      <section className="py-24 bg-card border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center flex-col-reverse md:flex-row-reverse">
            <div className="space-y-6 md:order-1">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Keep students engaged</h2>
              <p className="text-lg text-muted-foreground">
                A clear, focused environment helps students stay on track without the distractions of complex platforms.
              </p>
              <ul className="space-y-4">
                {[
                  "Centralized dashboard for all activities",
                  "Direct connection with teachers",
                  "Clear visibility of pending questions",
                  "Simple, intuitive interface"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-accent" />
                    <span className="text-foreground font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <img 
                src="/images/feature-2.jpg" 
                alt="Students studying in library" 
                className="rounded-2xl shadow-xl object-cover w-full aspect-square border border-border"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-primary text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8 relative z-10">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Ready to transform your school?</h2>
          <p className="text-xl text-primary-foreground/80 max-w-2xl mx-auto">
            Join the forward-thinking institutions using SchoolHub to streamline their operations.
          </p>
          <div className="pt-8">
            <Button size="lg" variant="secondary" asChild className="text-lg h-14 px-10 text-primary">
              <Link href="/signup">Create your account</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card py-12 border-t border-border mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 text-foreground">
            <BookOpen className="w-6 h-6 text-primary" />
            <span className="font-bold text-xl tracking-tight">SchoolHub</span>
          </div>
          <div className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} SchoolHub Inc. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
