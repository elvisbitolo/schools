import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Users, MessageSquare, Bell, FileText, Activity } from "lucide-react";
import { useEffect, useState } from "react";
import { collection, query, where, getDocs, getDoc, doc, updateDoc, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const { userProfile } = useAuth();

  if (!userProfile) return null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Welcome, {userProfile.fullName}</h1>
        <p className="text-muted-foreground mt-1">Here is your {userProfile.role.toLowerCase()} dashboard.</p>
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

function PrincipalDashboard() {
  const [stats, setStats] = useState({ teachers: 0, students: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const usersRef = collection(db, "users");
        
        const teachersQ = query(usersRef, where("role", "==", "Teacher"));
        const studentsQ = query(usersRef, where("role", "==", "Student"));
        
        const [teachersSnap, studentsSnap] = await Promise.all([
          getDocs(teachersQ),
          getDocs(studentsQ)
        ]);
        
        setStats({
          teachers: teachersSnap.size,
          students: studentsSnap.size
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    };
    
    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Teachers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.teachers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.students}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Online</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>School Announcements</CardTitle>
            <CardDescription>Recent updates broadcasted to the school</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
              No recent announcements
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function TeacherDashboard() {
  const { userProfile } = useAuth();
  const [recentQuestions, setRecentQuestions] = useState<any[]>([]);

  useEffect(() => {
    if (!userProfile) return;
    
    const q = query(
      collection(db, "questions"),
      where("teacherId", "==", userProfile.uid),
      orderBy("timestamp", "desc"),
      limit(5)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const qs: any[] = [];
      snapshot.forEach((doc) => {
        qs.push({ id: doc.id, ...doc.data() });
      });
      setRecentQuestions(qs);
    });

    return () => unsubscribe();
  }, [userProfile]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Questions Sent</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentQuestions.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Questions</CardTitle>
            <CardDescription>Questions you've sent to students</CardDescription>
          </CardHeader>
          <CardContent>
            {recentQuestions.length > 0 ? (
              <div className="space-y-4">
                {recentQuestions.map((q) => (
                  <div key={q.id} className="p-4 border rounded-lg bg-card">
                    <p className="font-medium">{q.questionText}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      To: {q.targetType === 'all' ? 'All Students' : 'Specific Student'} • 
                      {new Date(q.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                You haven't sent any questions yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StudentDashboard() {
  const { userProfile, currentUser } = useAuth();
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const { toast } = useToast();

  useEffect(() => {
    if (!userProfile) return;
    
    // We fetch questions targeted to all OR targeted specifically to this student
    // In a real complex app we'd do a compound query or two separate queries. 
    // Here we'll fetch 'all' and 'specific' and merge.
    const fetchQuestions = async () => {
      const questionsRef = collection(db, "questions");
      const qAll = query(questionsRef, where("targetType", "==", "all"), orderBy("timestamp", "desc"));
      const qSpecific = query(questionsRef, where("targetType", "==", "student"), where("targetUserId", "==", userProfile.uid), orderBy("timestamp", "desc"));
      
      const unsubscribeAll = onSnapshot(qAll, (snapshot) => {
        setQuestions(prev => {
          const qs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          // Merge with specific, preserving unique
          const specific = prev.filter(p => p.targetType === "student");
          return [...qs, ...specific].sort((a, b) => b.timestamp - a.timestamp);
        });
      });

      const unsubscribeSpecific = onSnapshot(qSpecific, (snapshot) => {
        setQuestions(prev => {
          const qs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          // Merge with all, preserving unique
          const all = prev.filter(p => p.targetType === "all");
          return [...all, ...qs].sort((a, b) => b.timestamp - a.timestamp);
        });
      });

      return () => {
        unsubscribeAll();
        unsubscribeSpecific();
      };
    };
    
    let unsub: any;
    fetchQuestions().then(u => unsub = u);
    
    return () => {
      if (unsub) unsub();
    };
  }, [userProfile]);

  const handleAnswerSubmit = async (questionId: string) => {
    const answerText = answers[questionId];
    if (!answerText || !answerText.trim() || !currentUser || !userProfile) return;

    try {
      const questionRef = doc(db, "questions", questionId);
      const questionSnap = await getDoc(questionRef);
      if (questionSnap.exists()) {
        const questionData = questionSnap.data();
        const newAnswers = [...(questionData.answers || [])];
        
        // Remove existing answer from this student if any
        const filteredAnswers = newAnswers.filter(a => a.studentId !== currentUser.uid);
        
        filteredAnswers.push({
          studentId: currentUser.uid,
          studentName: userProfile.fullName,
          answer: answerText.trim(),
          timestamp: Date.now()
        });

        await updateDoc(questionRef, {
          answers: filteredAnswers
        });

        toast({
          title: "Answer submitted",
          description: "Your answer has been sent to the teacher.",
        });

        // Clear local answer
        setAnswers(prev => ({ ...prev, [questionId]: "" }));
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to submit answer.",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Pending Questions</CardTitle>
          <CardDescription>Questions from your teachers</CardDescription>
        </CardHeader>
        <CardContent>
          {questions.length > 0 ? (
            <div className="space-y-4">
              {questions.map((q) => {
                const myAnswer = (q.answers || []).find((a: any) => a.studentId === currentUser?.uid);
                
                return (
                  <div key={q.id} className="p-4 border rounded-lg bg-card border-primary/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-primary">{q.teacherName}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(q.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-foreground mb-4">{q.questionText}</p>
                    
                    {myAnswer ? (
                      <div className="bg-muted p-3 rounded-md border border-border">
                        <p className="text-xs text-muted-foreground mb-1">Your answer:</p>
                        <p className="text-sm">{myAnswer.answer}</p>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Input 
                          placeholder="Type your answer..."
                          value={answers[q.id] || ""}
                          onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                        />
                        <Button onClick={() => handleAnswerSubmit(q.id)} disabled={!answers[q.id]?.trim()}>
                          Submit
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
              No pending questions. You're all caught up!
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function LibrarianDashboard() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Library Management</CardTitle>
          <CardDescription>Book catalog and lending status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
            <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>Library catalog system is currently offline for maintenance.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ParentDashboard() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Child's Activity</CardTitle>
          <CardDescription>Recent updates from teachers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
            No recent activity
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StaffDashboard() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Staff Notices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
            No new notices
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
