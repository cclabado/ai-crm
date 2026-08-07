import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { LoaderCircle } from 'lucide-react'
import ProtectedRoute from './app/ProtectedRoute'
import AppLayout from './components/layout/AppLayout'

const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const LeadsPage = lazy(() => import('./pages/LeadsPage'))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'))
const AcceptInvitationPage = lazy(() => import('./pages/AcceptInvitationPage'))
const TeamPage = lazy(() => import('./pages/TeamPage'))
const PipelinePage = lazy(() => import('./pages/PipelinePage'))
const OperationalModulePage = lazy(() => import('./pages/OperationalModulePage'))
const ReportsPage = lazy(() => import('./pages/ReportsPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const ActivitiesPage = lazy(() => import('./pages/ActivitiesPage'))
const EmailPage = lazy(() => import('./pages/EmailPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const CalendarPage = lazy(() => import('./pages/CalendarPage'))
const RecordDetailPage = lazy(() => import('./pages/RecordDetailPage'))
const OpportunitiesPage = lazy(() => import('./pages/OpportunitiesPage'))

export default function App() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <LoaderCircle className="h-7 w-7 animate-spin text-blue-600" />
        </div>
      }
    >
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        <Route path="/accept-invitation/:token" element={<AcceptInvitationPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="leads">
              <Route index element={<LeadsPage />} />
              <Route path=":recordId" element={<RecordDetailPage module="leads" />} />
            </Route>
            <Route path="pipeline">
              <Route index element={<PipelinePage />} />
              <Route path="deal/:recordId" element={<RecordDetailPage module="deals" />} />
            </Route>
            <Route path="team/*" element={<TeamPage />} />
            <Route path="companies">
              <Route index element={<OperationalModulePage module="companies" />} />
              <Route path=":recordId" element={<RecordDetailPage module="companies" />} />
            </Route>
            <Route path="contacts">
              <Route index element={<OperationalModulePage module="contacts" />} />
              <Route path=":recordId" element={<RecordDetailPage module="contacts" />} />
            </Route>
            <Route path="tasks/*" element={<OperationalModulePage module="tasks" />} />
            <Route path="calendar/*" element={<CalendarPage />} />
            <Route path="products/*" element={<OperationalModulePage module="products" />} />
            <Route path="quotations/*" element={<OperationalModulePage module="quotations" />} />
            <Route path="invoices/*" element={<OperationalModulePage module="invoices" />} />
            <Route path="support/*" element={<OperationalModulePage module="tickets" />} />
            <Route path="documents/*" element={<OperationalModulePage module="documents" />} />
            <Route path="reports/*" element={<ReportsPage />} />
            <Route path="settings/*" element={<SettingsPage />} />
            <Route path="activities/*" element={<ActivitiesPage />} />
            <Route path="email/*" element={<EmailPage />} />
            <Route path="profile/*" element={<ProfilePage />} />
            <Route path="deals" element={<OpportunitiesPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  )
}
