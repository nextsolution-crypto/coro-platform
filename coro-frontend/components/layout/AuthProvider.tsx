"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth.store";

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { initAuth, isInitialized } = useAuthStore();

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  if (!isInitialized) {
    return <div className="min-h-screen bg-white" aria-busy="true" />;
  }

  return <>{children}</>;
}
