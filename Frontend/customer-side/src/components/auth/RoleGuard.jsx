import { ShieldAlert } from 'lucide-react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../../context/useAuth';
import { LoadingState } from '../ui/LoadingState';

/**
 * Protects routes against cross-role access:
 * - When a logged-in account has a role that is not in `allowedRoles` (e.g., a customer
 *   trying to open `/mechanic/jobs`, or a mechanic trying to open `/app`), it blocks access
 *   and directs them to their own workspace or to sign in with the right account.
 * - When `requireSession` is true, unauthenticated guests are redirected to the sign-in screen.
 */
export function RoleGuard({
  allowedRoles = ['customer'],
  requireSession = false,
  signInPath = '/signin',
  children,
}) {
  const { user, sessionStatus, signOut, retrySession } = useAuth();
  const navigate = useNavigate();
  const [switchError, setSwitchError] = useState('');
  const [switching, setSwitching] = useState(false);

  if (sessionStatus === 'loading') {
    return (
      <main className="auth-root buddy-splash">
        <div>
          <strong>FixMyBuddy</strong>
          <LoadingState />
        </div>
      </main>
    );
  }

  const userRole = user?.role || 'customer';
  if (sessionStatus === 'error') return <main className="auth-root"><p className="auth-error">Could not check your session.</p><button className="auth-secondary" onClick={retrySession}>Retry session check</button></main>;

  if (user && !allowedRoles.includes(userRole) && userRole !== 'admin') {
    const isMechanicTarget = allowedRoles.includes('mechanic');
    const ownWorkspace = userRole === 'mechanic' ? '/mechanic/jobs' : '/app';
    const ownLabel = userRole === 'mechanic' ? 'Go to FixMyBuddy Pro' : 'Go to Customer Home';

    return (
      <main className="auth-root customer-root">
        <div className="customer-shell">
          <div className="customer-empty mt-12">
            <ShieldAlert size={36} />
            <h2>
              {isMechanicTarget
                ? 'Provider account required'
                : 'Customer account required'}
            </h2>
            <p>
              You are currently signed in as <strong>{user.name}</strong> ({userRole} account).
              To protect account privacy, {userRole} accounts cannot access{' '}
              {isMechanicTarget ? 'FixMyBuddy Pro mechanic' : 'customer'} pages.
            </p>
            <div className="mt-4 flex w-full flex-col gap-2.5">
              <Link to={ownWorkspace} className="auth-primary">
                {ownLabel}
              </Link>
              <button
                type="button"
                disabled={switching}
                onClick={async () => {
                  setSwitching(true); setSwitchError('');
                  try { await signOut(); navigate(signInPath, { replace: true }); }
                  catch (error) { setSwitchError(error.message); }
                  finally { setSwitching(false); }
                }}
                className="auth-secondary"
              >
                Switch account
              </button>
              {switchError && <p className="auth-error" role="alert">{switchError}</p>}
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (requireSession && !user) {
    return <Navigate to={signInPath} replace />;
  }

  return children;
}
