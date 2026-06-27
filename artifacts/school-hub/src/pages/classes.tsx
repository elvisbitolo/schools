import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  collection, addDoc, onSnapshot, query, where, getDocs,
  doc, updateDoc, arrayUnion, arrayRemove, deleteDoc, getDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  GraduationCap, Users, Plus, ChevronDown, ChevronUp, UserPlus,
  UserMinus, Trash2, Key, X
} from "lucide-react";

interface SchoolClass {
  id: string;
  name: string;
  subject: string;
  gradeLevel: string;
  teacherId: string;
  teacherName: string;
  classCode: string;
  studentIds: string[];
  createdAt: number;
}

export default function Classes() {
  const { userProfile, currentUser } = useAuth();
  const { toast } = useToast();
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", subject: "", gradeLevel: "", teacherId: "" });

  const isPrincipal = userProfile?.role === "Principal";
  const isTeacher = userProfile?.role === "Teacher";
  const isStudent = userProfile?.role === "Student";

  useEffect(() => {
    let q;
    if (isPrincipal) {
      q = query(collection(db, "classes"));
    } else if (isTeacher) {
      q = query(collection(db, "classes"), where("teacherId", "==", currentUser?.uid));
    } else {
      q = query(collection(db, "classes"), where("studentIds", "array-contains", currentUser?.uid));
    }
    return onSnapshot(q, snap => {
      setClasses(snap.docs.map(d => ({ id: d.id, ...d.data() } as SchoolClass)));
    });
  }, [currentUser?.uid, isPrincipal, isTeacher]);

  useEffect(() => {
    if (!isPrincipal) return;
    getDocs(query(collection(db, "users"), where("role", "==", "Teacher"))).then(snap =>
      setTeachers(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    getDocs(query(collection(db, "users"), where("role", "==", "Student"))).then(snap =>
      setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, [isPrincipal]);

  const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

  const createClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.subject || !form.gradeLevel || !form.teacherId) return;
    setCreating(true);
    try {
      const teacher = teachers.find(t => t.id === form.teacherId);
      await addDoc(collection(db, "classes"), {
        name: form.name,
        subject: form.subject,
        gradeLevel: form.gradeLevel,
        teacherId: form.teacherId,
        teacherName: teacher?.fullName || "",
        classCode: generateCode(),
        studentIds: [],
        createdAt: Date.now()
      });
      setForm({ name: "", subject: "", gradeLevel: "", teacherId: "" });
      setShowForm(false);
      toast({ title: "Class created" });
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to create class." });
    } finally {
      setCreating(false);
    }
  };

  const joinClass = async () => {
    if (!joinCode.trim() || !currentUser || !userProfile) return;
    setJoining(true);
    try {
      const q = query(collection(db, "classes"), where("classCode", "==", joinCode.trim().toUpperCase()));
      const snap = await getDocs(q);
      if (snap.empty) {
        toast({ variant: "destructive", title: "Invalid code", description: "No class found with that code." });
        return;
      }
      const classDoc = snap.docs[0];
      await updateDoc(doc(db, "classes", classDoc.id), {
        studentIds: arrayUnion(currentUser.uid)
      });
      setJoinCode("");
      toast({ title: "Joined class!", description: `You're now in ${classDoc.data().name}` });
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to join class." });
    } finally {
      setJoining(false);
    }
  };

  const removeStudent = async (classId: string, studentId: string) => {
    await updateDoc(doc(db, "classes", classId), { studentIds: arrayRemove(studentId) });
    toast({ title: "Student removed" });
  };

  const addStudentToClass = async (classId: string, studentId: string) => {
    await updateDoc(doc(db, "classes", classId), { studentIds: arrayUnion(studentId) });
    toast({ title: "Student added" });
  };

  const deleteClass = async (classId: string) => {
    await deleteDoc(doc(db, "classes", classId));
    toast({ title: "Class deleted" });
  };

  const regenerateCode = async (classId: string) => {
    await updateDoc(doc(db, "classes", classId), { classCode: generateCode() });
    toast({ title: "Class code regenerated" });
  };

  const getStudentName = (uid: string) => students.find(s => s.id === uid)?.fullName || uid;

  const gradeOptions = ["Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6",
    "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12", "Form 1", "Form 2",
    "Form 3", "Form 4", "Form 5", "Form 6", "JSS 1", "JSS 2", "JSS 3", "SSS 1", "SSS 2", "SSS 3"];

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Classes</h1>
          <p className="text-muted-foreground mt-1">
            {isPrincipal ? "Manage all school classes." : isTeacher ? "Your assigned classes." : "Your enrolled classes."}
          </p>
        </div>
        <div className="flex gap-2">
          {isPrincipal && (
            <Button onClick={() => setShowForm(v => !v)} data-testid="button-create-class">
              <Plus className="w-4 h-4 mr-2" /> New Class
            </Button>
          )}
          {isStudent && (
            <div className="flex gap-2">
              <Input
                placeholder="Class code..."
                value={joinCode}
                onChange={e => setJoinCode(e.target.value)}
                onKeyDown={e => e.key === "Enter" && joinClass()}
                className="w-36"
                data-testid="input-class-code"
              />
              <Button onClick={joinClass} disabled={!joinCode.trim() || joining} data-testid="button-join-class">
                {joining ? "Joining..." : "Join"}
              </Button>
            </div>
          )}
        </div>
      </div>

      {showForm && isPrincipal && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Create New Class</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={createClass} className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Class Name</Label>
                <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. 10A Mathematics" required data-testid="input-class-name" />
              </div>
              <div className="space-y-1">
                <Label>Subject</Label>
                <Input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} placeholder="e.g. Mathematics" required data-testid="input-class-subject" />
              </div>
              <div className="space-y-1">
                <Label>Grade Level</Label>
                <Select value={form.gradeLevel} onValueChange={v => setForm(p => ({ ...p, gradeLevel: v }))}>
                  <SelectTrigger data-testid="select-grade"><SelectValue placeholder="Select grade" /></SelectTrigger>
                  <SelectContent>
                    {gradeOptions.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Assign Teacher</Label>
                <Select value={form.teacherId} onValueChange={v => setForm(p => ({ ...p, teacherId: v }))}>
                  <SelectTrigger data-testid="select-teacher"><SelectValue placeholder="Select teacher" /></SelectTrigger>
                  <SelectContent>
                    {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.fullName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit" disabled={creating} data-testid="button-submit-class">
                  {creating ? "Creating..." : "Create Class"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {classes.length === 0 && (
        <div className="text-center py-20 text-muted-foreground border-2 border-dashed rounded-xl">
          <GraduationCap className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p>{isStudent ? "You're not enrolled in any class yet. Use a class code to join." : "No classes yet."}</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {classes.map(cls => {
          const isOpen = expanded === cls.id;
          const enrolledStudents = isPrincipal ? students.filter(s => cls.studentIds.includes(s.id)) : [];
          const unenrolledStudents = isPrincipal ? students.filter(s => !cls.studentIds.includes(s.id)) : [];
          return (
            <Card key={cls.id} className="overflow-hidden" data-testid={`card-class-${cls.id}`}>
              <CardHeader className="pb-3 bg-primary/5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{cls.name}</CardTitle>
                    <CardDescription>{cls.subject} · {cls.gradeLevel}</CardDescription>
                  </div>
                  <div className="flex gap-1">
                    {(isPrincipal || isTeacher) && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpanded(isOpen ? null : cls.id)} data-testid={`button-expand-class-${cls.id}`}>
                        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                    )}
                    {isPrincipal && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteClass(cls.id)} data-testid={`button-delete-class-${cls.id}`}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                  <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{cls.studentIds.length} students</span>
                  <span>Teacher: {cls.teacherName}</span>
                </div>
              </CardHeader>

              {isOpen && (
                <CardContent className="pt-4 space-y-4">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 text-sm">
                      <Key className="w-4 h-4 text-muted-foreground" />
                      <span className="font-mono font-bold text-primary tracking-widest">{cls.classCode}</span>
                      {isPrincipal && (
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => regenerateCode(cls.id)}>
                          Regenerate
                        </Button>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">Share this code with students to enroll</span>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Enrolled Students</p>
                    {cls.studentIds.length === 0 && (
                      <p className="text-sm text-muted-foreground">No students enrolled yet.</p>
                    )}
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {cls.studentIds.map(sid => (
                        <div key={sid} className="flex items-center justify-between bg-muted/60 rounded-md px-3 py-1.5" data-testid={`student-row-${sid}`}>
                          <span className="text-sm">{getStudentName(sid)}</span>
                          {isPrincipal && (
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeStudent(cls.id, sid)}>
                              <UserMinus className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {isPrincipal && unenrolledStudents.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Add Student</p>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {unenrolledStudents.map(s => (
                          <div key={s.id} className="flex items-center justify-between px-3 py-1.5 rounded-md hover:bg-muted/40">
                            <span className="text-sm">{s.fullName}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-primary" onClick={() => addStudentToClass(cls.id, s.id)}>
                              <UserPlus className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
