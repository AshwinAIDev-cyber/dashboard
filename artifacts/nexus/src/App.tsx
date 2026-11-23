import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "framer-motion";
import { Toaster } from "sonner";
import { Route, Router as WouterRouter, Switch } from "wouter";
import { ApiError } from "@workspace/api-client-react";
import Dashboard from "@/pages/Dashboard";
import Landing from "@/pages/Landing";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      // Don't hammer offline integrations or bad requests with retries.
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
        if (error instanceof ApiError && error.status === 503) return false;
        return failureCount < 2;
      },
    },
  },
});

const base = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">
        <WouterRouter base={base}>
          <Switch>
            <Route path="/" component={Landing} />
            <Route path="/dashboard" component={Dashboard} />
            <Route component={NotFound} />
          </Switch>
        </WouterRouter>
        <Toaster
          position="bottom-left"
          theme="dark"
          toastOptions={{
            classNames: {
              toast:
                "!bg-[rgba(11,15,29,0.88)] !backdrop-blur-xl !border !border-[rgba(0,200,255,0.28)] !text-[#e6f6ff] !rounded-xl !shadow-[0_0_40px_-12px_rgba(0,200,255,0.6)] !font-[Rajdhani] !text-[0.95rem]",
              title: "!font-[Orbitron] !tracking-[0.12em] !text-[0.72rem] !uppercase",
              description: "!text-[#8fa3c0] !font-[Rajdhani]",
              actionButton: "!bg-[#00c8ff] !text-[#05070d] !font-[Orbitron] !text-[0.62rem] !tracking-[0.15em]",
            },
          }}
        />
      </MotionConfig>
    </QueryClientProvider>
  );
}
