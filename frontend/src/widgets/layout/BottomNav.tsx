import { NavLink } from "react-router-dom";
import { trackButtonClick, trackFeatureUse } from "@/shared/analytics/metrica";

import mainActive from "../../shared/ui/icons/main-screen-active-icon.svg";
import mainDisable from "../../shared/ui/icons/main-screen-diable-icon.svg";
import calendarActive from "../../shared/ui/icons/calendar-screen-active-icon.svg";
import calendarDisable from "../../shared/ui/icons/calendar-screen-disable-icon.svg";
import petActive from "../../shared/ui/icons/pet-screen-active-icon.svg";
import petDisable from "../../shared/ui/icons/pet-screen-disable-icon.svg";
import profileActive from "../../shared/ui/icons/profile-screen-active-icon.svg";
import profileDisable from "../../shared/ui/icons/profile-screen-disable-icon.svg";

import "./bottom-nav.css";

const items = [
  {
    to: "/",
    label: "Главная",
    activeIcon: mainActive,
    inactiveIcon: mainDisable,
  },
  {
    to: "/calendar",
    label: "Календарь",
    activeIcon: calendarActive,
    inactiveIcon: calendarDisable,
  },
  {
    to: "/passport",
    label: "Питомец",
    activeIcon: petActive,
    inactiveIcon: petDisable,
  },
  {
    to: "/profile",
    label: "Профиль",
    activeIcon: profileActive,
    inactiveIcon: profileDisable,
  },
];

export default function BottomNav() {
  return (
    <nav className="O-BottomNav">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className="O-BottomNav__link"
          onClick={() => {
            trackButtonClick(`bottom_nav_${item.to}`);
            trackFeatureUse("bottom_nav", "navigate", { destination: item.to });
          }}
        >
          {({ isActive }) => (
            <>
              <img
                src={isActive ? item.activeIcon : item.inactiveIcon}
                alt=""
                className="O-BottomNav__icon"
              />
              <span
                className={`O-BottomNav__label ${isActive ? "is-active" : ""}`}
              >
                {item.label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
