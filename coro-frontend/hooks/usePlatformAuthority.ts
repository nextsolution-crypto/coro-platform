"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";

export type PlatformAuthorityView = {
  authorityStatus: "UNCONFIGURED" | "DRAFT" | "ACTIVE";
  founder: boolean;
  grants: Array<{
    permission: string;
    scope: "ORGANIZATION" | "GLOBAL";
    targetOrganizationId: string | null;
  }>;
};

export function usePlatformAuthority(authenticated: boolean) {
  const [view, setView] = useState<PlatformAuthorityView | null>(null);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    let current = true;
    if (!authenticated) {
      return;
    }
    api
      .get<PlatformAuthorityView>("/admin/v1/platform-authority/me")
      .then(({ data }) => current && setView(data))
      .catch(() => current && setView(null))
      .finally(() => current && setSettled(true));
    return () => {
      current = false;
    };
  }, [authenticated]);

  const permissions = useMemo(
    () => new Set(view?.grants.map((grant) => grant.permission) ?? []),
    [view],
  );
  return {
    view,
    loading: authenticated && !settled,
    isFounder: view?.founder === true,
    has: (permission: string) =>
      view?.founder === true || permissions.has(permission),
    hasAnyPlatformAccess: view?.founder === true || permissions.size > 0,
  };
}
