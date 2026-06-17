/**
 * OutreachRoute Pro — Root Application Component
 *
 * Sets up React Router with all application routes.
 * Protected routes require authentication (JWT token in localStorage).
 * Role-based routes redirect users based on their assigned role.
 */

import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext.jsx";
import ProtectedRoute from "./auth/ProtectedRoute.jsx";

// Pages
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import MyNumbers from "./pages/MyNumbers.jsx";
import TeamPerformance from "./pages/TeamPerformance.jsx";
import Applicants from "./pages/Applicants.jsx";
import ApplicantProfile from "./pages/ApplicantProfile.jsx";
import UploadApplicants from "./pages/UploadApplicants.jsx";
import CaseNotes from "./pages/CaseNotes.jsx";
import OutreachMap from "./pages/OutreachMap.jsx";
import OutreachLocations from "./pages/OutreachLocations.jsx";
import LocationProfile from "./pages/LocationProfile.jsx";
import AddLocation from "./pages/AddLocation.jsx";
import RoutePlanner from "./pages/RoutePlanner.jsx";
import VisitLogs from "./pages/VisitLogs.jsx";
import MessagingCenter from "./pages/MessagingCenter.jsx";
import Meetings from "./pages/Meetings.jsx";
import Reports from "./pages/Reports.jsx";
import MonthlyReports from "./pages/MonthlyReports.jsx";
import UserManagement from "./pages/UserManagement.jsx";
import TerritoryManagement from "./pages/TerritoryManagement.jsx";
import Settings from "./pages/Settings.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* ── OA User Routes ─────────────────────────────────────────── */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-numbers"
            element={
              <ProtectedRoute>
                <MyNumbers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/applicants"
            element={
              <ProtectedRoute>
                <Applicants />
              </ProtectedRoute>
            }
          />
          <Route
            path="/applicants/:id"
            element={
              <ProtectedRoute>
                <ApplicantProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/upload-applicants"
            element={
              <ProtectedRoute>
                <UploadApplicants />
              </ProtectedRoute>
            }
          />
          <Route
            path="/case-notes"
            element={
              <ProtectedRoute>
                <CaseNotes />
              </ProtectedRoute>
            }
          />
          <Route
            path="/outreach-map"
            element={
              <ProtectedRoute>
                <OutreachMap />
              </ProtectedRoute>
            }
          />
          <Route
            path="/locations"
            element={
              <ProtectedRoute>
                <OutreachLocations />
              </ProtectedRoute>
            }
          />
          <Route
            path="/locations/:id"
            element={
              <ProtectedRoute>
                <LocationProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/locations/add"
            element={
              <ProtectedRoute>
                <AddLocation />
              </ProtectedRoute>
            }
          />
          <Route
            path="/route-planner"
            element={
              <ProtectedRoute>
                <RoutePlanner />
              </ProtectedRoute>
            }
          />
          <Route
            path="/visit-logs"
            element={
              <ProtectedRoute>
                <VisitLogs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/messaging"
            element={
              <ProtectedRoute>
                <MessagingCenter />
              </ProtectedRoute>
            }
          />
          <Route
            path="/meetings"
            element={
              <ProtectedRoute>
                <Meetings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <Reports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/monthly-reports"
            element={
              <ProtectedRoute>
                <MonthlyReports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />

          {/* ── Admin-Only Routes ──────────────────────────────────────── */}
          <Route
            path="/admin-dashboard"
            element={
              <ProtectedRoute adminOnly>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/team-performance"
            element={
              <ProtectedRoute adminOnly>
                <TeamPerformance />
              </ProtectedRoute>
            }
          />
          <Route
            path="/user-management"
            element={
              <ProtectedRoute adminOnly>
                <UserManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/territory-management"
            element={
              <ProtectedRoute adminOnly>
                <TerritoryManagement />
              </ProtectedRoute>
            }
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
