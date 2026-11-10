import { Navigate, Route, Routes } from 'react-router-dom';

import { MechanicLayout } from '../components/mechanic/MechanicLayout';
import { Welcome } from '../pages/mechanic/Welcome';
import { SignIn } from '../pages/mechanic/SignIn';
import { Availability } from '../pages/mechanic/Availability';
import { Jobs } from '../pages/mechanic/Jobs';
import { JobOffer } from '../pages/mechanic/JobOffer';
import { JobTravel } from '../pages/mechanic/JobTravel';
import { VerifyArrival } from '../pages/mechanic/VerifyArrival';
import { Diagnosis } from '../pages/mechanic/Diagnosis';
import { Quote } from '../pages/mechanic/Quote';
import { AdditionalWork } from '../pages/mechanic/AdditionalWork';
import { RepairProgress } from '../pages/mechanic/RepairProgress';
import { TowingHandover } from '../pages/mechanic/TowingHandover';
import { JobComplete } from '../pages/mechanic/JobComplete';
import { Earnings } from '../pages/mechanic/Earnings';
import { Updates } from '../pages/mechanic/Updates';
import { Account } from '../pages/mechanic/Account';
import { NotFound } from '../pages/NotFound';
import { SignUp } from '../pages/SignUp';
import { MechanicChat } from '../pages/mechanic/MechanicChat';
import { AuthLayout } from '../components/auth/AuthLayout';
import { ForgotPassword } from '../pages/ForgotPassword';

export function MechanicRoutes() {
  return (
    <Routes>
      <Route index element={<Welcome />} />
      <Route path="signin" element={<SignIn />} />
      <Route path="signup" element={<AuthLayout role="mechanic"><SignUp role="mechanic" /></AuthLayout>} />
      <Route path="forgot-password" element={<AuthLayout role="mechanic"><ForgotPassword role="mechanic" /></AuthLayout>} />
      <Route path="verify" element={<Navigate to="/mechanic/signin" replace />} />
      <Route path="sign-in" element={<Navigate to="/mechanic/signin" replace />} />
      <Route path="login" element={<Navigate to="/mechanic/signin" replace />} />

      <Route element={<MechanicLayout />}>
        <Route path="availability" element={<Availability />} />
        <Route path="jobs" element={<Jobs />} />
        <Route path="jobs/:jobId" element={<JobOffer />} />
        <Route path="jobs/:jobId/chat" element={<MechanicChat />} />
        <Route path="jobs/:jobId/travel" element={<JobTravel />} />
        <Route path="jobs/:jobId/arrival" element={<VerifyArrival />} />
        <Route path="jobs/:jobId/diagnosis" element={<Diagnosis />} />
        <Route path="jobs/:jobId/quote" element={<Quote />} />
        <Route path="jobs/:jobId/additional-work" element={<AdditionalWork />} />
        <Route path="jobs/:jobId/progress" element={<RepairProgress />} />
        <Route path="jobs/:jobId/handover" element={<TowingHandover />} />
        <Route path="jobs/:jobId/complete" element={<JobComplete />} />
        <Route path="earnings" element={<Earnings />} />
        <Route path="updates" element={<Updates />} />
        <Route path="account" element={<Account />} />
        <Route index element={<Navigate to="jobs" replace />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
