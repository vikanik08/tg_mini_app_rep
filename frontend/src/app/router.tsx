import { createBrowserRouter } from "react-router-dom";
import HomePage from "../pages/HomePageLive";
import CalendarPage from "../pages/CalendarPageLive";
import PassportRedirectPage from "../pages/PassportRedirectPage";
import PassportPage from "../pages/PassportPetPage";
import PassportEditPage from "../pages/PassportPetEditPage";
import ProfilePage from "../pages/ProfilePageLive";
import ProcedurePage from "../pages/ProcedurePetPage";
import SubscriptionsPage from "../pages/SubscriptionsPage";
import HealthCheckPage from "../pages/HealthCheckPage";

export const router = createBrowserRouter([
  { path: "/", element: <HomePage /> },
  { path: "/calendar", element: <CalendarPage /> },
  { path: "/subscriptions", element: <SubscriptionsPage /> },
  { path: "/passport", element: <PassportRedirectPage /> },
  { path: "/passport/edit", element: <PassportEditPage /> },
  { path: "/passport/:petId", element: <PassportPage /> },
  { path: "/passport/:petId/edit", element: <PassportEditPage /> },
  { path: "/profile", element: <ProfilePage /> },
  { path: "/procedure/:type/:petId", element: <ProcedurePage /> },
  { path: "/health-check/:petId", element: <HealthCheckPage /> },
]);
