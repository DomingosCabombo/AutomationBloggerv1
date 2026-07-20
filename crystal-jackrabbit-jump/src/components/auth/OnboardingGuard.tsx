import React, { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthProvider';
import { Loader2 } from 'lucide-react';

interface OnboardingGuardProps {
  children: React.ReactNode;
}

const OnboardingGuard: React.FC<OnboardingGuardProps> = ({ children }) => {
  const { session, loading: authLoading } = useAuth();
  const [isOnboarded, setIsOnboarded] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!session?.user) {
        setIsChecking(false);
        return;
      }

      try {
        // 1. Check settings table (Google Drive & Blogger)
        const { data: settingsData } = await supabase
          .from('settings')
          .select('blog_id, refresh_token')
          .eq('user_id', session.user.id)
          .maybeSingle();

        // 2. Check automation_settings table (Slogans)
        const { data: automationData } = await supabase
          .from('automation_settings')
          .select('slogan1_url')
          .eq('user_id', session.user.id)
          .maybeSingle();

        const hasBlogId = !!settingsData?.blog_id;
        const hasGoogleAuth = !!settingsData?.refresh_token;
        const hasSlogans = !!automationData?.slogan1_url;

        if (hasBlogId && hasGoogleAuth && hasSlogans) {
          setIsOnboarded(true);
        } else {
          setIsOnboarded(false);
        }
      } catch (error) {
        console.error("Error checking onboarding status:", error);
        setIsOnboarded(false); // Force onboarding if error
      } finally {
        setIsChecking(false);
      }
    };

    if (!authLoading) {
      checkOnboardingStatus();
    }
  }, [session, authLoading]);

  if (authLoading || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  // If trying to access protected route but not onboarded
  if (isOnboarded === false && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  // If trying to access onboarding but ALREADY onboarded
  if (isOnboarded === true && location.pathname === '/onboarding') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default OnboardingGuard;
