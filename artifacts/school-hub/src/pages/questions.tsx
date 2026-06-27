import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  collection, query, getDocs, where, addDoc,
  onSnapshot, doc, getDoc, updateDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Redirect } from "wouter";
import { ChevronDown, ChevronUp, Users, User, CheckCircle, Clock, Camera, X, Paperclip } from "lucide-react";

export default function Questions() {
  const { userProfile, currentUser } = useAuth();
  const { toast } = useToast();

  const isTeacher = userProfile?.role === "Teacher" || userProfile?.role === "Principal";
  const isStudent = userProfile?.role === "Student";
  const canAccess = isTeacher || isStudent;

  if (userProfile && !canAccess) {
    return <Redirect to="/dashboard" />;
  }

  if (isStudent) return <StudentQuestions />;
  if (isTeacher) return <TeacherQuestions />;
  return null;
}

function TeacherQuestions() {
  const { userProfile, currentUser } = useAuth();
  const { toast } = useToast();

  const [targetType, setTargetType] = useState<"all" | "student">("all");
  const [targetUserId, setTargetUserId] = useState<string>("");
  const [questionText, setQuestionText] = useState("");
  const [students, setStudents] = useState<any[]>([]);
  const [sending, setSending] = useState(false);
  const [sentQuestions, setSentQuestions] = useState<any[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = query(collection(db, "users"), where("role", "==", "Student"));
    getDocs(q).then(snap => {
      setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

  useEffect(() => {
    if (!userProfile) return;
    const q = query(
      collection(db, "questions"),
      where("teacherId", "==", userProfile.uid)
    );
    return onSnapshot(q, snap => {
      const qs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      qs.sort((a, b) => b.timestamp - a.timestamp);
      setSentQuestions(qs);
    });
  }, [userProfile]);

  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      setShowCamera(true);
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      }, 100);
    } catch {
      toast({ variant: "destructive", title: "Camera unavailable", description: "Could not access the camera." });
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
    setAttachedImage(dataUrl);
    closeCamera();
  };

  const closeCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setShowCamera(false);
  };

  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ variant: "destructive", title: "File too large", description: "Please select an image under 2MB." });
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setAttachedImage(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText.trim()) return;
    if (targetType === "student" && !targetUserId) {
      toast({ variant: "destructive", title: "Target required", description: "Please select a student." });
      return;
    }
    setSending(true);
    try {
      const targetName = targetType === "student"
        ? students.find(s => s.id === targetUserId)?.fullName || ""
        : "All Students";

      await addDoc(collection(db, "questions"), {
        teacherId: currentUser?.uid,
        teacherName: userProfile?.fullName,
        targetType,
        targetUserId: targetType === "student" ? targetUserId : null,
        targetName,
        questionText: questionText.trim(),
        imageUrl: attachedImage || null,
        timestamp: Date.now(),
        answers: []
      });

      toast({ title: "Question Sent", description: "Your question has been sent." });
      setQuestionText("");
      setAttachedImage(null);
      setTargetUserId("");
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to send question." });
    } finally {
      setSending(false);
    }
  };

  const answeredCount = (q: any) => (q.answers || []).length;
  const totalTarget = (q: any) => q.targetType === "all" ? students.length : 1;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Questions</h1>
        <p className="text-muted-foreground mt-1">Send questions to students and track their responses.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Send Form */}
        <Card>
          <CardHeader>
            <CardTitle>New Question</CardTitle>
            <CardDescription>Send a question to your students.</CardDescription>
          </CardHeader>
          <form onSubmit={handleSend}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Target</Label>
                <RadioGroup value={targetType} onValueChange={v => setTargetType(v as "all" | "student")} className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="all" id="all" />
                    <Label htmlFor="all" className="font-normal cursor-pointer">All Students</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="student" id="student" />
                    <Label htmlFor="student" className="font-normal cursor-pointer">Specific Student</Label>
                  </div>
                </RadioGroup>
              </div>

              {targetType === "student" && (
                <div className="space-y-2">
                  <Label>Select Student</Label>
                  <Select value={targetUserId} onValueChange={setTargetUserId}>
                    <SelectTrigger data-testid="select-student">
                      <SelectValue placeholder="Choose a student" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.fullName}</SelectItem>
                      ))}
                      {students.length === 0 && <SelectItem value="none" disabled>No students found</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Question</Label>
                <Textarea
                  data-testid="input-question"
                  placeholder="Type your question..."
                  className="min-h-[100px] resize-y"
                  value={questionText}
                  onChange={e => setQuestionText(e.target.value)}
                  required
                />
              </div>

              {/* Image attachment */}
              {attachedImage && (
                <div className="relative inline-block">
                  <img src={attachedImage} alt="Attached" className="max-h-32 rounded-lg border border-border object-cover" />
                  <button
                    type="button"
                    onClick={() => setAttachedImage(null)}
                    className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={openCamera} data-testid="button-camera">
                  <Camera className="w-4 h-4 mr-1" /> Camera
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} data-testid="button-attach">
                  <Paperclip className="w-4 h-4 mr-1" /> Attach
                </Button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileAttach} />
              </div>

              {/* Camera modal */}
              {showCamera && (
                <div className="relative bg-black rounded-lg overflow-hidden">
                  <video ref={videoRef} autoPlay className="w-full rounded-lg" />
                  <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-3">
                    <Button type="button" size="sm" onClick={capturePhoto} data-testid="button-capture">Capture</Button>
                    <Button type="button" size="sm" variant="destructive" onClick={closeCamera}>Cancel</Button>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="border-t border-border bg-muted/30 py-3 px-6">
              <Button type="submit" disabled={sending || !questionText.trim()} className="ml-auto" data-testid="button-send-question">
                {sending ? "Sending..." : "Send Question"}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Sent Questions with Answer Tracking */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Sent Questions ({sentQuestions.length})</h2>
          {sentQuestions.length === 0 && (
            <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
              No questions sent yet.
            </div>
          )}
          {sentQuestions.map(q => {
            const answers = q.answers || [];
            const count = answers.length;
            const total = q.targetType === "all" ? students.length : 1;
            const isOpen = expandedId === q.id;
            return (
              <Card key={q.id} data-testid={`card-question-${q.id}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm leading-snug truncate">{q.questionText}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {q.targetType === "all" ? <><Users className="w-3 h-3 mr-1" />All Students</> : <><User className="w-3 h-3 mr-1" />{q.targetName}</>}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{new Date(q.timestamp).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${count > 0 ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                        <CheckCircle className="w-3 h-3" />
                        {count}{total > 0 ? `/${total}` : ""}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setExpandedId(isOpen ? null : q.id)}
                        data-testid={`button-expand-${q.id}`}
                      >
                        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {isOpen && (
                  <CardContent className="pt-0 pb-3 border-t border-border mt-1">
                    {q.imageUrl && (
                      <img src={q.imageUrl} alt="Question image" className="max-h-40 rounded-md mb-3 border border-border object-contain" />
                    )}
                    {answers.length === 0 ? (
                      <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
                        <Clock className="w-4 h-4" />
                        No answers yet.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Responses</p>
                        {answers.map((a: any, i: number) => (
                          <div key={i} className="bg-muted/60 rounded-lg p-3 border border-border" data-testid={`answer-${q.id}-${i}`}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-sm text-foreground">{a.studentName}</span>
                              <span className="text-xs text-muted-foreground">{new Date(a.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                            </div>
                            <p className="text-sm text-foreground">{a.answer}</p>
                            {a.imageUrl && (
                              <img src={a.imageUrl} alt="Answer image" className="max-h-32 rounded mt-2 border border-border object-contain" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StudentQuestions() {
  const { userProfile, currentUser } = useAuth();
  const { toast } = useToast();
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [attachedImages, setAttachedImages] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});
  const [showCamera, setShowCamera] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (!userProfile) return;
    const questionsRef = collection(db, "questions");
    const qAll = query(questionsRef, where("targetType", "==", "all"), orderBy("timestamp", "desc"));
    const qSpecific = query(questionsRef, where("targetType", "==", "student"), where("targetUserId", "==", userProfile.uid), orderBy("timestamp", "desc"));

    let allDocs: any[] = [];
    let specificDocs: any[] = [];

    const merge = () => {
      const map = new Map<string, any>();
      [...allDocs, ...specificDocs].forEach(q => map.set(q.id, q));
      const merged = Array.from(map.values()).sort((a, b) => b.timestamp - a.timestamp);
      setQuestions(merged);
    };

    const u1 = onSnapshot(qAll, snap => {
      allDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      merge();
    });
    const u2 = onSnapshot(qSpecific, snap => {
      specificDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      merge();
    });

    return () => { u1(); u2(); };
  }, [userProfile]);

  const openCamera = async (qid: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      setShowCamera(qid);
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      }, 100);
    } catch {
      toast({ variant: "destructive", title: "Camera unavailable" });
    }
  };

  const capturePhoto = (qid: string) => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
    setAttachedImages(p => ({ ...p, [qid]: dataUrl }));
    closeCamera();
  };

  const closeCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setShowCamera(null);
  };

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
      existing.push({
        studentId: currentUser.uid,
        studentName: userProfile.fullName,
        answer: text,
        imageUrl: attachedImages[qid] || null,
        timestamp: Date.now()
      });
      await updateDoc(questionRef, { answers: existing });
      toast({ title: "Answer submitted", description: "Your teacher can now see your response." });
      setAnswers(p => ({ ...p, [qid]: "" }));
      setAttachedImages(p => { const n = { ...p }; delete n[qid]; return n; });
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to submit answer." });
    } finally {
      setSubmitting(p => ({ ...p, [qid]: false }));
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">My Questions</h1>
        <p className="text-muted-foreground mt-1">Questions from your teachers.</p>
      </div>

      {questions.length === 0 && (
        <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-xl">
          No questions yet. You're all caught up!
        </div>
      )}

      {questions.map(q => {
        const myAnswer = (q.answers || []).find((a: any) => a.studentId === currentUser?.uid);
        const isAnswered = !!myAnswer;
        return (
          <Card key={q.id} className={`border-l-4 ${isAnswered ? "border-l-green-500" : "border-l-primary"}`} data-testid={`card-question-${q.id}`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-primary text-sm">{q.teacherName}</span>
                <div className="flex items-center gap-2">
                  {isAnswered
                    ? <Badge className="bg-green-100 text-green-700 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />Answered</Badge>
                    : <Badge variant="outline" className="text-amber-600 border-amber-300"><Clock className="w-3 h-3 mr-1" />Pending</Badge>
                  }
                  <span className="text-xs text-muted-foreground">{new Date(q.timestamp).toLocaleDateString()}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-foreground font-medium">{q.questionText}</p>
              {q.imageUrl && (
                <img src={q.imageUrl} alt="Question" className="max-h-40 rounded-lg border border-border object-contain" />
              )}

              {isAnswered ? (
                <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Your answer:</p>
                  <p className="text-sm">{myAnswer.answer}</p>
                  {myAnswer.imageUrl && <img src={myAnswer.imageUrl} alt="Your answer" className="max-h-28 rounded mt-2 border border-border object-contain" />}
                </div>
              ) : (
                <div className="space-y-2">
                  <Textarea
                    placeholder="Type your answer..."
                    value={answers[q.id] || ""}
                    onChange={e => setAnswers(p => ({ ...p, [q.id]: e.target.value }))}
                    className="min-h-[80px] resize-none"
                    data-testid={`input-answer-${q.id}`}
                  />

                  {attachedImages[q.id] && (
                    <div className="relative inline-block">
                      <img src={attachedImages[q.id]} alt="Attached" className="max-h-24 rounded-lg border border-border object-cover" />
                      <button
                        type="button"
                        onClick={() => setAttachedImages(p => { const n = { ...p }; delete n[q.id]; return n; })}
                        className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {showCamera === q.id && (
                    <div className="relative bg-black rounded-lg overflow-hidden">
                      <video ref={videoRef} autoPlay className="w-full rounded-lg" />
                      <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-3">
                        <Button size="sm" onClick={() => capturePhoto(q.id)}>Capture</Button>
                        <Button size="sm" variant="destructive" onClick={closeCamera}>Cancel</Button>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => openCamera(q.id)} data-testid={`button-camera-${q.id}`}>
                      <Camera className="w-4 h-4 mr-1" /> Camera
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileRefs.current[q.id]?.click()}
                      data-testid={`button-attach-${q.id}`}
                    >
                      <Paperclip className="w-4 h-4 mr-1" /> Attach
                    </Button>
                    <input
                      ref={el => fileRefs.current[q.id] = el}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = ev => setAttachedImages(p => ({ ...p, [q.id]: ev.target?.result as string }));
                        reader.readAsDataURL(file);
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={() => handleSubmit(q.id)}
                      disabled={!answers[q.id]?.trim() || submitting[q.id]}
                      className="ml-auto"
                      data-testid={`button-submit-${q.id}`}
                    >
                      {submitting[q.id] ? "Submitting..." : "Submit Answer"}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
