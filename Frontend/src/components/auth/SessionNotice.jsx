import { Link } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { useLocale } from '../../context/useLocale';
export function SessionNotice() {
  const { pathname } = useLocation();
  const { user, sessionError, sessionStatus, retrySession } = useAuth();
  const { t } = useLocale();
  if (!sessionError) return null;
  return <aside className="session-notice" role="alert"><span>{t(sessionError)}</span>{user || sessionStatus === 'error' ? <button type="button" onClick={retrySession}>{t('Retry session check','Subukang muli ang session')}</button> : <Link to={pathname.startsWith('/mechanic') ? '/mechanic/signin' : '/signin'}>{t('Sign in','Mag-sign in')}</Link>}</aside>;
}
