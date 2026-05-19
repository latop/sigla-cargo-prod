import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export type OperationalProfile = "portaria" | "execucao" | "gestao" | "admin";

const STORAGE_KEY = "operational_profile";

interface ProfileContextValue {
  profile: OperationalProfile | null;
  setProfile: (p: OperationalProfile) => void;
  clearProfile: () => void;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfileState] = useState<OperationalProfile | null>(() => {
    const v = localStorage.getItem(STORAGE_KEY);
    return (v as OperationalProfile) || null;
  });

  const setProfile = useCallback((p: OperationalProfile) => {
    localStorage.setItem(STORAGE_KEY, p);
    setProfileState(p);
  }, []);

  const clearProfile = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setProfileState(null);
  }, []);

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setProfileState((e.newValue as OperationalProfile) || null);
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  return (
    <ProfileContext.Provider value={{ profile, setProfile, clearProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within ProfileProvider");
  return ctx;
}

// ─── Access rules (UI guidance only, NOT security) ──────────────
// Paths allowed for restricted profiles. `null` = full access.

const REGISTER_GROUP_KEY = "sidebar.register";

const PROFILE_ALLOWED_PATHS: Record<OperationalProfile, Set<string> | null> = {
  portaria: new Set(["/home", "/release-driver", "/departures-and-arrivals"]),
  execucao: new Set([
    "/home",
    "/release-driver",
    "/departures-and-arrivals",
    "/daily-trip",
    "/drivers-schedule",
    "/daily-trips-schedule",
    "/reports",
  ]),
  gestao: null,
  admin: null,
};

// Groups whose entire item list is allowed for the profile, regardless of individual URLs.
const PROFILE_ALLOWED_FULL_GROUPS: Record<OperationalProfile, Set<string>> = {
  portaria: new Set(),
  execucao: new Set([REGISTER_GROUP_KEY]),
  gestao: new Set(),
  admin: new Set(),
};

export function isPathAllowedForProfile(profile: OperationalProfile | null, path: string): boolean {
  if (!profile) return true;
  const allowed = PROFILE_ALLOWED_PATHS[profile];
  if (allowed === null) return true;
  return allowed.has(path);
}

export function isGroupFullyAllowedForProfile(profile: OperationalProfile | null, groupKey: string): boolean {
  if (!profile) return false;
  return PROFILE_ALLOWED_FULL_GROUPS[profile].has(groupKey);
}

export function isProfileUnrestricted(profile: OperationalProfile | null): boolean {
  if (!profile) return true;
  return PROFILE_ALLOWED_PATHS[profile] === null;
}
