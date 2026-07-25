"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function LogoutButton() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleLogout() {
    if (isSigningOut) return;

    setIsSigningOut(true);
    const result = await authClient.signOut();

    if (result.error) {
      toast.error(result.error.message ?? "Unable to log out.");
      setIsSigningOut(false);
      return;
    }

    router.replace("/auth/sign-in");
    router.refresh();
  }

  return (
    <Button
      className="h-8 rounded-full"
      disabled={isSigningOut}
      onClick={() => void handleLogout()}
      size="sm"
      variant="outline"
    >
      <LogOut className="size-4" />
      {isSigningOut ? "Logging out..." : "Logout"}
    </Button>
  );
}
