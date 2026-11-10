import { Navigate, Route, Routes, useLocation } from 'react-router-dom';

import { MainLayout } from '../components/layout/MainLayout';
import { CustomerLayout } from '../components/customer/CustomerLayout';
import { AuthLayout } from '../components/auth/AuthLayout';

import { Account } from '../pages/customer/Account';
import { AccountProfile } from '../pages/customer/AccountProfile';
import { AccountSettings } from '../pages/customer/AccountSettings';
import { HelpCenter } from '../pages/customer/HelpCenter';
import { SupportChat } from '../pages/customer/SupportChat';
import { Disputes } from '../pages/customer/Disputes';
import { TowingChat } from '../pages/customer/TowingChat';
import { Vehicles } from '../pages/customer/Vehicles';
import { Updates } from '../pages/customer/Updates';
import { PickupLocation } from '../pages/customer/PickupLocation';
import { SignIn } from '../pages/SignIn';
import { SignUp } from '../pages/SignUp';
import { Permissions } from '../pages/customer/Permissions';
import { SafetyProfile } from '../pages/customer/SafetyProfile';
import { ForgotPassword } from '../pages/ForgotPassword';
import { AppHome } from '../pages/customer/AppHome';
import { ConfirmLocation } from '../pages/customer/ConfirmLocation';
import { ConfirmRequest } from '../pages/customer/ConfirmRequest';
import { History } from '../pages/customer/History';
import { Home } from '../pages/Home';
import { ProviderProfile } from '../pages/customer/ProviderProfile';
import { ProviderFilters } from '../pages/customer/ProviderFilters';
import { NotFound } from '../pages/NotFound';
import { Providers } from '../pages/customer/Providers';
import { RequestAssistance } from '../pages/customer/RequestAssistance';
import { RequestDetails } from '../pages/customer/RequestDetails';
import { RequestMatching } from '../pages/customer/RequestMatching';
import { MechanicRoutes } from './MechanicRoutes';
import { TowingRequest } from '../pages/customer/TowingRequest';
import { ActiveService } from '../pages/customer/ActiveService';
import { ProviderChat } from '../pages/customer/ProviderChat';
import { PolicyPage } from '../pages/PolicyPage';
import { PaymentCheckout } from '../pages/customer/PaymentCheckout';
import { Welcome as LegacyWelcome } from '../pages/Welcome';
import { NoProviders } from '../pages/customer/NoProviders';
import { Services } from '../pages/customer/Services';

function CustomerAlias() {
  const { pathname, search } = useLocation();
  return <Navigate to={`${pathname.replace(/^\/customer\/?/, '/') === '/' ? '/app' : pathname.replace(/^\/customer\/?/, '/')}${search}`} replace />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/demo/welcome" element={<LegacyWelcome />} />
      <Route path="/demo/services" element={<Services />} />
      <Route path="/demo/no-providers" element={<NoProviders radius={5} onExpand={() => window.location.assign('/providers')} onRetry={() => window.location.assign('/providers')} onSchedule={() => window.location.assign('/provider-filters?schedule=1')} />} />
      <Route path="terms" element={<PolicyPage kind="terms" />} />
      <Route path="privacy" element={<PolicyPage kind="privacy" />} />
      <Route path="start" element={<Navigate to="/" replace />} />

      <Route path="/mechanic/*" element={<MechanicRoutes />} />
      <Route path="/customer/*" element={<CustomerAlias />} />

      <Route element={<AuthLayout />}>
        <Route path="signin" element={<SignIn />} />
        <Route path="login" element={<Navigate to="/signin" replace />} />
        <Route path="signup" element={<SignUp />} />
        <Route path="register" element={<Navigate to="/signup" replace />} />
        <Route path="verify" element={<Navigate to="/signin" replace />} />
        <Route path="permissions" element={<Permissions />} />
        <Route path="profile" element={<SafetyProfile />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
      </Route>

      <Route element={<CustomerLayout />}>
        <Route path="app" element={<AppHome />} />
        <Route path="vehicles" element={<Vehicles />} />
        <Route path="account" element={<Account />} />
        <Route path="account/:section" element={<AccountProfile />} />
        <Route path="settings/:section" element={<AccountSettings />} />
        <Route path="help" element={<HelpCenter />} />
        <Route path="help/chat" element={<SupportChat />} />
        <Route path="help/disputes" element={<Disputes />} />
        <Route path="bookings/:bookingId/towing-chat" element={<TowingChat />} />
        <Route path="bookings/:bookingId/service" element={<ActiveService />} />
        <Route path="bookings/:bookingId/pay" element={<PaymentCheckout />} />
        <Route path="bookings/:bookingId/provider-chat" element={<ProviderChat />} />
        <Route path="updates" element={<Updates />} />
        <Route path="location" element={<PickupLocation />} />
        <Route path="history" element={<History />} />
      </Route>

      <Route element={<MainLayout />}>
        <Route path="request" element={<RequestAssistance />} />
        <Route path="request/towing" element={<TowingRequest />} />
        <Route path="request/details" element={<RequestDetails />} />
        <Route path="request/matching" element={<RequestMatching />} />
        <Route path="confirm-location" element={<ConfirmLocation />} />
        <Route path="confirm-request" element={<ConfirmRequest />} />
        <Route path="providers" element={<Providers />} />
        <Route path="provider-filters" element={<ProviderFilters />} />
        <Route path="providers/:providerId" element={<ProviderProfile />} />
        <Route
          path="no-providers"
          element={<Navigate to="/providers" replace />}
        />
        <Route
          path="services"
          element={<Navigate to="/app" replace />}
        />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
