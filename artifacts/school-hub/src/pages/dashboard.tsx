import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen, Users, MessageSquare, Bell, Activity,
  GraduationCap, ClipboardList, Megaphone, HelpCircle,
  FileEdit, ArrowRight, CheckCircle, Clock
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  collection, query, where, getDocs, onSnapshot,
  orderBy, limit, doc, getDoc, updateDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export default function Dashboard() {
  const { userProfile } = useAuth();
  if (!userProfile) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Welcome back, {userProfile.fullName.split(" ")[0]}
          </h1>
          <p className="text-muted-foreground mt-1 flex items-center gap-2">
            <Badge variant="outline" className="font-medium">{userProfile.role}</Badge>
            SchoolHub dashboard
          </p>
        </div>
      </div>

      {userProfile.role === "Principal" && <PrincipalDashboard />}
      {userProfile.role === "Teacher" && <TeacherDashboard />}
      {userProfile.role === "Student" && <StudentDashboard />}
      {userProfile.role === "Librarian" && <LibrarianDashboard />}
      {userProfile.role === "Parent" && <ParentDashboard />}
      {userProfile.role === "Non-Teaching Staff" && <StaffDashboard />}
    </div>
  );
}

function QuickLink({ href, icon: Icon, label, badge }: { href: string; icon: any; label: string; badge?: number }) {
  return (
    <Link href={href}>
      <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors group" data-testid={`quicklink-${label.toLowerCase()}`}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <span className="font-medium text-sm">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          {badge != null && badge > 0 && (
            <Badge className="bg-primary text-primary-foreground text-[10px] h-5 px-1.5">{badge}</Badge>
          )}
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        </div>
      </div>
    </Link>
  );
}

