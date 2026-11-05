import { tr, trTemplate } from "../../i18n/translations";
import { useEffect } from 'react';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { BrandLogo } from '../BrandLogo';
import { Link, Outlet, useLocation } from 'react-router-dom';
const steps = ['/permissions', '/profile'];
const titles = {
  '/start': 'Welcome',
  '/signin': 'Sign in',
  '/login': 'Sign in',
  '/signup': 'Create account',
  '/permissions': 'Your preferences',
  '/profile': 'Safety contact',
  '/forgot-password': 'Reset password'
};
export function AuthLayout({ role = 'customer', children }) {
  const mechanic = role === 'mechanic';
  const {
    pathname
  } = useLocation();
  const step = steps.indexOf(pathname);
  const backTo = {
    '/start': '/',
    '/signin': '/',
    '/login': '/',
    '/signup': '/',
    '/permissions': '/app',
    '/profile': '/permissions',
    '/forgot-password': '/signin'
  }[pathname] || (mechanic ? '/mechanic' : '/');
  useEffect(() => {
    document.title = `${titles[pathname.replace('/mechanic', '')] || 'Account'} | FixMyBuddy${mechanic ? ' Pro' : ''}`;
    window.scrollTo(0, 0);
    return () => {
      document.title = 'FixMyBuddy';
    };
  }, [pathname, mechanic]);
  return <div className="auth-root">
      <a href="#auth-main" className="auth-skip">{tr("Skip to form")}</a>
      <header className="auth-nav">
        <Link to={mechanic ? '/mechanic' : '/'} className="auth-brand" aria-label={tr("FixMyBuddy home")}>
          <BrandLogo />
          <span>{tr("FixMyBuddy")}<span className="auth-brand-caption">{tr("YOUR ROADSIDE BUDDY")}</span>
          </span>
        </Link>
        <Link to={mechanic ? '/mechanic' : '/app'} className="auth-browse">{mechanic ? 'Mechanic network' : tr("Browse first")}<ArrowUpRight size={16} />
        </Link>
      </header>
      <div className="auth-workspace">
        <main id="auth-main" className="auth-main" tabIndex={-1}>
          <div className="auth-form-wrap" key={pathname}>
            <div className="auth-form-top">
              <Link to={backTo} className="auth-back">
                <ArrowLeft size={18} />{tr("Back")}</Link>
              <span className="auth-customer-tag">{mechanic ? 'MECHANIC' : tr("CUSTOMER")}</span>
            </div>
            {step >= 0 && <div className="auth-progress" aria-label={trTemplate(["Onboarding step ", " of 2"], [step + 1])}>
                <div className="auth-progress-bars">
                  {steps.map((path, index) => <span key={path} className={index <= step ? 'is-current' : ''} />)}
                </div>
                <span>{step + 1} / 2</span>
              </div>}
            {children || <Outlet />}
          </div>
          <footer className="auth-footer">
            <BrandLogo />{tr("FixMyBuddy")} {' '}
            <span>{tr("Here for your next move.")}</span>
          </footer>
        </main>
      </div>
    </div>;
}
