"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInAnonymously,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import Cookies from "js-cookie";
import { getDataFromDatabase } from "@/utils/firebase/utils.firebase";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signInAsGuest: () => Promise<void>;
  signOut: () => Promise<void>;
  hasCompletedOnboarding: () => Promise<boolean>;
  setOnboardingComplete: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const checkAndSetOnboardingStatus = async (
    currentUser: User
  ): Promise<void> => {
    if (!currentUser) {
      return;
    }

    try {
      const hasData = await getDataFromDatabase(
        `users/${currentUser.uid}/bookmarks`
      );

      // Check if bookmarks exist and have data
      const hasBookmarks =
        hasData !== null &&
        (Array.isArray(hasData)
          ? hasData.length > 0
          : Object.keys(hasData).length > 0);

      if (hasBookmarks) {
        Cookies.set("onboardingComplete", "true", { expires: 365, path: "/" }); // Valid for a year
        console.log("Onboarding cookie set - user has bookmarks");
      } else {
        Cookies.remove("onboardingComplete", { path: "/" });
        console.log("Onboarding cookie removed - no bookmarks found");
      }
    } catch (error) {
      console.error("Error checking onboarding status:", error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        const token = await currentUser.getIdToken();
        Cookies.set("authToken", token, { expires: 7, path: "/" }); // Expires in 7 days

        // Check and set onboarding status when auth state changes
        await checkAndSetOnboardingStatus(currentUser);
      } else {
        Cookies.remove("authToken", { path: "/" });
        Cookies.remove("onboardingComplete", { path: "/" });
      }

      setLoading(false);
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signInWithGoogle = async () => {
    try {
      console.log("[Auth] Starting Google sign-in...");
      const result = await signInWithPopup(auth, googleProvider);
      console.log(
        "[Auth] Google sign-in popup completed, checking onboarding status..."
      );
      await checkAndSetOnboardingStatus(result.user);
      console.log("[Auth] Onboarding status check complete");
      console.log("[Auth] Cookie value:", Cookies.get("onboardingComplete"));
    } catch (error) {
      console.error("Error signing in with Google", error);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      await checkAndSetOnboardingStatus(result.user);
    } catch (error) {
      console.error("Error signing in with email", error);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    try {
      const result = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      await checkAndSetOnboardingStatus(result.user);
    } catch (error) {
      console.error("Error signing up with email", error);
      throw error;
    }
  };

  const signInAsGuest = async () => {
    try {
      const result = await signInAnonymously(auth);
      await checkAndSetOnboardingStatus(result.user);
    } catch (error) {
      console.error("Error signing in as guest", error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      Cookies.remove("onboardingComplete", { path: "/" });
    } catch (error) {
      console.error("Error signing out", error);
      throw error;
    }
  };

  const hasCompletedOnboarding = async (): Promise<boolean> => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return false;
    }

    try {
      const hasData = await getDataFromDatabase(
        `users/${currentUser.uid}/bookmarks`
      );

      // Check if bookmarks exist and have data
      const hasBookmarks =
        hasData !== null &&
        (Array.isArray(hasData)
          ? hasData.length > 0
          : Object.keys(hasData).length > 0);

      if (hasBookmarks) {
        Cookies.set("onboardingComplete", "true", { expires: 365, path: "/" }); // Valid for a year
        return true;
      } else {
        Cookies.remove("onboardingComplete", { path: "/" });
        return false;
      }
    } catch (error) {
      console.error("Error checking onboarding status:", error);
      return Cookies.get("onboardingComplete") === "true";
    }
  };

  const setOnboardingComplete = (): void => {
    Cookies.set("onboardingComplete", "true", { expires: 365, path: "/" }); // Valid for a year
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signInAsGuest,
        signOut,
        hasCompletedOnboarding,
        setOnboardingComplete,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
