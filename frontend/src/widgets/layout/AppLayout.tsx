import type { ReactNode } from "react";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackPageView, trackScreenView } from "@/shared/analytics/metrica";
import BottomNav from "./BottomNav";
import "./layout.css";

type AppLayoutProps = {
  children: ReactNode;
};

export default function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();

  useEffect(() => {
    const path = `${location.pathname}${location.search}`;
    trackPageView(path, { screen: location.pathname });
    trackScreenView(location.pathname, { path });
  }, [location.pathname, location.search]);

  return (
    <div className="L-App">
      <div className="L-App__screen">
        <main className="L-App__main">{children}</main>
        <BottomNav />
      </div>
    </div>
  );
}
