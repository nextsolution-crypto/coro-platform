"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";
import { usePlatformAuthority } from "@/hooks/usePlatformAuthority";

const ORGANIZATION_ADMIN_ROUTES = ["/admin/capacity", "/admin/mandates"];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isInitialized } = useAuthStore();
  const platform = usePlatformAuthority(isAuthenticated);
  const organizationAdminRoute = ORGANIZATION_ADMIN_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
  const allowed = organizationAdminRoute
    ? user?.role === "ADMIN" || user?.role === "SUPER_ADMIN"
    : platform.hasAnyPlatformAccess;

  useEffect(() => {
    if (!isInitialized) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (platform.loading) return;
    if (!allowed) {
      router.replace("/dashboard");
    }
  }, [allowed, isAuthenticated, isInitialized, platform.loading, router]);

  if (!isInitialized || !allowed || platform.loading) {
    return <div className="min-h-screen bg-slate-50" aria-busy="true" />;
  }

  return children;
}
