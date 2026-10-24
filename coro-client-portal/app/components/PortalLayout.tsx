"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { apiGet, getToken, getUser, setAuth, clearAuth } from "../store/auth";
import { useToast } from "../store/useToast";
import ToastContainer from "./ToastContainer";
import { useTheme } from "../../design-system/theme/ThemeProvider";
import {
  LayoutDashboard,
  FileText,
  Calendar,
  LogOut,
  Menu,
  X,
  User,
  Building2,
  Bell,
  Map,
  Shield,
  Network,
  HardDriveDownload,
  BookOpenCheck,
} from "lucide-react";
import workspace from "./PortalWorkspace.module.css";
import { resolveActivePortalNavigationPath } from "./active-navigation";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  // Glass (préproduction) : la barre devient du verre dense ; en Classique, aucune classe n'est ajoutée (rendu inchangé).
  const { ui } = useTheme();

  const [user, setUser] = useState<any>(null);
  const [sessionError, setSessionError] = useState(false);
  const [sessionAttempt, setSessionAttempt] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [networkEnabled, setNetworkEnabled] = useState(false);
  const [offlineVaultMode, setOfflineVaultMode] = useState(false);
  const { toasts, showToast, removeToast } = useToast();

  useEffect(() => {
    const handler = (e: Event) => {
      const { message, type } = (e as CustomEvent).detail;
      showToast(message, type);
    };
    window.addEventListener("portal:toast", handler);
    return () => window.removeEventListener("portal:toast", handler);
  }, [showToast]);

  useEffect(() => {
    const fetchNotifCount = async () => {
      try {
        const { apiGet } = await import("../store/auth");
        const res = await apiGet("/client-portal/notifications");
        setNotifCount(
          (res || []).filter((n: any) => n.priority === "HIGH").length,
        );
      } catch {
        /* silencieux */
      }
    };
    fetchNotifCount();
  }, [pathname]);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    let active = true;
    setSessionError(false);
    void Promise.all([
      apiGet("/client-auth/me"),
      apiGet("/client-portal/network/access").catch(() => ({ enabled: false })),
    ])
      .then(([freshUser, networkAccess]) => {
        if (!active) return;
        if (getToken() !== token) return;
        setAuth(token, freshUser);
        setUser(freshUser);
        setNetworkEnabled(networkAccess?.enabled === true);
        setOfflineVaultMode(false);
      })
      .catch(() => {
        if (!active || !getToken()) return;
        const cachedUser = getUser();
        if (pathname === "/offline-documents" && cachedUser) {
          setUser(cachedUser);
          setNetworkEnabled(false);
          setOfflineVaultMode(true);
          return;
        }
        setSessionError(true);
      });
    return () => {
      active = false;
    };
  }, [pathname, router, sessionAttempt]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    const { revokeOfflineDeviceAndPurge } =
      await import("../offline-documents/offline-vault");
    try {
      await revokeOfflineDeviceAndPurge();
    } finally {
      clearAuth();
      router.replace("/login");
    }
  };

  const onlineNavItems = [
    { label: "Tableau de bord", path: "/dashboard", icon: LayoutDashboard },
    { label: "Bâtiments", path: "/buildings", icon: Building2 },
    { label: "Conformité", path: "/documents", icon: FileText },
    { label: "CORO AI", path: "/knowledge", icon: BookOpenCheck },
    { label: "Manuel d’utilisation", path: "/manual", icon: BookOpenCheck },
    { label: "Carte", path: "/map", icon: Map },
    { label: "Activités", path: "/activities", icon: Calendar },
    { label: "Intelligence", path: "/intelligence", icon: Shield },
    ...(networkEnabled
      ? [{ label: "CORO Network", path: "/network", icon: Network }]
      : []),
    {
      label: "Hors ligne",
      path: "/offline-documents",
      icon: HardDriveDownload,
    },
    { label: "Notifications", path: "/notifications", icon: Bell, badge: 0 },
    { label: "Mon profil", path: "/profile", icon: User },
  ];
  const navItems = offlineVaultMode
    ? onlineNavItems.filter((item) => item.path === "/offline-documents")
    : onlineNavItems;

  // On injecte le vrai compte de notifs
  const navItemsWithBadge = navItems.map((item) =>
    item.path === "/notifications" ? { ...item, badge: notifCount } : item,
  );

  const activeNavigationPath = resolveActivePortalNavigationPath(
    pathname,
    navItemsWithBadge,
  );
  const isActive = (path: string) => path === activeNavigationPath;

  if (sessionError) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#F8F9FA",
          padding: 24,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 14, color: "#495057" }}>
            Impossible de vérifier vos accès actuels.
          </p>
          <button
            type="button"
            onClick={() => {
              setUser(null);
              setSessionError(false);
              setSessionAttempt((value) => value + 1);
            }}
            style={{
              border: "1px solid #CED4DA",
              borderRadius: 4,
              backgroundColor: "#FFFFFF",
              padding: "8px 12px",
              cursor: "pointer",
            }}
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#F8F9FA",
          padding: 24,
        }}
      >
        <p style={{ margin: 0, fontSize: 14, color: "#ADB5BD" }}>
          Chargement...
        </p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F8F9FA" }}>
      {/* ── Topbar ── */}
      <header
        className={ui === "glass" ? "cg-chrome" : undefined}
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          backgroundColor: "#FFFFFF",
          borderBottom: "1px solid #E9ECEF",
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        }}
      >
        <div
          style={{
            maxWidth: "none",
            margin: "0 auto",
            padding: "0 clamp(16px, 3vw, 32px)" /* ← padding adaptatif */,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            minHeight: 64,
            gap: 8,
          }}
        >
          {/* Logo */}
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            aria-label="Retour au tableau de bord"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              minWidth: 0,
              border: "none",
              backgroundColor: "transparent",
              cursor: "pointer",
              minHeight: 44,
              padding: "4px 0",
              textAlign: "left",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontSize: 24,
                fontWeight: 900,
                color: "#2C3E50",
                letterSpacing: "-1px",
              }}
            >
              CO<span style={{ color: "#C0392B" }}>RO</span>
            </span>
            <span
              className="hidden sm:inline"
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "#6C757D",
                backgroundColor: "#F8F9FA",
                border: "1px solid #E9ECEF",
                padding: "3px 8px",
                borderRadius: 4,
                whiteSpace: "nowrap",
              }}
            >
              Portail Client
            </span>
          </button>

          {/* ── Navigation desktop — icônes seules sur md, texte sur xl ── */}
          <nav
            className={`hidden md:flex ${workspace.navigation}`}
            style={{
              alignItems: "center",
              gap: 2,
              flex: 1,
              justifyContent: "center",
            }}
            aria-label="Navigation principale"
          >
            {navItemsWithBadge.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <button
                  key={item.path}
                  type="button"
                  aria-current={active ? "page" : undefined}
                  onClick={() => router.push(item.path)}
                  title={item.label} /* tooltip sur icône seule */
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    minHeight: 44,
                    minWidth: 44,
                    /* padding compact sur md, plus aéré sur xl via JS inline n/a → on garde 8px */
                    padding: "8px 10px",
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 500,
                    border: "none",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    backgroundColor: active ? "#FDEDEC" : "transparent",
                    color: active ? "#C0392B" : "#6C757D",
                    whiteSpace: "nowrap",
                    position: "relative",
                  }}
                  onMouseEnter={(e) => {
                    if (!active)
                      e.currentTarget.style.backgroundColor = "#F8F9FA";
                  }}
                  onMouseLeave={(e) => {
                    if (!active)
                      e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <Icon size={17} />
                  {/* Texte visible seulement à partir de xl (1280px) */}
                  <span className={workspace.navigationLabel}>{item.label}</span>

                  {/* Badge notification */}
                  {(item as any).badge > 0 && (
                    <span
                      style={{
                        position: "absolute",
                        top: 4,
                        right: 4,
                        width: 16,
                        height: 16,
                        borderRadius: "50%",
                        backgroundColor: "#C0392B",
                        color: "#FFFFFF",
                        fontSize: 10,
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {(item as any).badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* ── Actions droite ── */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexShrink: 0,
            }}
          >
            {/* Nom + org (visible à partir de lg) */}
            <div
              className="hidden 2xl:block"
              style={{ textAlign: "right", minWidth: 0 }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#2C3E50",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: 180,
                }}
              >
                {user.firstName} {user.lastName}
              </p>
              <p
                style={{
                  margin: "2px 0 0",
                  fontSize: 11,
                  color: "#ADB5BD",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: 180,
                }}
              >
                {user.clientName}
              </p>
            </div>

            {/* Avatar */}
            <div
              title={`${user.firstName || ""} ${user.lastName || ""}`.trim()}
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                backgroundColor: "#C0392B",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#FFFFFF",
                fontSize: 13,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {user.firstName?.[0]}
              {user.lastName?.[0]}
            </div>

            {/* Déconnexion (desktop) */}
            <button
              type="button"
              onClick={handleLogout}
              className="hidden md:flex"
              title="Déconnexion"
              style={{
                alignItems: "center",
                gap: 6,
                minHeight: 44,
                minWidth: 44,
                padding: "8px 12px",
                borderRadius: 6,
                border: "1px solid #E9ECEF",
                backgroundColor: "transparent",
                color: "#6C757D",
                fontSize: 13,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#FDEDEC";
                e.currentTarget.style.color = "#C0392B";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "#6C757D";
              }}
            >
              <LogOut size={14} />
              {/* Texte "Déconnexion" visible à partir de xl seulement */}
              <span className="hidden 2xl:inline">Déconnexion</span>
            </button>

            {/* Hamburger (mobile) */}
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="md:hidden"
              aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
              aria-expanded={menuOpen}
              style={{
                width: 44,
                height: 44,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#2C3E50",
                borderRadius: 8,
                flexShrink: 0,
              }}
            >
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* ── Menu mobile (drawer) ── */}
        {menuOpen && (
          <div
            className="md:hidden"
            style={{
              borderTop: "1px solid #E9ECEF",
              backgroundColor: "#FFFFFF",
              padding: "8px 0 12px",
              boxShadow: "0 8px 20px rgba(0,0,0,0.06)",
            }}
          >
            {/* Identité */}
            <div
              style={{
                padding: "12px 20px",
                borderBottom: "1px solid #F1F3F5",
                marginBottom: 4,
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#2C3E50",
                }}
              >
                {user.firstName} {user.lastName}
              </p>
              <p style={{ margin: "3px 0 0", fontSize: 12, color: "#ADB5BD" }}>
                {user.clientName}
              </p>
            </div>

            {/* Items */}
            {navItemsWithBadge.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <button
                  key={item.path}
                  type="button"
                  aria-current={active ? "page" : undefined}
                  onClick={() => {
                    router.push(item.path);
                    setMenuOpen(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    width: "100%",
                    minHeight: 52,
                    padding: "14px 20px",
                    fontSize: 15,
                    fontWeight: 500,
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                    backgroundColor: active ? "#FDEDEC" : "transparent",
                    color: active ? "#C0392B" : "#495057",
                    position: "relative",
                  }}
                >
                  <Icon size={20} />
                  {item.label}
                  {(item as any).badge > 0 && (
                    <span
                      style={{
                        marginLeft: 8,
                        padding: "2px 7px",
                        borderRadius: 10,
                        backgroundColor: "#C0392B",
                        color: "#FFFFFF",
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      {(item as any).badge}
                    </span>
                  )}
                </button>
              );
            })}

            <div style={{ borderTop: "1px solid #E9ECEF", margin: "6px 0" }} />

            <button
              type="button"
              onClick={handleLogout}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                width: "100%",
                minHeight: 52,
                padding: "14px 20px",
                fontSize: 15,
                fontWeight: 500,
                border: "none",
                cursor: "pointer",
                color: "#C0392B",
                backgroundColor: "transparent",
                textAlign: "left",
              }}
            >
              <LogOut size={20} />
              Déconnexion
            </button>
          </div>
        )}
      </header>

      {/* ── Contenu principal ── */}
      <main
        className={workspace.workspace}
        style={{
          maxWidth: "none",
          margin: "0 auto",
          width: "100%",
          padding:
            "clamp(20px, 4vw, 40px) clamp(16px, 3vw, 32px)" /* ← adaptatif H et V */,
        }}
      >
        {children}
      </main>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
