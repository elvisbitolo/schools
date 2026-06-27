import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { collection, query, getDocs, where, onSnapshot, addDoc, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Search, Send, User, Camera, Paperclip, ArrowLeft, X, Video, StopCircle } from "lucide-react";
import { Redirect } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function Chat() {
  const { userProfile, currentUser } = useAuth();
  const { toast } = useToast();
  const [staff, setStaff] = useState<any[]>([]);
  const [filteredStaff, setFilteredStaff] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Camera/video state
  const [showCamera, setShowCamera] = useState(false);
  const [cameraMode, setCameraMode] = useState<"photo" | "video">("photo");
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [pendingMedia, setPendingMedia] = useState<{ type: "image" | "video"; data: string } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Mobile: show sidebar or chat
  const [mobileView, setMobileView] = useState<"sidebar" | "chat">("sidebar");

  const allowedRoles = ["Principal", "Teacher", "Librarian", "Non-Teaching Staff"];
  const canAccess = userProfile && allowedRoles.includes(userProfile.role);

  useEffect(() => {
    if (!canAccess) return;
    const q = query(collection(db, "users"), where("role", "in", ["Principal", "Teacher", "Librarian", "Non-Teaching Staff"]));
    getDocs(q).then(snap => {
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((u: any) => u.id !== currentUser?.uid);
      setStaff(list);
      setFilteredStaff(list);
    });
  }, [canAccess, currentUser]);

  useEffect(() => {
    const lower = searchQuery.toLowerCase();
    setFilteredStaff(staff.filter((u: any) =>
      u.fullName?.toLowerCase().includes(lower) || u.role?.toLowerCase().includes(lower)
    ));
  }, [searchQuery, staff]);

  useEffect(() => {
    if (!selectedUser || !currentUser) return;
    const conversationId = [currentUser.uid, selectedUser.id].sort().join("_");
    const messagesRef = collection(db, `messages/${conversationId}/thread`);
    const q = query(messagesRef, orderBy("timestamp", "asc"));
    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setTimeout(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }, 80);
    });
    return () => unsub();
  }, [selectedUser, currentUser]);

  if (userProfile && !canAccess) return <Redirect to="/dashboard" />;

  const selectUser = (user: any) => {
    setSelectedUser(user);
    setMobileView("chat");
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !pendingMedia) || !selectedUser || !currentUser || !userProfile) return;
    const conversationId = [currentUser.uid, selectedUser.id].sort().join("_");
    const messagesRef = collection(db, `messages/${conversationId}/thread`);
    await addDoc(messagesRef, {
      senderId: currentUser.uid,
      senderName: userProfile.fullName,
      receiverId: selectedUser.id,
      text: newMessage.trim() || null,
      mediaType: pendingMedia?.type || null,
      mediaData: pendingMedia?.data || null,
      timestamp: Date.now()
    });
    setNewMessage("");
    setPendingMedia(null);
  };

  const openCamera = async (mode: "photo" | "video") => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: mode === "video" });
      streamRef.current = stream;
      setCameraMode(mode);
      setShowCamera(true);
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      }, 100);
    } catch {
      toast({ variant: "destructive", title: "Camera unavailable", description: "Could not access camera or microphone." });
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.65);
    setPendingMedia({ type: "image", data: dataUrl });
    closeCamera();
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const mr = new MediaRecorder(streamRef.current);
    mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const reader = new FileReader();
      reader.onload = ev => {
        setPendingMedia({ type: "video", data: ev.target?.result as string });
        closeCamera();
      };
      reader.readAsDataURL(blob);
    };
    mr.start();
    setMediaRecorder(mr);
    setRecording(true);
  };

  const stopRecording = () => {
    mediaRecorder?.stop();
    setRecording(false);
  };

  const closeCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setShowCamera(false);
    setRecording(false);
  };

  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      toast({ variant: "destructive", title: "File too large", description: "Max 3MB for file attachments." });
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      const type = file.type.startsWith("video") ? "video" : "image";
      setPendingMedia({ type, data: ev.target?.result as string });
    };
    reader.readAsDataURL(file);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border shrink-0">
        <h2 className="font-bold text-base mb-3">Staff Directory</h2>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            className="pl-8"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            data-testid="input-search-staff"
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filteredStaff.map(user => (
            <button
              key={user.id}
              onClick={() => selectUser(user)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                selectedUser?.id === user.id
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              }`}
              data-testid={`button-staff-${user.id}`}
            >
              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${
                selectedUser?.id === user.id ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
              }`}>
                {user.fullName?.[0] || "?"}
              </div>
              <div className="overflow-hidden">
                <div className="font-medium text-sm truncate">{user.fullName}</div>
                <div className={`text-xs truncate ${selectedUser?.id === user.id ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {user.role}
                </div>
              </div>
            </button>
          ))}
          {filteredStaff.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">No staff found</div>
          )}
        </div>
      </ScrollArea>
    </div>
  );

  const chatContent = (
    <div className="flex flex-col h-full">
      {selectedUser ? (
        <>
          {/* Chat header */}
          <div className="p-3 sm:p-4 border-b border-border bg-card flex items-center gap-3 shrink-0">
            <button className="md:hidden p-1 rounded hover:bg-muted" onClick={() => setMobileView("sidebar")} data-testid="button-back-to-sidebar">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm shrink-0">
              {selectedUser.fullName?.[0] || "?"}
            </div>
            <div>
              <div className="font-bold text-sm text-foreground">{selectedUser.fullName}</div>
              <div className="text-xs text-muted-foreground">{selectedUser.role}</div>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
            {messages.map(msg => {
              const isMe = msg.senderId === currentUser?.uid;
              return (
                <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`} data-testid={`message-${msg.id}`}>
                  <div className={`max-w-[80%] sm:max-w-[70%] rounded-2xl px-3 py-2 ${
                    isMe ? "bg-primary text-primary-foreground rounded-br-none" : "bg-muted text-foreground rounded-bl-none border border-border"
                  }`}>
                    {msg.text && <p className="text-sm leading-relaxed">{msg.text}</p>}
                    {msg.mediaType === "image" && msg.mediaData && (
                      <img src={msg.mediaData} alt="Shared image" className="max-w-full rounded-lg mt-1 max-h-48 object-contain" />
                    )}
                    {msg.mediaType === "video" && msg.mediaData && (
                      <video src={msg.mediaData} controls className="max-w-full rounded-lg mt-1 max-h-48" />
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 px-1">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              );
            })}
            {messages.length === 0 && (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                Start the conversation!
              </div>
            )}
          </div>

          {/* Camera modal */}
          {showCamera && (
            <div className="p-3 border-t border-border bg-card">
              <div className="relative bg-black rounded-xl overflow-hidden">
                <video ref={videoRef} autoPlay muted={cameraMode === "photo"} className="w-full max-h-48 object-cover" />
                <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-2">
                  {cameraMode === "photo" ? (
                    <Button size="sm" onClick={capturePhoto} data-testid="button-capture-photo">Capture Photo</Button>
                  ) : recording ? (
                    <Button size="sm" variant="destructive" onClick={stopRecording} data-testid="button-stop-recording">
                      <StopCircle className="w-4 h-4 mr-1" /> Stop
                    </Button>
                  ) : (
                    <Button size="sm" onClick={startRecording} data-testid="button-start-recording">
                      <Video className="w-4 h-4 mr-1" /> Record
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={closeCamera}>Cancel</Button>
                </div>
              </div>
            </div>
          )}

          {/* Pending media preview */}
          {pendingMedia && (
            <div className="px-3 pb-2 border-t border-border pt-2 bg-card flex items-start gap-2">
              <div className="relative">
                {pendingMedia.type === "image"
                  ? <img src={pendingMedia.data} alt="Preview" className="h-16 rounded-lg border border-border object-cover" />
                  : <video src={pendingMedia.data} className="h-16 rounded-lg border border-border" />
                }
                <button
                  onClick={() => setPendingMedia(null)}
                  className="absolute -top-1.5 -right-1.5 bg-destructive text-white rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              <span className="text-xs text-muted-foreground mt-1">{pendingMedia.type === "image" ? "Photo ready" : "Video ready"}</span>
            </div>
          )}

          {/* Input bar */}
          <div className="p-3 border-t border-border bg-card shrink-0">
            <form onSubmit={handleSend} className="flex gap-2 items-end">
              <div className="flex gap-1">
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => openCamera("photo")} data-testid="button-open-camera">
                  <Camera className="w-4 h-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => openCamera("video")} data-testid="button-open-video">
                  <Video className="w-4 h-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => fileInputRef.current?.click()} data-testid="button-attach-file">
                  <Paperclip className="w-4 h-4" />
                </Button>
                <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileAttach} />
              </div>
              <Input
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                placeholder={`Message ${selectedUser.fullName}...`}
                className="flex-1 text-sm"
                data-testid="input-message"
              />
              <Button type="submit" size="icon" className="h-9 w-9 shrink-0" disabled={!newMessage.trim() && !pendingMedia} data-testid="button-send">
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
          <MessageSquare className="w-12 h-12 opacity-20" />
          <p className="text-sm">Select a staff member to start chatting</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="h-[calc(100dvh-5rem)] md:h-[calc(100vh-8rem)] flex border border-border rounded-xl overflow-hidden bg-card shadow-sm">
      {/* Sidebar — always visible on desktop, conditional on mobile */}
      <div className={`w-full md:w-72 border-r border-border bg-sidebar shrink-0 ${
        mobileView === "sidebar" ? "flex flex-col" : "hidden md:flex md:flex-col"
      }`}>
        {sidebarContent}
      </div>

      {/* Chat area — always visible on desktop, conditional on mobile */}
      <div className={`flex-1 bg-background min-w-0 ${
        mobileView === "chat" ? "flex flex-col" : "hidden md:flex md:flex-col"
      }`}>
        {chatContent}
      </div>
    </div>
  );
}
