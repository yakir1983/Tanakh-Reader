import { useState, useCallback } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import Home from '@/pages/home';
import NotFound from '@/pages/not-found';
import TikkunHaklali from '@/pages/tikkun-haklali';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { SplashScreen } from '@/components/SplashScreen';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Show splash only once per session (not on every navigation)
const SPLASH_KEY = 'tanach_splash_shown';
const shouldShowSplash = !sessionStorage.getItem(SPLASH_KEY);

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/tikkun" component={TikkunHaklali} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [splashDone, setSplashDone] = useState(!shouldShowSplash);

  const handleSplashDone = useCallback(() => {
    sessionStorage.setItem(SPLASH_KEY, '1');
    setSplashDone(true);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {!splashDone && (
          <SplashScreen onDone={handleSplashDone} duration={2200} />
        )}
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
