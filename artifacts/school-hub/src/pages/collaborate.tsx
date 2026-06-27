import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  collection, addDoc, onSnapshot, query, orderBy,
  doc, updateDoc, getDoc, serverTimestamp, setDoc, deleteField
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { FileText, Plus, ArrowLeft, Users, Save, Clock } from "lucide-react";

interface SharedDoc {
  id: string;
  title: string;
  content: string;
  createdBy: string;
  createdByName: string;
  updatedAt: number;
  editors?: Record<string, { name: string; lastSeen: number }>;
}

export default function Collaborate() {
  const { userProfile, currentUser } = useAuth();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<SharedDoc[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<SharedDoc | null>(null);
  const [editContent, setEditContent] = useState("");
  const [docTitle, setDocTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [activeEditors, setActiveEditors] = useState<{ name: string }[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const presenceInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "doc">("list");

  // Load documents list
  useEffect(() => {
    const q = query(collection(db, "sharedDocs"), orderBy("updatedAt", "desc"));
    return onSnapshot(q, snap => {
      setDocuments(snap.docs.map(d => ({ id: d.id, ...d.data() } as SharedDoc)));
    });
  }, []);

  // Watch selected document for real-time changes
  useEffect(() => {
    if (!selectedDoc) return;
    const unsub = onSnapshot(doc(db, "sharedDocs", selectedDoc.id), snap => {
      if (!snap.exists()) return;
      const data = snap.data() as SharedDoc;
      // Only update content if we're not the one who changed it (avoid cursor jumps)
      // We compare with our local content
      setSelectedDoc(prev => prev ? { ...prev, ...data, id: snap.id } : null);

      // Update active editors
      const editors = data.editors || {};
      const now = Date.now();
      const active = Object.entries(editors)
        .filter(([uid, e]) => uid !== currentUser?.uid && now - e.lastSeen < 15000)
        .map(([, e]) => ({ name: e.name }));
      setActiveEditors(active);
    });
    return () => unsub();
  }, [selectedDoc?.id, currentUser?.uid]);

  // Presence ping while editing
  useEffect(() => {
    if (!selectedDoc || !currentUser || !userProfile) return;

    const updatePresence = async () => {
      try {
        await updateDoc(doc(db, "sharedDocs", selectedDoc.id), {
          [`editors.${currentUser.uid}`]: { name: userProfile.fullName, lastSeen: Date.now() }
        });
      } catch { /* doc may not exist yet */ }
    };

    updatePresence();
    presenceInterval.current = setInterval(updatePresence, 8000);

    return () => {
      if (presenceInterval.current) clearInterval(presenceInterval.current);
      // Remove presence on leave
      updateDoc(doc(db, "sharedDocs", selectedDoc.id), {
        [`editors.${currentUser.uid}`]: deleteField()
      }).catch(() => {});
    };
  }, [selectedDoc?.id, currentUser?.uid, userProfile?.fullName]);

  const openDoc = (d: SharedDoc) => {
    setSelectedDoc(d);
    setEditContent(d.content || "");
    setDocTitle(d.title || "");
    setLastSaved(null);
    setMobileView("doc");
  };

  const closeDoc = () => {
    setSelectedDoc(null);
    setMobileView("list");
  };

  // Debounced auto-save as user types (real-time like Google Docs)
  const handleContentChange = useCallback((value: string) => {
    setEditContent(value);
    if (!selectedDoc) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        await updateDoc(doc(db, "sharedDocs", selectedDoc.id), {
          content: value,
          updatedAt: Date.now()
        });
        setLastSaved(new Date());
      } catch {
        toast({ variant: "destructive", title: "Save failed", description: "Could not save changes." });
      } finally {
        setSaving(false);
      }
    }, 600);
  }, [selectedDoc, toast]);

  const handleTitleChange = useCallback((value: string) => {
    setDocTitle(value);
    if (!selectedDoc) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        await updateDoc(doc(db, "sharedDocs", selectedDoc.id), {
          title: value,
          updatedAt: Date.now()
        });
      } catch { /* silent */ }
    }, 800);
  }, [selectedDoc]);

  const createDocument = async () => {
    if (!newTitle.trim() || !currentUser || !userProfile) return;
    setCreating(true);
    try {
      const docRef = await addDoc(collection(db, "sharedDocs"), {
        title: newTitle.trim(),
        content: "",
        createdBy: currentUser.uid,
        createdByName: userProfile.fullName,
        updatedAt: Date.now(),
        editors: {}
      });
      toast({ title: "Document created", description: `"${newTitle.trim()}" is ready to edit.` });
      setNewTitle("");
      // Auto-open
      openDoc({ id: docRef.id, title: newTitle.trim(), content: "", createdBy: currentUser.uid, createdByName: userProfile.fullName, updatedAt: Date.now() });
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Could not create document." });
    } finally {
      setCreating(false);
    }
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return d.toLocaleDateString();
  };

  const docList = (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border shrink-0">
        <h2 className="font-bold text-base mb-3">Shared Documents</h2>
        <div className="flex gap-2">
          <Input
            placeholder="New document title..."
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => e.key === "Enter" && createDocument()}
            className="flex-1 text-sm"
            data-testid="input-new-doc-title"
          />
          <Button size="sm" onClick={createDocument} disabled={!newTitle.trim() || creating} data-testid="button-create-doc">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {documents.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
            No documents yet. Create the first one!
          </div>
        )}
        {documents.map(d => (
          <button
            key={d.id}
            onClick={() => openDoc(d)}
            className={`w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors ${
              selectedDoc?.id === d.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
            }`}
            data-testid={`button-doc-${d.id}`}
          >
            <FileText className={`w-4 h-4 mt-0.5 shrink-0 ${selectedDoc?.id === d.id ? "text-primary-foreground" : "text-primary"}`} />
            <div className="min-w-0 flex-1">
              <div className="font-medium text-sm truncate">{d.title}</div>
              <div className={`text-xs truncate ${selectedDoc?.id === d.id ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                {d.createdByName} · {formatTime(d.updatedAt)}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const docEditor = (
    <div className="flex flex-col h-full bg-background">
      {selectedDoc ? (
        <>
          {/* Doc header */}
          <div className="p-3 sm:p-4 border-b border-border bg-card flex items-center gap-2 shrink-0 flex-wrap">
            <button
              className="md:hidden p-1 rounded hover:bg-muted"
              onClick={closeDoc}
              data-testid="button-back-to-list"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <Input
              value={docTitle}
              onChange={e => handleTitleChange(e.target.value)}
              className="text-sm font-semibold flex-1 border-none shadow-none focus-visible:ring-0 text-foreground bg-transparent px-1 min-w-0"
              placeholder="Document title..."
              data-testid="input-doc-title"
            />
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {activeEditors.length > 0 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="w-3 h-3" />
                  {activeEditors.map(e => e.name).join(", ")} editing
                </div>
              )}
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                {saving
                  ? <><Save className="w-3 h-3 animate-pulse" /> Saving...</>
                  : lastSaved
                  ? <><Clock className="w-3 h-3" /> Saved {formatTime(lastSaved.getTime())}</>
                  : null
                }
              </div>
              <Badge variant="outline" className="text-xs hidden sm:flex">
                <div className="w-2 h-2 rounded-full bg-green-500 mr-1.5" /> Live
              </Badge>
            </div>
          </div>

          {/* Editor area */}
          <div className="flex-1 overflow-hidden p-3 sm:p-6">
            <textarea
              value={editContent}
              onChange={e => handleContentChange(e.target.value)}
              className="w-full h-full resize-none bg-transparent text-foreground text-sm sm:text-base leading-relaxed focus:outline-none font-mono placeholder:text-muted-foreground"
              placeholder="Start typing... changes save automatically and sync in real time for all editors."
              data-testid="textarea-doc-content"
            />
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-border bg-muted/30 flex items-center justify-between text-xs text-muted-foreground">
            <span>Created by {selectedDoc.createdByName}</span>
            <span>{editContent.split(/\s+/).filter(Boolean).length} words · {editContent.length} chars</span>
          </div>
        </>
      ) : (
        <div className="flex-1 hidden md:flex flex-col items-center justify-center text-muted-foreground gap-3">
          <FileText className="w-12 h-12 opacity-20" />
          <p className="text-sm">Select a document or create a new one</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="hidden md:block">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Collaborate</h1>
        <p className="text-muted-foreground mt-1">Real-time shared documents — edits sync instantly for all viewers.</p>
      </div>

      <div className="h-[calc(100dvh-10rem)] md:h-[calc(100vh-12rem)] flex border border-border rounded-xl overflow-hidden shadow-sm">
        {/* Sidebar */}
        <div className={`w-full md:w-72 border-r border-border bg-sidebar shrink-0 ${
          mobileView === "list" ? "flex flex-col" : "hidden md:flex md:flex-col"
        }`}>
          {docList}
        </div>

        {/* Editor */}
        <div className={`flex-1 min-w-0 ${
          mobileView === "doc" ? "flex flex-col" : "hidden md:flex md:flex-col"
        }`}>
          {docEditor}
        </div>
      </div>
    </div>
  );
}
