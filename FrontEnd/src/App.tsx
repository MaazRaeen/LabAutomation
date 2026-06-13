import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { supabase } from './lib/supabase'
import { useAuthStore } from './store/authStore'

// Pages & Components
import Landing from './pages/Landing'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import ProtectedRoute from './components/ProtectedRoute'
import PlaceholderView from './pages/PlaceholderView'

// Student Portal Pages
import StudentDashboard from './pages/student/Dashboard'
import StudentExperiments from './pages/student/Experiments'
import StudentSubmitCode from './pages/student/SubmitCode'
import StudentLabRecords from './pages/student/LabRecords'
import StudentResubmissionRequest from './pages/student/ResubmissionRequest'
import StudentProgress from './pages/student/Progress'

// Teacher Portal Pages
import TeacherDashboard from './pages/teacher/Dashboard'
import TeacherExperiments from './pages/teacher/Experiments'
import TeacherSubmissions from './pages/teacher/Submissions'
import TeacherLabVerification from './pages/teacher/LabVerification'
import TeacherResubmissions from './pages/teacher/Resubmissions'

// Admin Portal Pages
import AdminDashboard from './pages/admin/Dashboard'
import AdminUserManagement from './pages/admin/UserManagement'
import AdminMarksRevision from './pages/admin/MarksRevision'

// Layouts
import StudentLayout from './layouts/StudentLayout'
import TeacherLayout from './layouts/TeacherLayout'
import AdminLayout from './layouts/AdminLayout'

function App() {
  const { setUser, setRole, setSession, logout } = useAuthStore()

  useEffect(() => {
    // Check active session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session)
        setUser(session.user)
        
        supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()
          .then(({ data: profile }) => {
            if (profile) setRole(profile.role)
          })
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        setSession(session)
        setUser(session.user)
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()
        if (profile) setRole(profile.role)
      } else {
        logout()
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [setUser, setRole, setSession, logout])

  return (
    <BrowserRouter>
      {/* Toast notifications */}
      <Toaster 
        position="top-right" 
        toastOptions={{
          className: 'bg-slate-800 text-white border border-slate-700',
          duration: 4000,
        }} 
      />

      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Student Routes */}
        <Route path="/student" element={<ProtectedRoute roles={['student']} />}>
          <Route element={<StudentLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<StudentDashboard />} />
            <Route path="experiments" element={<StudentExperiments />} />
            <Route path="submit" element={<StudentSubmitCode />} />
            <Route path="records" element={<StudentLabRecords />} />
            <Route path="resubmissions" element={<StudentResubmissionRequest />} />
            <Route path="progress" element={<StudentProgress />} />
            <Route path="notifications" element={<PlaceholderView title="Notifications" />} />
          </Route>
        </Route>

        {/* Teacher Routes */}
        <Route path="/teacher" element={<ProtectedRoute roles={['teacher']} />}>
          <Route element={<TeacherLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<TeacherDashboard />} />
            <Route path="experiments" element={<TeacherExperiments />} />
            <Route path="submissions" element={<TeacherSubmissions />} />
            <Route path="verification" element={<TeacherLabVerification />} />
            <Route path="evaluations" element={<PlaceholderView title="Evaluations" />} />
            <Route path="resubmissions" element={<TeacherResubmissions />} />
            <Route path="revisions" element={<PlaceholderView title="Marks Revision" />} />
          </Route>
        </Route>

        {/* Admin Routes */}
        <Route path="/admin" element={<ProtectedRoute roles={['admin']} />}>
          <Route element={<AdminLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="users" element={<AdminUserManagement />} />
            <Route path="revisions" element={<AdminMarksRevision />} />
            <Route path="submissions" element={<PlaceholderView title="All Submissions" />} />
            <Route path="audit-logs" element={<PlaceholderView title="Audit Logs" />} />
            <Route path="reports" element={<PlaceholderView title="Reports" />} />
          </Route>
        </Route>

        {/* Wildcard Fallbacks */}
        <Route path="/" element={<Landing />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
