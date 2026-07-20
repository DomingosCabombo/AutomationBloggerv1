import React, { useEffect, useState } from 'react';
import { useAuth } from './AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import Paywall from '@/components/billing/Paywall';

interface SubscriptionGuardProps {
  children: React.ReactNode;
}

const SubscriptionGuard: React.FC<SubscriptionGuardProps> = ({ children }) => {
  const { session, loading: authLoading } = useAuth();
  const [isExpired, setIsExpired] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkSubscription = async () => {
      if (!session?.user) {
        setIsChecking(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('subscription_end_date, plan_type')
          .eq('id', session.user.id)
          .maybeSingle();

        if (error || !data) {
          console.error("Error fetching subscription:", error);
          setIsExpired(false); // Default to false if we can't check
          return;
        }

        // If no end date is set, maybe it's an old admin account. We let them pass.
        if (!data.subscription_end_date) {
          setIsExpired(false);
          return;
        }

        const endDate = new Date(data.subscription_end_date);
        const now = new Date();

        // Check if current date is PAST the end date
        if (now > endDate && data.plan_type === 'trial') {
          setIsExpired(true);
        } else {
          setIsExpired(false);
        }

      } catch (err) {
        console.error("Failed to check subscription logic:", err);
      } finally {
        setIsChecking(false);
      }
    };

    if (!authLoading) {
      checkSubscription();
    }
  }, [session, authLoading]);

  if (authLoading || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  // Se estiver expirado, mostrar a parede de pagamento!
  if (isExpired) {
    return <Paywall />;
  }

  // Se estiver tudo OK, deixa entrar
  return <>{children}</>;
};

export default SubscriptionGuard;
