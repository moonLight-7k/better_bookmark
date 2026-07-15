"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { ref, get, onValue, update } from "firebase/database";
import { useAuth } from "@/context/AuthContext";
import { User } from "firebase/auth";

export type CustomUserData = {
  [key: string]:
    | string
    | number
    | boolean
    | null
    | CustomUserData
    | Array<string | number | boolean | null>;
};

export type UserDetails = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous: boolean;
  lastLoginAt?: string;
  createdAt?: string;
  customData?: Record<string, CustomUserData>;
};

export const useUserDetails = () => {
  const { user, loading: authLoading } = useAuth();
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const getBasicUserDetails = (user: User): UserDetails => {
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      isAnonymous: user.isAnonymous,
      lastLoginAt: user.metadata.lastSignInTime,
      createdAt: user.metadata.creationTime,
    };
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setUserDetails(null);
      setLoading(false);
      return;
    }

    try {
      const basicDetails = getBasicUserDetails(user);
      setUserDetails(basicDetails);

      const userRef = ref(db, `users/${user.uid}`);

      const unsubscribe = onValue(
        userRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const customData = snapshot.val();
            setUserDetails((prev) => ({
              ...prev!,
              customData,
            }));
          }
          setLoading(false);
        },
        (error) => {
          console.error("Error fetching user data:", error);
          setError(error);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error("Error in useUserDetails hook:", err);
      setError(err instanceof Error ? err : new Error(String(err)));
      setLoading(false);
    }
  }, [user, authLoading]);

  const refreshUserData = async () => {
    if (!user) return null;

    setLoading(true);
    try {
      const userRef = ref(db, `users/${user.uid}`);
      const snapshot = await get(userRef);

      const basicDetails = getBasicUserDetails(user);

      if (snapshot.exists()) {
        const customData = snapshot.val();
        setUserDetails({
          ...basicDetails,
          customData,
        });
      } else {
        setUserDetails(basicDetails);
      }

      setError(null);
    } catch (err) {
      console.error("Error refreshing user data:", err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  };

  const updateUserData = async (data: Record<string, CustomUserData>) => {
    if (!user) return;

    setLoading(true);
    try {
      const userRef = ref(db, `users/${user.uid}`);
      await update(userRef, data);

      setUserDetails((prev) =>
        prev
          ? {
              ...prev,
              customData: {
                ...prev.customData,
                ...data,
              },
            }
          : null
      );

      setError(null);
    } catch (err) {
      console.error("Error updating user data:", err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  };

  return {
    userDetails,
    loading,
    error,
    refreshUserData,
    updateUserData,
  };
};
