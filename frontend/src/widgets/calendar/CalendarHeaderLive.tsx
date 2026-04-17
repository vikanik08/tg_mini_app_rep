import { Link, useNavigate } from "react-router-dom";
import arrowIcon from "../../shared/ui/icons/arrow-icon.svg";
import listIcon from "../../shared/ui/icons/list-icon.svg";
import "./calendar-header.css";

export default function CalendarHeaderLive() {
  const navigate = useNavigate();

  return (
    <header className="O-CalendarTopBar">
      <button
        className="O-CalendarTopBar__iconButton"
        aria-label="Назад"
        type="button"
        onClick={() => navigate(-1)}
      >
        <img
          src={arrowIcon}
          alt="Назад"
          className="A-IconImage A-IconImage--md"
        />
      </button>

      <h1 className="O-CalendarTopBar__title">Календарь</h1>

      <Link className="O-CalendarTopBar__iconButton" aria-label="Профиль" to="/profile">
        <img
          src={listIcon}
          alt="Открыть профиль"
          className="A-IconImage A-IconImage--md"
        />
      </Link>
    </header>
  );
}
