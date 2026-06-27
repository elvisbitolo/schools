import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Megaphone, Trash2, Paperclip, X, Plus, ChevronDown, ChevronUp } from "lucide-react";

const STAFF_ROLES = ["Principal", "Teacher", "Librarian", "Non-Teaching Staff"];
const LAST_READ_KEY = "schoolhub_last_read_announcements";

interface Announcement {
  id: string;
  title: string;
  body: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  timestamp: number;
  attachmentName?: string;
  attachmentData?: string;
  attachmentType?: string;
  pinned?: boolean;
}

export function getUnreadCount(announcements: Announcement[]): number {
  const lastRead = parseInt(localStorage.getItem(LAST_READ_KEY) || "0", 10);
  return announcements.filter(a => a.timestamp > lastRead).length;
}

export function markAllRead() {
  localStorage.setItem(LAST_READ_KEY, Date.now().toString());
}

export default function Announcements() {
  const { userProfile, currentUser } = useAuth();
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [posting, setPosting] = useState(false);
  const [attachment, setAttachment] = useState<{ name: string; data: string; type: string } | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const canPost = userProfile && STAFF_ROLES.includes(userProfile.role);

  useEffect(() => {
    const q = query(collection(db, "announcements"), orderBy("timestamp", "desc"));
    const unsub = onSnapshot(q, snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Announcement));
      setAnnouncements(list);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    markAllRead();
    return () => { markAllRead(); };
  }, []);

  const handleAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ variant: "destructive", title: "File too large", description: "Max 2MB." });
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      setAttachment({ name: file.name, data: ev.target?.result as string, type: file.type });
    };
    reader.readAsDataURL(file);
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim() || !currentUser || !userProfile) return;
    setPosting(true);
    try {
      await addDoc(collection(db, "announcements"), {
        title: title.trim(),
        body: body.trim(),
        authorId: currentUser.uid,
        authorName: userProfile.fullName,
        authorRole: userProfile.role,
        timestamp: Date.now(),
        attachmentName: attachment?.name || null,
        attachmentData: attachment?.data || null,
        attachmentType: attachment?.type || null,
        pinned: false
      });
      setTitle(""); setBody(""); setAttachment(null); setShowForm(false);
      toast({ title: "Announcement posted", description: "Everyone can now see it." });
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to post." });
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "announcements", id));
      toast({ title: "Deleted" });
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Could not delete." });
    }
  };

  const roleColor = (role: string) => {
    if (role === "Principal") return "bg-amber-100 text-amber-800 border-amber-200";
    if (role === "Teacher") return "bg-blue-100 text-blue-800 border-blue-200";
    return "bg-gray-100 text-gray-700 border-gray-200";
  };

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Announcements</h1>
          <p className="text-muted-foreground mt-1">School-wide notices and updates.</p>
        </div>
        {canPost && (
          <Button onClick={() => setShowForm(v => !v)} data-testid="button-toggle-form">
            <Plus className="w-4 h-4 mr-2" />
            {showForm ? "Cancel" : "New Announcement"}
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="border-primary/30 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Post an Announcement</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePost} className="space-y-4">
              <div className="space-y-1">
                <Label>Title</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. School closed on Friday" required data-testid="input-announcement-title" />
              </div>
              <div className="space-y-1">
                <Label>Message</Label>
                <Textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Write your announcement..." className="min-h-[100px] resize-y" required data-testid="input-announcement-body" />
              </div>
              {attachment && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted p-2 rounded-md">
                  <Paperclip className="w-4 h-4" />
                  <span className="truncate flex-1">{attachment.name}</span>
                  <button type="button" onClick={() => setAttachment(null)}><X className="w-4 h-4" /></button>
                </div>
              )}
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} data-testid="button-attach">
                  <Paperclip className="w-4 h-4 mr-1" /> Attach File
                </Button>
                <input ref={fileRef} type="file" className="hidden" onChange={handleAttach} />
                <Button type="submit" disabled={posting || !title.trim() || !body.trim()} className="ml-auto" data-testid="button-post">
                  {posting ? "Posting..." : "Post"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {announcements.length === 0 && (
        <div className="text-center py-20 text-muted-foreground border-2 border-dashed rounded-xl">
          <Megaphone className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p>No announcements yet.</p>
        </div>
      )}

      <div className="space-y-3">
        {announcements.map(a => {
          const isOpen = expanded === a.id;
          const isOwner = a.authorId === currentUser?.uid;
          const canDelete = isOwner || userProfile?.role === "Principal";
          const lastRead = parseInt(localStorage.getItem(LAST_READ_KEY) || "0", 10);
          const isNew = a.timestamp > lastRead - 5000;
          return (
            <Card key={a.id} className={`transition-shadow ${isNew ? "border-primary/40 shadow-sm" : ""}`} data-testid={`card-announcement-${a.id}`}>
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Megaphone className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-foreground text-sm sm:text-base">{a.title}</h3>
                        {isNew && <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0">New</Badge>}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded border ${roleColor(a.authorRole)}`}>{a.authorRole}</span>
                        <span className="text-xs text-muted-foreground">{a.authorName}</span>
                        <span className="text-xs text-muted-foreground">{new Date(a.timestamp).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {canDelete && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(a.id)} data-testid={`button-delete-${a.id}`}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpanded(isOpen ? null : a.id)} data-testid={`button-expand-${a.id}`}>
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                {!isOpen && (
                  <p className="text-sm text-muted-foreground mt-2 ml-12 line-clamp-2">{a.body}</p>
                )}

                {isOpen && (
                  <div className="mt-3 ml-12 space-y-3">
                    <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{a.body}</p>
                    {a.attachmentData && a.attachmentType?.startsWith("image") && (
                      <img src={a.attachmentData} alt={a.attachmentName} className="max-h-60 rounded-lg border border-border object-contain" />
                    )}
                    {a.attachmentData && !a.attachmentType?.startsWith("image") && (
                      <a href={a.attachmentData} download={a.attachmentName} className="flex items-center gap-2 text-sm text-primary hover:underline">
                        <Paperclip className="w-4 h-4" /> {a.attachmentName}
                      </a>
                    )}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
