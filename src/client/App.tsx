import './Main.css';
import NavBar from './components/NavBar/NavBar';
import CookieConsentBanner from './components/cookie-consent/Banner';
import { appNavigationItems } from './components/NavBar/contentSections';
import { landingPageNavigationItems } from '../landing-page/contentSections';
import { useMemo, useEffect } from 'react';
import { routes } from 'wasp/client/router';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from 'wasp/client/auth';
import { useIsLandingPage } from './hooks/useIsLandingPage';

/**
 * use this component to wrap all child components
 * this is useful for templates, themes, and context
 */
export default function App() {
  const location = useLocation();
  const { data: user } = useAuth();
  const isLandingPage = useIsLandingPage();
  const navigationItems = isLandingPage ? landingPageNavigationItems : appNavigationItems;

  // 🔒 Default dark: kayıtlı tercih yoksa 'dark' açık kalsın; varsa ona uy.
  useEffect(() => {
    try {
      const saved = localStorage.getItem('theme');
      const isDark = saved ? saved === 'dark' : true; // <-- default: dark
      document.documentElement.classList.toggle('dark', isDark);
    } catch {
      // localStorage yoksa yine dark kalsın
      document.documentElement.classList.add('dark');
    }
  }, []);

  const shouldDisplayAppNavBar = useMemo(() => {
    return location.pathname !== routes.LoginRoute.build() && location.pathname !== routes.SignupRoute.build();
  }, [location]);

  const isAdminDashboard = useMemo(() => {
    return location.pathname.startsWith('/admin');
  }, [location]);

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView();
      }
    }
  }, [location]);

  return (
    <>
      {/* Light durumda da okunabilirlik için temel renkler eklendi */}
      <div className="min-h-screen bg-white text-slate-900 dark:text-white dark:bg-boxdark-2">
        {isAdminDashboard ? (
          <Outlet />
        ) : (
          <>
            {shouldDisplayAppNavBar && <NavBar navigationItems={navigationItems} />}
            <div className='mx-auto max-w-7xl sm:px-6 lg:px-8'>
              <Outlet />
            </div>
          </>
        )}
      </div>
      <CookieConsentBanner />
    </>
  );
}
