import { useEffect, type PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "@/shared/ui/toast";
import { useToast } from "@/shared/ui/useToast";

const queryClient = new QueryClient();

function PromoNotice() {
  const { showToast } = useToast();

  useEffect(() => {
    const message = sessionStorage.getItem("promo_notice");
    if (!message) return;

    sessionStorage.removeItem("promo_notice");
    showToast(message, "success");
  }, [showToast]);

  return null;
}

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <PromoNotice />
        {children}
      </ToastProvider>
    </QueryClientProvider>
  );
}
