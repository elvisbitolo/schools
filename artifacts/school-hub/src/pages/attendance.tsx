import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { collection, query, where, getDocs, onSnapshot, doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ClipboardList, CheckCircle, XCircle, Clock, ChevronLeft, ChevronRight, Save } from "lucide-react";

type AttStatus = "present" | "absent" | "late";

interface AttRecord {
  studentId: string;
  studentName: string;
  status: AttStatus;
  note?: string;
}

interface SchoolClass {
  id: string;
  name: string;
  subject: string;
  teacherId: string;
  teacherName: string;
  studentIds: string[];
}

const statusConfig: Record<AttStatus, { label: string; color: string; icon: any }> = {
  present: { label: "Present", color: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle },
  absent: { label: "Absent", color: "bg-red-100 text-red-700 border-red-200", icon: XCircle },
  late: { label: "Late", color: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock }
};

function dateStr(date: Date) {
  return date.toISOString().split("T")[0];
}

export default function Attendance() {
  const { userProfile, currentUser } = useAuth();
  const { toast } = useToast();
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [students, setStudents] = useState<any[]>([]);
  const [records, setRecords] = useState<Record<string, AttStatus>>({});
  const [savedRecords, setSavedRecords] = useState<AttRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState(dateStr(new Date()));
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<"mark" | "view">("mark");

  const isPrincipal = userProfile?.role === "Principal";
  const isTeacher = userProfile?.role === "Teacher" || isPrincipal;
  const isStudent = userProfile?.role === "Student";
  const isParent = userProfile?.role === "Parent";

  useEffect(() => {
    if (!currentUser) return;
    let q;
    if (isTeacher && !isPrincipal) {
      q = query(collection(db, "classes"), where("teacherId", "==", currentUser.uid));
    } else if (isPrincipal) {
      q = query(collection(db, "classes"));
    } else if (isStudent) {
      q = query(collection(db, "classes"), where("studentIds", "array-contains", currentUser.uid));
    } else {
      return;
    }
    return onSnapshot(q, snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as SchoolClass));
      setClasses(list);
      if (list.length > 0 && !selectedClass) setSelectedClass(list[0].id);
    });
  }, [currentUser?.uid, isTeacher, isPrincipal, isStudent]);

  useEffect(() => {
    if (!selectedClass) return;
    const cls = classes.find(c => c.id === selectedClass);
    if (!cls) return;

    if (isTeacher) {
      getDocs(query(collection(db, "users"), where("role", "==", "Student"))).then(snap => {
        const allStudents = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setStudents(allStudents.filter(s => cls.studentIds.includes(s.id)));
      });
    }
  }, [selectedClass, classes, isTeacher]);

  useEffect(() => {
    if (!selectedClass || !selectedDate) return;
    const docId = `${selectedDate}_${selectedClass}`;
    getDoc(doc(db, "attendance", docId)).then(snap => {
      if (snap.exists()) {
        const data = snap.data();
        const recs: AttRecord[] = data.records || [];
        setSavedRecords(recs);
        const map: Record<string, AttStatus> = {};
        recs.forEach(r => { map[r.studentId] = r.status; });
        setRecords(map);
      } else {
        setSavedRecords([]);
        setRecords({});
      }
    });
  }, [selectedClass, selectedDate]);

  const setStatus = (studentId: string, status: AttStatus) => {
    setRecords(p => ({ ...p, [studentId]: status }));
  };

  const saveAttendance = async () => {
    if (!selectedClass || !selectedDate || !currentUser || !userProfile) return;
    setSaving(true);
    const cls = classes.find(c => c.id === selectedClass);
    try {
      const recs: AttRecord[] = students.map(s => ({
        studentId: s.id,
        studentName: s.fullName,
        status: records[s.id] || "absent"
      }));
      await setDoc(doc(db, "attendance", `${selectedDate}_${selectedClass}`), {
        date: selectedDate,
        classId: selectedClass,
        className: cls?.name || "",
        teacherId: currentUser.uid,
        teacherName: userProfile.fullName,
        records: recs,
        savedAt: Date.now()
      });
      setSavedRecords(recs);
      toast({ title: "Attendance saved", description: `${recs.length} records saved for ${cls?.name}.` });
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to save attendance." });
    } finally {
      setSaving(false);
    }
  };

  const shiftDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(dateStr(d));
  };

  const presentCount = Object.values(records).filter(s => s === "present").length;
  const absentCount = Object.values(records).filter(s => s === "absent").length;
  const lateCount = Object.values(records).filter(s => s === "late").length;

  if (!isTeacher && !isStudent && !isParent) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-20" />
        <p>Attendance is not available for your role.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Attendance</h1>
        <p className="text-muted-foreground mt-1">
          {isTeacher ? "Mark and view class attendance." : "View your attendance records."}
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        {classes.length > 1 && (
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-48" data-testid="select-class">
              <SelectValue placeholder="Select class" />
            </SelectTrigger>
            <SelectContent>
              {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {classes.length === 1 && (
          <Badge variant="outline" className="text-sm px-3 py-1.5">{classes[0]?.name}</Badge>
        )}

        {/* Date nav */}
        <div className="flex items-center gap-1 border border-border rounded-md overflow-hidden">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-none" onClick={() => shiftDate(-1)} data-testid="button-prev-day">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            max={dateStr(new Date())}
            className="text-sm px-2 h-9 bg-transparent focus:outline-none"
            data-testid="input-attendance-date"
          />
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-none" onClick={() => shiftDate(1)} disabled={selectedDate >= dateStr(new Date())} data-testid="button-next-day">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {isTeacher && students.length > 0 && (
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" size="sm" onClick={() => { const all: Record<string, AttStatus> = {}; students.forEach(s => all[s.id] = "present"); setRecords(all); }} data-testid="button-mark-all-present">
              All Present
            </Button>
            <Button size="sm" onClick={saveAttendance} disabled={saving} data-testid="button-save-attendance">
              <Save className="w-4 h-4 mr-1" /> {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        )}
      </div>

      {/* Summary */}
      {(isTeacher && students.length > 0) && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Present", count: presentCount, color: "text-green-600", bg: "bg-green-50" },
            { label: "Absent", count: absentCount, color: "text-red-600", bg: "bg-red-50" },
            { label: "Late", count: lateCount, color: "text-amber-600", bg: "bg-amber-50" }
          ].map(item => (
            <Card key={item.label} className={`${item.bg} border-0`}>
              <CardContent className="p-3 text-center">
                <div className={`text-2xl font-bold ${item.color}`}>{item.count}</div>
                <div className="text-xs text-muted-foreground">{item.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Student list for marking */}
      {isTeacher && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Student Attendance — {new Date(selectedDate + "T00:00:00").toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}</CardTitle>
            {students.length === 0 && <CardDescription>No students enrolled in this class yet.</CardDescription>}
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {students.map((s, i) => {
                const status = records[s.id] || "absent";
                return (
                  <div key={s.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40 transition-colors" data-testid={`attendance-row-${s.id}`}>
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm shrink-0">
                      {s.fullName?.[0]}
                    </div>
                    <span className="text-sm font-medium flex-1 min-w-0 truncate">{s.fullName}</span>
                    <div className="flex gap-1.5">
                      {(["present", "late", "absent"] as AttStatus[]).map(st => {
                        const cfg = statusConfig[st];
                        const Icon = cfg.icon;
                        return (
                          <button
                            key={st}
                            onClick={() => setStatus(s.id, st)}
                            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border transition-all ${
                              status === st ? cfg.color : "border-border text-muted-foreground hover:bg-muted"
                            }`}
                            data-testid={`button-${st}-${s.id}`}
                          >
                            <Icon className="w-3 h-3" />
                            <span className="hidden sm:inline">{cfg.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Student's own attendance view */}
      {isStudent && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">My Attendance — {selectedDate}</CardTitle>
          </CardHeader>
          <CardContent>
            {classes.length === 0 ? (
              <p className="text-muted-foreground text-sm">You're not enrolled in any classes yet.</p>
            ) : savedRecords.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                No attendance recorded for this date.
              </div>
            ) : (
              <div className="space-y-2">
                {savedRecords.filter(r => r.studentId === currentUser?.uid).map(r => {
                  const cfg = statusConfig[r.status];
                  const Icon = cfg.icon;
                  return (
                    <div key={r.studentId} className={`flex items-center gap-3 p-3 rounded-lg border ${cfg.color}`}>
                      <Icon className="w-5 h-5" />
                      <div>
                        <p className="font-medium text-sm">{cfg.label}</p>
                        <p className="text-xs opacity-70">{classes.find(c => c.id === selectedClass)?.name}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
