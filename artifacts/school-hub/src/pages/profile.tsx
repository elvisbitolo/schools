import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { auth, db } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { User, LogOut } from "lucide-react";

export default function Profile() {
  const { userProfile, currentUser } = useAuth();
  const [fullName, setFullName] = useState(userProfile?.fullName || "");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!currentUser) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", currentUser.uid), {
        fullName
      });
      toast({
        title: "Profile updated",
        description: "Your changes have been saved successfully.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update profile. " + (error.message || ""),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  if (!userProfile) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <Button variant="outline" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={handleSignOut}>
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Update your personal details and how you appear to others.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary text-2xl font-bold">
              {fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-medium text-lg">{userProfile.fullName}</h3>
              <p className="text-muted-foreground">{userProfile.email}</p>
            </div>
          </div>

          <div className="grid gap-4 pt-4 border-t">
            <div className="grid gap-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input 
                id="fullName" 
                value={fullName} 
                onChange={(e) => setFullName(e.target.value)} 
                data-testid="input-edit-fullname"
              />
            </div>
            
            <div className="grid gap-2 opacity-60">
              <Label>Role</Label>
              <div className="flex items-center px-3 py-2 border rounded-md bg-muted">
                <User className="w-4 h-4 mr-2 text-muted-foreground" />
                <span className="text-sm font-medium">{userProfile.role}</span>
                <span className="ml-auto text-xs text-muted-foreground">(Cannot be changed)</span>
              </div>
            </div>
          </div>

          <Button 
            onClick={handleSave} 
            disabled={saving || fullName === userProfile.fullName || !fullName.trim()}
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
