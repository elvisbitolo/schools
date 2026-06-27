import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Zap, Building2, Globe, ArrowRight } from "lucide-react";

const plans = [
  {
    name: "Starter",
    price: "Free",
    period: "",
    description: "Perfect for small schools or trying SchoolHub out.",
    icon: Zap,
    badge: null,
    color: "border-border",
    features: [
      "Up to 30 users",
      "Announcements",
      "Teacher-to-teacher chat",
      "Questions & answers",
      "Collaborative documents",
      "1 school"
    ],
    cta: "Get Started Free",
    ctaHref: "/signup",
    ctaVariant: "outline" as const
  },
  {
    name: "School",
    price: "$25",
    period: "/month",
    description: "Everything a growing school needs, fully unlocked.",
    icon: Building2,
    badge: "Most Popular",
    color: "border-primary shadow-lg shadow-primary/10",
    features: [
      "Unlimited users",
      "Attendance tracking",
      "Class management",
      "File sharing & attachments",
      "Parent-teacher messaging",
      "Offline access",
      "Priority support",
      "1 school"
    ],
    cta: "Start 14-Day Trial",
    ctaHref: "/signup",
    ctaVariant: "default" as const
  },
  {
    name: "District",
    price: "Custom",
    period: "",
    description: "For multiple schools under one district or authority.",
    icon: Globe,
    badge: null,
    color: "border-border",
    features: [
      "Everything in School plan",
      "Multiple schools",
      "Centralized admin dashboard",
      "District-wide announcements",
      "Analytics & reports",
      "Custom branding",
      "Dedicated support",
      "SLA guarantee"
    ],
    cta: "Contact Us",
    ctaHref: "mailto:hello@schoolhub.app",
    ctaVariant: "outline" as const
  }
];

const faqs = [
  { q: "Can I change plans later?", a: "Yes, you can upgrade or downgrade at any time. Changes take effect immediately." },
  { q: "Is student data safe?", a: "All data is stored in Firebase with strict security rules. We never share or sell data." },
  { q: "Do you offer discounts for government schools?", a: "Yes — contact us for special pricing for public or government-funded schools." },
  { q: "What payment methods are accepted?", a: "We accept all major credit/debit cards, mobile money, and bank transfers for District plans." }
];

export default function Pricing() {
  return (
    <div className="space-y-12 max-w-5xl mx-auto">
      <div className="text-center space-y-3">
        <Badge variant="outline" className="mb-2">Pricing</Badge>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Simple, school-friendly pricing</h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">
          Start free. Scale as your school grows. No hidden fees, no per-student charges.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {plans.map(plan => {
          const Icon = plan.icon;
          return (
            <Card key={plan.name} className={`relative flex flex-col ${plan.color}`} data-testid={`card-plan-${plan.name.toLowerCase()}`}>
              {plan.badge && (
                <div className="absolute -top-3 left-0 right-0 flex justify-center">
                  <Badge className="bg-primary text-primary-foreground shadow-sm px-3">{plan.badge}</Badge>
                </div>
              )}
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-foreground">{plan.price}</span>
                  {plan.period && <span className="text-muted-foreground text-sm">{plan.period}</span>}
                </div>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-2.5">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="pt-4">
                {plan.ctaHref.startsWith("mailto") ? (
                  <Button variant={plan.ctaVariant} className="w-full" asChild>
                    <a href={plan.ctaHref}>{plan.cta} <ArrowRight className="w-4 h-4 ml-2" /></a>
                  </Button>
                ) : (
                  <Button variant={plan.ctaVariant} className="w-full" asChild>
                    <Link href={plan.ctaHref}>{plan.cta} <ArrowRight className="w-4 h-4 ml-2" /></Link>
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Comparison callout */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-4">
          <div className="flex-1">
            <h3 className="font-bold text-foreground">Need help choosing?</h3>
            <p className="text-muted-foreground text-sm mt-1">We'll walk you through the right plan for your school size and budget. No pressure.</p>
          </div>
          <Button asChild>
            <a href="mailto:hello@schoolhub.app">Talk to us <ArrowRight className="w-4 h-4 ml-2" /></a>
          </Button>
        </CardContent>
      </Card>

      {/* FAQ */}
      <div>
        <h2 className="text-xl font-bold mb-5">Frequently asked questions</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {faqs.map(f => (
            <Card key={f.q} className="bg-muted/30">
              <CardContent className="p-4">
                <p className="font-semibold text-sm text-foreground mb-1">{f.q}</p>
                <p className="text-sm text-muted-foreground">{f.a}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
