import { createContext, useContext, useState, useEffect, useMemo, useRef } from "react";

export interface UserProfile {
  id: string;
  username: string;
  uuid: string;
}

interface UserContextType {
  ready: boolean;
  profiles: UserProfile[];
  currentProfile: UserProfile | null;
  selectProfile: (profileId: string | null) => void;
  addProfile: (username: string, uuid?: string) => void;
  removeProfile: (profileId: string) => void;
  updateProfile: (profileId: string, updates: Partial<UserProfile>) => void;
}

export const UserContext = createContext<UserContextType | null>(null);

export const UserContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [ready, setReady] = useState(false);

  
  const getStored = (key: string) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  };

  
  const [profiles, setProfiles] = useState<UserProfile[]>(() => {
    const stored = getStored("profiles");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return [];
      }
    }
    return [];
  });

  const [currentProfileId, setCurrentProfileId] = useState<string | null>(() => {
    return getStored("currentProfileId");
  });

  const initialized = useRef(false);

  useEffect(() => {
    
    const oldUsername = localStorage.getItem("username");
    const storedProfiles = localStorage.getItem("profiles");

    if (oldUsername && !storedProfiles) {
      const initialProfile: UserProfile = {
        id: crypto.randomUUID(),
        username: oldUsername,
        uuid: "",
      };
      setProfiles([initialProfile]);
      setCurrentProfileId(initialProfile.id);
      localStorage.removeItem("username");
    }

    const timeout = setTimeout(() => {
      setReady(true);
      initialized.current = true;
    }, 2000);

    return () => clearTimeout(timeout);
  }, []);

  
  useEffect(() => {
    localStorage.setItem("profiles", JSON.stringify(profiles));
  }, [profiles]);

  
  useEffect(() => {
    if (currentProfileId) {
      localStorage.setItem("currentProfileId", currentProfileId);
    } else {
      localStorage.removeItem("currentProfileId");
    }
  }, [currentProfileId]);

  const currentProfile = useMemo(() => {
    return profiles.find((p) => p.id === currentProfileId) || null;
  }, [profiles, currentProfileId]);

  const addProfile = (username: string, uuid: string = "") => {
    const newProfile: UserProfile = {
      id: crypto.randomUUID(),
      username,
      uuid,
    };
    setProfiles((prev) => [...prev, newProfile]);
    setCurrentProfileId(newProfile.id);
  };

  const removeProfile = (id: string) => {
    setProfiles((prev) => prev.filter((p) => p.id !== id));
    if (currentProfileId === id) {
      setCurrentProfileId(null);
    }
  };

  const selectProfile = (id: string | null) => {
    setCurrentProfileId(id);
  };

  const updateProfile = (id: string, updates: Partial<UserProfile>) => {
    setProfiles((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  };

  return (
    <UserContext.Provider
      value={{
        ready,
        profiles,
        currentProfile,
        selectProfile,
        addProfile,
        removeProfile,
        updateProfile,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUserContext = () => {
  const context = useContext(UserContext);
  if (!context)
    throw new Error("useUserContext must be used within a UserContextProvider");
  return context;
};
