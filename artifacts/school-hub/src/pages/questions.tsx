import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { collection, query, getDocs, where, addDoc, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Redirect } from "wouter";

export default function Questions() {
  const { userProfile, currentUser } = useAuth();
  const { toast } = useToast();
  
  const [targetType, setTargetType] = useState<"all" | "student">("all");
  const [targetUserId, setTargetUserId] = useState<string>("");
  const [questionText, setQuestionText] = useState("");
  const [students, setStudents] = useState<any[]>([]);
  const [sending, setSending] = useState(false);

  const isTeacher = userProfile?.role === "Teacher";
  const isStudent = userProfile?.role === "Student";
  const canAccess = isTeacher || isStudent;

  useEffect(() => {
    if (!isTeacher) return;
    
    const fetchStudents = async () => {
      const q = query(collection(db, "users"), where("role", "==", "Student"));
      const snapshot = await getDocs(q);
      const studentList: any[] = [];
      snapshot.forEach(doc => {
        studentList.push({ id: doc.id, ...doc.data() });
      });
      setStudents(studentList);
    };

    fetchStudents();
  }, [isTeacher]);

  if (userProfile && !canAccess) {
    return <Redirect to="/dashboard" />;
  }

  if (isStudent) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Questions</h1>
        <p className="text-muted-foreground">View questions sent by your teachers on your Dashboard.</p>
        <Button asChild>
          <a href="/dashboard">Go to Dashboard</a>
        </Button>
      </div>
    );
  }

  const handleSendQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText.trim()) return;
    if (targetType === "student" && !targetUserId) {
      toast({
        variant: "destructive",
        title: "Target required",
        description: "Please select a student to send the question to."
      });
      return;
    }

    setSending(true);
    try {
      await addDoc(collection(db, "questions"), {
        teacherId: currentUser?.uid,
        teacherName: userProfile?.fullName,
        targetType,
        targetUserId: targetType === "student" ? targetUserId : null,
        questionText: questionText.trim(),
        timestamp: Date.now(),
        answers: []
      });

      toast({
        title: "Question Sent",
        description: "Your question has been successfully sent."
      });

      setQuestionText("");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send question."
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Send a Question</h1>
        <p className="text-muted-foreground mt-1">Poll your students or send targeted inquiries.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New Question</CardTitle>
          <CardDescription>Draft a new question to send to students.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSendQuestion}>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>Target Audience</Label>
              <RadioGroup 
                value={targetType} 
                onValueChange={(v) => setTargetType(v as "all" | "student")}
                className="flex gap-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="all" />
                  <Label htmlFor="all" className="font-normal cursor-pointer">All Students</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="student" id="student" />
                  <Label htmlFor="student" className="font-normal cursor-pointer">Specific Student</Label>
                </div>
              </RadioGroup>
            </div>

            {targetType === "student" && (
              <div className="space-y-2">
                <Label>Select Student</Label>
                <Select value={targetUserId} onValueChange={setTargetUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a student" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.fullName}</SelectItem>
                    ))}
                    {students.length === 0 && (
                      <SelectItem value="none" disabled>No students found</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Question Text</Label>
              <Textarea 
                placeholder="Type your question here..." 
                className="min-h-[120px] resize-y"
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="bg-muted/50 py-4 px-6 border-t border-border flex justify-end">
            <Button type="submit" disabled={sending || !questionText.trim()}>
              {sending ? "Sending..." : "Send Question"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
