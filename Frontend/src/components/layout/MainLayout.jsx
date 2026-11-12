import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { RoleGuard } from '../auth/RoleGuard';

export function MainLayout() {
  const { pathname } = useLocation();
  useEffect(() => {
    const title =
      {
        '/request': 'Request assistance',
        '/request/towing': 'Request towing',
        '/request/details': 'Issue details',
        '/request/matching': 'Find your buddy',
        '/confirm-location': 'Confirm location',
        '/confirm-request': 'Confirm request',
        '/providers': 'Nearby providers',
        '/provider-filters': 'Provider filters',
        '/no-providers': 'Provider search',
      }[pathname] || (pathname.startsWith('/providers/') ? 'Provider profile' : 'FixMyBuddy');
    document.title = `${title} | FixMyBuddy`;
    window.scrollTo(0, 0);
  }, [pathname]);
  return (
    <RoleGuard requireSession allowedRoles={['customer']}><main className="auth-root">
      <div className="mx-auto min-h-screen w-full max-w-[488px]">
        <Outlet />
      </div>
    </main></RoleGuard>
  );
}
