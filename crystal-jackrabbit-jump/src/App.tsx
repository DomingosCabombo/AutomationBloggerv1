import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./components/auth/AuthProvider";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Settings from "./pages/Settings";
import History from "./pages/History";
import Artists from "./pages/Artists";
import AudioSlogan from "./pages/AudioSlogan";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Logs from "./pages/Logs";
import Landing from "./pages/Landing";
import Onboarding from "./pages/Onboarding";
import OnboardingGuard from "./components/auth/OnboardingGuard";
import SubscriptionGuard from "./components/auth/SubscriptionGuard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route path="/" element={<Landing />} />
            
            <Route path="/onboarding" element={
              <ProtectedRoute>
                <SubscriptionGuard>
                  <OnboardingGuard>
                    <Onboarding />
                  </OnboardingGuard>
                </SubscriptionGuard>
              </ProtectedRoute>
            } />
            
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <SubscriptionGuard>
                  <OnboardingGuard>
                    <Index />
                  </OnboardingGuard>
                </SubscriptionGuard>
              </ProtectedRoute>
            } />
            
            <Route path="/artists" element={
              <ProtectedRoute>
                <SubscriptionGuard>
                  <OnboardingGuard>
                    <Artists />
                  </OnboardingGuard>
                </SubscriptionGuard>
              </ProtectedRoute>
            } />
            
            <Route path="/slogans" element={
              <ProtectedRoute>
                <SubscriptionGuard>
                  <OnboardingGuard>
                    <AudioSlogan />
                  </OnboardingGuard>
                </SubscriptionGuard>
              </ProtectedRoute>
            } />
            
            <Route path="/settings" element={
              <ProtectedRoute>
                <SubscriptionGuard>
                  <OnboardingGuard>
                    <Settings />
                  </OnboardingGuard>
                </SubscriptionGuard>
              </ProtectedRoute>
            } />
            
            <Route path="/history" element={
              <ProtectedRoute>
                <SubscriptionGuard>
                  <OnboardingGuard>
                    <History />
                  </OnboardingGuard>
                </SubscriptionGuard>
              </ProtectedRoute>
            } />
            
            <Route path="/logs" element={
              <ProtectedRoute>
                <SubscriptionGuard>
                  <OnboardingGuard>
                    <Logs />
                  </OnboardingGuard>
                </SubscriptionGuard>
              </ProtectedRoute>
            } />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;