function RecentAnnouncements() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    const q = query(collection(db, "announcements"), orderBy("timestamp", "desc"), limit(3));
    return onSnapshot(q, snap => setItems(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);
  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <div><CardTitle className="text-sm font-semibold">Recent Announcements</CardTitle></div>
        <Link href="/announcements"><Button variant="ghost" size="sm" className="text-xs h-7">View all</Button></Link>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No announcements yet.</p>}
        {items.map(a => (
          <div key={a.id} className="flex items-start gap-2.5 p-2 rounded-md hover:bg-muted/40 transition-colors">
            <Megaphone className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{a.title}</p>
              <p className="text-xs text-muted-foreground truncate">{a.authorName} · {new Date(a.timestamp).toLocaleDateString()}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function PrincipalDashboard() {
  const [stats, setStats] = useState({ teachers: 0, students: 0, classes: 0, parents: 0 });
  const [questions, setQuestions] = useState<any[]>([]);

  useEffect(() => {
    const usersRef = collection(db, "users");
    Promise.all([
      getDocs(query(usersRef, where("role", "==", "Teacher"))),
      getDocs(query(usersRef, where("role", "==", "Student"))),
      getDocs(query(usersRef, where("role", "==", "Parent"))),
      getDocs(query(collection(db, "classes")))
    ]).then(([t, s, p, c]) => setStats({ teachers: t.size, students: s.size, parents: p.size, classes: c.size }));
  }, []);

  useEffect(() => {
    const q = query(collection(db, "questions"), orderBy("timestamp", "desc"), limit(5));
    return onSnapshot(q, snap => setQuestions(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Teachers", value: stats.teachers, icon: Users, color: "text-blue-600 bg-blue-50" },
          { label: "Students", value: stats.students, icon: GraduationCap, color: "text-green-600 bg-green-50" },
          { label: "Parents", value: stats.parents, icon: Users, color: "text-purple-600 bg-purple-50" },
          { label: "Classes", value: stats.classes, icon: BookOpen, color: "text-amber-600 bg-amber-50" },
        ].map(s => (
          <Card key={s.label} data-testid={`stat-${s.label.toLowerCase()}`}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${s.color}`}>
                <s.icon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <RecentAnnouncements />
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <QuickLink href="/announcements" icon={Megaphone} label="Post Announcement" />
            <QuickLink href="/classes" icon={GraduationCap} label="Manage Classes" />
            <QuickLink href="/attendance" icon={ClipboardList} label="View Attendance" />
            <QuickLink href="/questions" icon={HelpCircle} label="Send Questions" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function TeacherDashboard() {
  const { userProfile } = useAuth();
  const [recentQuestions, setRecentQuestions] = useState<any[]>([]);
  const [classCount, setClassCount] = useState(0);

  useEffect(() => {
    if (!userProfile) return;
    const q = query(collection(db, "questions"), where("teacherId", "==", userProfile.uid));
    return onSnapshot(q, snap => {
      const qs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      qs.sort((a, b) => b.timestamp - a.timestamp);
      setRecentQuestions(qs.slice(0, 5));
    });
  }, [userProfile]);

  useEffect(() => {
    if (!userProfile) return;
    getDocs(query(collection(db, "classes"), where("teacherId", "==", userProfile.uid))).then(snap => setClassCount(snap.size));
  }, [userProfile]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: "My Classes", value: classCount, icon: GraduationCap, color: "text-blue-600 bg-blue-50" },
          { label: "Questions Sent", value: recentQuestions.length, icon: HelpCircle, color: "text-green-600 bg-green-50" },
          { label: "System", value: "Online", icon: Activity, color: "text-emerald-600 bg-emerald-50" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${s.color}`}>
                <s.icon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <RecentAnnouncements />
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Recent Questions</CardTitle>
            <Link href="/questions"><Button variant="ghost" size="sm" className="text-xs h-7">View all</Button></Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentQuestions.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No questions sent yet.</p>}
            {recentQuestions.map(q => {
              const answered = (q.answers || []).length;
              return (
                <div key={q.id} className="flex items-start gap-2.5 p-2 rounded-md hover:bg-muted/40">
                  <HelpCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm truncate">{q.questionText}</p>
                    <p className="text-xs text-muted-foreground">{answered} answered · {new Date(q.timestamp).toLocaleDateString()}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Quick Actions</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-2">
          <QuickLink href="/questions" icon={HelpCircle} label="Send a Question" />
          <QuickLink href="/classes" icon={GraduationCap} label="My Classes" />
          <QuickLink href="/attendance" icon={ClipboardList} label="Mark Attendance" />
          <QuickLink href="/chat" icon={MessageSquare} label="Staff Chat" />
        </CardContent>
      </Card>
    </div>
  );
}

function StudentDashboard() {
  const { userProfile, currentUser } = useAuth();
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  useEffect(() => {
    if (!userProfile) return;
    let allDocs: any[] = [];
    let specificDocs: any[] = [];

    const merge = () => {
      const map = new Map<string, any>();
      [...allDocs, ...specificDocs].forEach(q => map.set(q.id, q));
      setQuestions(Array.from(map.values()).sort((a, b) => b.timestamp - a.timestamp).slice(0, 5));
    };

    const qAll = query(collection(db, "questions"), where("targetType", "==", "all"), orderBy("timestamp", "desc"), limit(5));
    const qSpecific = query(collection(db, "questions"), where("targetType", "==", "student"), where("targetUserId", "==", userProfile.uid), limit(5));

    const u1 = onSnapshot(qAll, snap => { allDocs = snap.docs.map(d => ({ id: d.id, ...d.data() })); merge(); });
    const u2 = onSnapshot(qSpecific, snap => { specificDocs = snap.docs.map(d => ({ id: d.id, ...d.data() })); merge(); });
    return () => { u1(); u2(); };
  }, [userProfile]);

  const handleSubmit = async (qid: string) => {
    const text = answers[qid]?.trim();
    if (!text || !currentUser || !userProfile) return;
    setSubmitting(p => ({ ...p, [qid]: true }));
    try {
      const questionRef = doc(db, "questions", qid);
      const snap = await getDoc(questionRef);
      if (!snap.exists()) return;
      const data = snap.data();
      const existing = (data.answers || []).filter((a: any) => a.studentId !== currentUser.uid);
      existing.push({ studentId: currentUser.uid, studentName: userProfile.fullName, answer: text, timestamp: Date.now() });
      await updateDoc(questionRef, { answers: existing });
      toast({ title: "Answer submitted" });
      setAnswers(p => ({ ...p, [qid]: "" }));
    } catch {
      toast({ variant: "destructive", title: "Error" });
    } finally {
      setSubmitting(p => ({ ...p, [qid]: false }));
    }
  };

  const unanswered = questions.filter(q => !(q.answers || []).find((a: any) => a.studentId === currentUser?.uid));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: "Pending Questions", value: unanswered.length, icon: HelpCircle, color: unanswered.length > 0 ? "text-amber-600 bg-amber-50" : "text-green-600 bg-green-50" },
          { label: "Total Questions", value: questions.length, icon: MessageSquare, color: "text-blue-600 bg-blue-50" },
          { label: "Status", value: "Active", icon: Activity, color: "text-emerald-600 bg-emerald-50" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${s.color}`}>
                <s.icon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <RecentAnnouncements />
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Questions from Teachers</CardTitle>
            <Link href="/questions"><Button variant="ghost" size="sm" className="text-xs h-7">View all</Button></Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {questions.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No questions yet.</p>}
            {questions.slice(0, 3).map(q => {
              const myAnswer = (q.answers || []).find((a: any) => a.studentId === currentUser?.uid);
              return (
                <div key={q.id} className={`p-3 rounded-lg border ${myAnswer ? "border-green-200 bg-green-50/50" : "border-primary/20 bg-primary/5"}`} data-testid={`question-${q.id}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-primary">{q.teacherName}</span>
                    {myAnswer
                      ? <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px]"><CheckCircle className="w-2.5 h-2.5 mr-1" />Done</Badge>
                      : <Badge variant="outline" className="text-amber-600 border-amber-200 text-[10px]"><Clock className="w-2.5 h-2.5 mr-1" />Pending</Badge>
                    }
                  </div>
                  <p className="text-sm text-foreground font-medium mb-2">{q.questionText}</p>
                  {!myAnswer && (
                    <div className="flex gap-2">
                      <Input
                        value={answers[q.id] || ""}
                        onChange={e => setAnswers(p => ({ ...p, [q.id]: e.target.value }))}
                        placeholder="Your answer..."
                        className="flex-1 h-8 text-sm"
                        data-testid={`input-answer-${q.id}`}
                      />
                      <Button size="sm" className="h-8 text-xs" onClick={() => handleSubmit(q.id)} disabled={!answers[q.id]?.trim() || submitting[q.id]} data-testid={`button-submit-${q.id}`}>
                        Submit
                      </Button>
                    </div>
                  )}
                  {myAnswer && <p className="text-xs text-muted-foreground mt-1">Your answer: {myAnswer.answer}</p>}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Quick Actions</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-2">
          <QuickLink href="/questions" icon={HelpCircle} label="All Questions" badge={unanswered.length} />
          <QuickLink href="/classes" icon={GraduationCap} label="My Classes" />
          <QuickLink href="/attendance" icon={ClipboardList} label="My Attendance" />
          <QuickLink href="/collaborate" icon={FileEdit} label="Collaborate" />
        </CardContent>
      </Card>
    </div>
  );
}

function LibrarianDashboard() {
  return (
    <div className="space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        <RecentAnnouncements />
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Library Management</CardTitle>
            <CardDescription>Book catalog and lending status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
              <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm">Library catalog coming soon.</p>
            </div>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Quick Actions</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-2">
          <QuickLink href="/announcements" icon={Megaphone} label="Announcements" />
          <QuickLink href="/chat" icon={MessageSquare} label="Staff Chat" />
          <QuickLink href="/collaborate" icon={FileEdit} label="Collaborate" />
        </CardContent>
      </Card>
    </div>
  );
}

function ParentDashboard() {
  return (
    <div className="space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        <RecentAnnouncements />
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Child's Activity</CardTitle>
            <CardDescription>Updates from teachers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
              <p className="text-sm">No recent activity to show.</p>
            </div>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Quick Actions</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-2">
          <QuickLink href="/announcements" icon={Megaphone} label="Announcements" />
          <QuickLink href="/chat" icon={MessageSquare} label="Message Teachers" />
          <QuickLink href="/attendance" icon={ClipboardList} label="Attendance Records" />
        </CardContent>
      </Card>
    </div>
  );
}

function StaffDashboard() {
  return (
    <div className="space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        <RecentAnnouncements />
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Staff Notices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
              <p className="text-sm">No new notices.</p>
            </div>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Quick Actions</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-2">
          <QuickLink href="/announcements" icon={Megaphone} label="Announcements" />
          <QuickLink href="/chat" icon={MessageSquare} label="Staff Chat" />
          <QuickLink href="/collaborate" icon={FileEdit} label="Collaborate" />
        </CardContent>
      </Card>
    </div>
  );
}
