import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { collection, query, getDocs, where, onSnapshot, addDoc, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Search, Send, User } from "lucide-react";
import { Redirect } from "wouter";

export default function Chat() {
  const { userProfile, currentUser } = useAuth();
  const [staff, setStaff] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const allowedRoles = ["Principal", "Teacher", "Librarian"];
  const canAccess = userProfile && allowedRoles.includes(userProfile.role);

  useEffect(() => {
    if (!canAccess) return;

    const fetchStaff = async () => {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("role", "in", allowedRoles));
      const snapshot = await getDocs(q);
      const staffList: any[] = [];
      snapshot.forEach(doc => {
        if (doc.id !== currentUser?.uid) {
          staffList.push({ id: doc.id, ...doc.data() });
        }
      });
      setStaff(staffList);
    };

    fetchStaff();
  }, [canAccess, currentUser]);

  useEffect(() => {
    if (!selectedUser || !currentUser) return;

    const conversationId = [currentUser.uid, selectedUser.id].sort().join('_');
    const messagesRef = collection(db, `messages/${conversationId}/thread`);
    const q = query(messagesRef, orderBy("timestamp", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: any[] = [];
      snapshot.forEach(doc => {
        msgs.push({ id: doc.id, ...doc.data() });
      });
      setMessages(msgs);
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
    });

    return () => unsubscribe();
  }, [selectedUser, currentUser]);

  if (userProfile && !canAccess) {
    return <Redirect to="/dashboard" />;
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser || !currentUser || !userProfile) return;

    const conversationId = [currentUser.uid, selectedUser.id].sort().join('_');
    const messagesRef = collection(db, `messages/${conversationId}/thread`);
    
    await addDoc(messagesRef, {
      senderId: currentUser.uid,
      senderName: userProfile.fullName,
      receiverId: selectedUser.id,
      text: newMessage.trim(),
      timestamp: Date.now()
    });

    setNewMessage("");
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex border rounded-xl overflow-hidden bg-card shadow-sm">
      {/* Sidebar */}
      <div className="w-80 border-r border-border flex flex-col bg-sidebar">
        <div className="p-4 border-b border-border bg-sidebar">
          <h2 className="font-bold text-lg mb-4 text-sidebar-foreground">Staff Directory</h2>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search staff..."
              className="pl-8 bg-background border-border"
            />
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {staff.map((user) => (
              <button
                key={user.id}
                onClick={() => setSelectedUser(user)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                  selectedUser?.id === user.id 
                    ? "bg-primary text-primary-foreground" 
                    : "hover:bg-sidebar-accent text-sidebar-foreground"
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <User className={`w-5 h-5 ${selectedUser?.id === user.id ? "text-primary-foreground" : "text-primary"}`} />
                </div>
                <div className="overflow-hidden">
                  <div className="font-medium truncate">{user.fullName}</div>
                  <div className={`text-xs truncate ${selectedUser?.id === user.id ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                    {user.role}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-background">
        {selectedUser ? (
          <>
            <div className="p-4 border-b border-border bg-card flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="font-bold text-foreground">{selectedUser.fullName}</div>
                <div className="text-xs text-muted-foreground">{selectedUser.role}</div>
              </div>
            </div>
            
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4"
            >
              {messages.map((msg) => {
                const isMe = msg.senderId === currentUser?.uid;
                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                    <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                      isMe 
                        ? "bg-primary text-primary-foreground rounded-br-none" 
                        : "bg-muted text-foreground rounded-bl-none border border-border"
                    }`}>
                      {msg.text}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1 px-1">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                );
              })}
              {messages.length === 0 && (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No messages yet. Start the conversation!
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border bg-card">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={`Message ${selectedUser.fullName}...`}
                  className="flex-1"
                />
                <Button type="submit" disabled={!newMessage.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground flex-col">
            <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
            <p>Select a staff member to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
}
