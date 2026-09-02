import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
// Add page imports here
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import IdeaDetail from '@/pages/IdeaDetail';
import Agents from '@/pages/Agents';
import WarRoom from '@/pages/WarRoom';
import Ops from '@/pages/Ops';
import Intel from '@/pages/Intel';
import Council from '@/pages/Council';
import Shadow from '@/pages/Shadow';
import PaperTrade from '@/pages/PaperTrade';
import Queue from '@/pages/Queue';
import LiveChat from '@/pages/LiveChat';
import Playbook from '@/pages/Playbook';
import Codebase from '@/pages/Codebase';
import Build from '@/pages/Build';
import BuildPortal from '@/pages/BuildPortal';
import Onboarding from '@/pages/Onboarding';
import Simulation from '@/pages/Simulation';
import BuildApprovals from '@/pages/BuildApprovals';
import Marketer from '@/pages/Marketer';
import Audit from '@/pages/Audit';
import DestinyFlow from '@/pages/DestinyFlow';
import LifeLab from '@/pages/LifeLab';
import UserSimulator from '@/pages/UserSimulator';
import Gaps from '@/pages/Gaps';
import ForensicAudit from '@/pages/ForensicAudit';
import SystemAnalyst from '@/pages/SystemAnalyst';
import Factory from '@/pages/Factory';
import AutonomousBuilder from '@/pages/AutonomousBuilder';
import Capabilities from '@/pages/Capabilities';
import DNA from '@/pages/DNA';
import DnaAudit from '@/pages/DnaAudit';
import Performance from '@/pages/Performance';
import DnaActions from '@/pages/DnaActions';
import Rewards from '@/pages/Rewards';
import SiteMonitor from '@/pages/SiteMonitor';
import XtremeAI from '@/pages/XtremeAI';
import XtremeFactory from '@/pages/XtremeFactory';
import XtremePerfection from '@/pages/XtremePerfection';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/idea/:id" element={<IdeaDetail />} />
          <Route path="/agents" element={<Agents />} />
          <Route path="/chat" element={<WarRoom />} />
          <Route path="/ops" element={<Ops />} />
          <Route path="/intel" element={<Intel />} />
          <Route path="/council" element={<Council />} />
          <Route path="/shadow" element={<Shadow />} />
          <Route path="/paper" element={<PaperTrade />} />
          <Route path="/queue" element={<Queue />} />
          <Route path="/live" element={<LiveChat />} />
          <Route path="/playbook" element={<Playbook />} />
          <Route path="/codebase" element={<Codebase />} />
          <Route path="/build" element={<Build />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/simulation" element={<Simulation />} />
          <Route path="/approvals" element={<BuildApprovals />} />
          <Route path="/marketer" element={<Marketer />} />
          <Route path="/audit" element={<Audit />} />
          <Route path="/destiny" element={<DestinyFlow />} />
          <Route path="/lifelab" element={<LifeLab />} />
          <Route path="/usersim" element={<UserSimulator />} />
          <Route path="/gaps" element={<Gaps />} />
          <Route path="/forensic" element={<ForensicAudit />} />
          <Route path="/system-analyst" element={<SystemAnalyst />} />
          <Route path="/factory" element={<Factory />} />
          <Route path="/autonomous" element={<AutonomousBuilder />} />
          <Route path="/capabilities" element={<Capabilities />} />
          <Route path="/dna" element={<DNA />} />
          <Route path="/dna-audit" element={<DnaAudit />} />
          <Route path="/performance" element={<Performance />} />
          <Route path="/dna-actions" element={<DnaActions />} />
          <Route path="/rewards" element={<Rewards />} />
          <Route path="/site-monitor" element={<SiteMonitor />} />
          <Route path="/xtreme-ai" element={<XtremeAI />} />
          <Route path="/xtreme-factory" element={<XtremeFactory />} />
          <Route path="/xtreme-perfection" element={<XtremePerfection />} />
        </Route>
        <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
          <Route path="/build/:id" element={<BuildPortal />} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App