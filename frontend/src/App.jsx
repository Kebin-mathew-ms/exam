import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import { ProtectedRoute, DashboardRedirect } from './routes/RouteGuards'
import DashboardLayout from './layouts/DashboardLayout'
import AdminLayout from './layouts/AdminLayout'

// Student Portal / Common views
import Login from './pages/Login'
import Profile from './pages/Profile'
import Unauthorized from './pages/Unauthorized'
import NotFound from './pages/NotFound'

// Student Portal specific views (Prompt 4 + Prompt 5 + Prompt 6)
import StudentDashboard from './pages/StudentDashboard'
import MyExams from './pages/MyExams'
import ExamInstructions from './pages/ExamInstructions'
import ExamScreen from './pages/ExamScreen'
import ResultDetails from './pages/ResultDetails'
import CertificateCenter from './pages/CertificateCenter'

// Public Verification Page (Prompt 6)
import CertificateVerification from './pages/CertificateVerification'

// Admin Portal specific views (Prompt 2 + Prompt 6)
import AdminDashboard from './pages/AdminDashboard'
import StudentList from './pages/StudentList'
import StudentDetails from './pages/StudentDetails'
import StudentForm from './pages/StudentForm'
import AdminList from './pages/AdminList'
import AdminForm from './pages/AdminForm'
import AdminProfile from './pages/AdminProfile'
import PortalSettings from './pages/PortalSettings'
import AnalyticsDashboard from './pages/AnalyticsDashboard'

// Exam Management Portal specific views (Prompt 3 + Prompt 6)
import Subjects from './pages/Subjects'
import QuestionBank from './pages/QuestionBank'
import QuestionForm from './pages/QuestionForm'
import ExamList from './pages/ExamList'
import ExamForm from './pages/ExamForm'
import AssignStudents from './pages/AssignStudents'
import EvaluationQueue from './pages/EvaluationQueue'
import ManualEvaluation from './pages/ManualEvaluation'

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public routing */}
              <Route path="/login" element={<Login />} />
              <Route path="/dashboard" element={<DashboardRedirect />} />
              <Route path="/unauthorized" element={<Unauthorized />} />
              <Route path="/verify-certificate" element={<CertificateVerification />} />

              {/* 1. STUDENT PORTAL Layout & Routing */}
              <Route
                path="/student"
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                {/* Redirect base `/student` to dashboard */}
                <Route index element={<Navigate to="/student/dashboard" replace />} />
                <Route path="dashboard" element={<StudentDashboard />} />
                <Route path="profile" element={<Profile />} />
                
                {/* My Exams list and results reviews */}
                <Route path="exams" element={<MyExams />} />
                <Route path="exams/:id/instructions" element={<ExamInstructions />} />
                <Route path="results/:id" element={<ResultDetails />} />

                {/* Certificates Portfolio */}
                <Route path="certificates" element={<CertificateCenter />} />
                {/* Analytics */}
                <Route path="analytics" element={<AnalyticsDashboard />} />
              </Route>

              {/* Focused proctoring Exam Taking panel (No Dashboard sidebars) */}
              <Route
                path="/student/exams/:id/take"
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <ExamScreen />
                  </ProtectedRoute>
                }
              />

              {/* Default root path redirects dynamically based on user role */}
              <Route path="/" element={<DashboardRedirect />} />

              {/* 2. ADMIN PORTAL Layout & Routing */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                {/* Redirect `/admin` directly to dashboard */}
                <Route index element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="dashboard" element={<AdminDashboard />} />
                
                {/* Students Management */}
                <Route path="students" element={<StudentList />} />
                <Route path="students/new" element={<StudentForm />} />
                <Route path="students/:id" element={<StudentDetails />} />
                <Route path="students/:id/edit" element={<StudentForm />} />

                {/* Administrators Management */}
                <Route path="admins" element={<AdminList />} />
                <Route path="admins/new" element={<AdminForm />} />
                <Route path="admins/:id/edit" element={<AdminForm />} />

                {/* Syllabus, Lookups, & Subject Master */}
                <Route path="subjects" element={<Subjects />} />

                {/* Question Bank Management */}
                <Route path="questions" element={<QuestionBank />} />
                <Route path="questions/new" element={<QuestionForm />} />
                <Route path="questions/:id/edit" element={<QuestionForm />} />

                {/* Exam Configuration Management */}
                <Route path="exams" element={<ExamList />} />
                <Route path="exams/new" element={<ExamForm />} />
                <Route path="exams/:id/edit" element={<ExamForm />} />
                <Route path="exams/:id/assign" element={<AssignStudents />} />

                {/* Manual Grading Workspace */}
                <Route path="evaluation" element={<EvaluationQueue />} />
                <Route path="evaluation/:id" element={<ManualEvaluation />} />

                {/* Analytics and Reporting Center */}
                <Route path="analytics" element={<AnalyticsDashboard />} />

                {/* Self Profile and Settings */}
                <Route path="profile" element={<AdminProfile />} />
                <Route path="settings" element={<PortalSettings />} />
              </Route>

              {/* Catch-all 404 Route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}

export default App
