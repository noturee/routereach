/**
 * OutreachRoute Pro — Authentication Context
 *
 * Provides authentication state and actions to the entire app.
 * Stores the JWT token and user profile in localStorage for persistence across refreshes.
 *
 * Usage:
 *   const { user, login, logout, isAuthenticated, isAdmin } = useAuth();
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import apiClient from "../api/apiClient.js";

const AuthContext = createContext(null);

const ADMIN_ROLES = new Set([
  "master_admin",
  "national_admin",
  "regional_admin",
  "state_admin",
  "local_admin",
]);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Restore session from localStorage on initial load ─────────────────────
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedToken = localStorage.getItem("access_token");

    if (storedUser && storedToken) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem("user");
        localStorage.removeItem("access_token");
      }
    }
    setLoading(false);
  }, []);

  /**
   * Log in with email and password.
   * Stores the JWT token and user profile in localStorage.
   * Returns { success: true } or { success: false, error: string }.
   */
  const login = useCallback(async (email, password) => {
    try {
      const response = await apiClient.post("/auth/login", { email, password });
      const { access_token, refresh_token } = response.data;

      localStorage.setItem("access_token", access_token);
      if (refresh_token) localStorage.setItem("refresh_token", refresh_token);

      let userData = response.data?.user || null;
      if (!userData) {
        const meResponse = await apiClient.get("/auth/me", {
          headers: { Authorization: `Bearer ${access_token}` },
        });
        userData = meResponse.data?.user || null;
      }

      if (!userData) {
        throw new Error("Login succeeded but user profile could not be loaded.");
      }

      localStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);

      return { success: true, user: userData };
    } catch (error) {
      const message =
        error.response?.data?.error || "Login failed. Please try again.";
      return { success: false, error: message };
    }
  }, []);

  /**
   * Log out the current user.
   * Clears localStorage and resets state.
   */
  const logout = useCallback(async () => {
    try {
      await apiClient.post("/auth/logout");
    } catch {
      // Ignore logout errors — clear state regardless
    } finally {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user");
      setUser(null);
    }
  }, []);

  /**
   * Refresh the current user profile from the API.
   * Call this after updating user settings.
   */
  const refreshUser = useCallback(async () => {
    try {
      const response = await apiClient.get("/auth/me");
      const userData = response.data.user;
      localStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);
    } catch {
      // Token may have expired — will be handled by the interceptor
    }
  }, []);

  const isAuthenticated = !!user;
  const isAdmin = user ? ADMIN_ROLES.has(user.role) : false;
  const isMasterAdmin = user?.role === "master_admin";

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        refreshUser,
        isAuthenticated,
        isAdmin,
        isMasterAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access authentication context.
 * Must be used within an AuthProvider.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
