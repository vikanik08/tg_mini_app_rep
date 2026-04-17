import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getCalendarMonth } from "@/entities/calendar/api";
import arrowIcon from "../../shared/ui/icons/arrow-icon.svg";
import plusIcon from "../../shared/ui/icons/plus-icon.svg";
import "./mini-calendar.css";

const weekDays = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];
const monthNames = [
  "ЯНВАРЬ",
  "ФЕВРАЛЬ",
  "МАРТ",
  "АПРЕЛЬ",
  "МАЙ",
  "ИЮНЬ",
  "ИЮЛЬ",
  "АВГУСТ",
  "СЕНТЯБРЬ",
  "ОКТЯБРЬ",
  "НОЯБРЬ",
  "ДЕКАБРЬ",
];
const dotPalette = ["orange", "pink", "purple", "blue"] as const;

type CalendarCell = {
  key: string;
  day: string;
  date: Date;
  muted?: boolean;
  selected?: boolean;
  sunday?: boolean;
  dots?: string[];
};

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function shiftMonth(date: Date, delta: number) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dotsForCount(count: number) {
  return Array.from(
    { length: Math.min(count, dotPalette.length) },
    (_, index) => dotPalette[index],
  );
}

function buildCells(
  monthDate: Date,
  selectedDate: Date,
  totalsByDate: Map<string, number>,
): CalendarCell[] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const offset = (firstDay.getDay() + 6) % 7;
  const selectedKey = toDateKey(selectedDate);
  const cells: CalendarCell[] = [];

  for (let index = 0; index < offset; index += 1) {
    const day = daysInPrevMonth - offset + index + 1;
    const date = new Date(year, month - 1, day);
    cells.push({
      key: `prev-${day}`,
      date,
      day: String(day),
      muted: true,
      selected: toDateKey(date) === selectedKey,
    });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const currentDate = new Date(year, month, day);
    const dateKey = toDateKey(currentDate);
    const totalEvents = totalsByDate.get(dateKey) ?? 0;

    cells.push({
      key: dateKey,
      date: currentDate,
      day: String(day),
      selected: dateKey === selectedKey,
      sunday: currentDate.getDay() === 0,
      dots: dotsForCount(totalEvents),
    });
  }

  const trailing = (7 - (cells.length % 7)) % 7;
  for (let day = 1; day <= trailing; day += 1) {
    const date = new Date(year, month + 1, day);
    cells.push({
      key: `next-${day}`,
      date,
      day: String(day),
      muted: true,
      selected: toDateKey(date) === selectedKey,
    });
  }

  return cells;
}

export default function DashboardMiniCalendar({
  onAddReminder,
}: {
  onAddReminder?: (date: Date) => void;
}) {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth() + 1;

  const { data } = useQuery({
    queryKey: ["calendar", "mini", year, month],
    queryFn: () => getCalendarMonth(year, month),
  });

  const totalsByDate = useMemo(
    () => new Map((data?.days ?? []).map((day) => [day.date, day.total_events])),
    [data],
  );

  const cells = useMemo(
    () => buildCells(currentMonth, selectedDate, totalsByDate),
    [currentMonth, selectedDate, totalsByDate],
  );

  function openCalendar(date: Date) {
    setSelectedDate(date);
    navigate(`/calendar?date=${toDateKey(date)}`);
  }

  return (
    <section className="O-MiniCalendar">
      <div className="O-MiniCalendar__header">
        <div className="O-MiniCalendar__monthWrap">
          <button
            className="O-MiniCalendar__arrow"
            type="button"
            onClick={() => setCurrentMonth((value) => shiftMonth(value, -1))}
          >
            <img
              src={arrowIcon}
              alt="Назад"
              className="A-IconImage A-IconImage--md A-IconImage--rotate-right"
            />
          </button>

          <h3 className="O-MiniCalendar__month">
            {monthNames[currentMonth.getMonth()]}
          </h3>

          <button
            className="O-MiniCalendar__arrow"
            type="button"
            onClick={() => setCurrentMonth((value) => shiftMonth(value, 1))}
          >
            <img
              src={arrowIcon}
              alt="Вперед"
              className="A-IconImage A-IconImage--md A-IconImage--rotate-left"
            />
          </button>
        </div>

        <button
          className="O-MiniCalendar__add"
          type="button"
          onClick={() =>
            onAddReminder ? onAddReminder(selectedDate) : openCalendar(selectedDate)}
        >
          <img
            src={plusIcon}
            alt="Открыть календарь"
            className="A-IconImage A-IconImage--sm"
          />
        </button>
      </div>

      <div className="O-MiniCalendar__weekdays">
        {weekDays.map((day) => (
          <div key={day} className="O-MiniCalendar__weekday">
            {day}
          </div>
        ))}
      </div>

      <div className="O-MiniCalendar__grid">
        {cells.map((cell) => (
          <button
            key={cell.key}
            type="button"
            className={[
              "O-MiniCalendar__cell",
              cell.muted ? "is-muted" : "",
              cell.selected ? "is-selected" : "",
              cell.sunday ? "is-sunday" : "",
            ].join(" ")}
            onClick={() => openCalendar(cell.date)}
          >
            <span className="O-MiniCalendar__day">{cell.day}</span>

            <div className="O-MiniCalendar__dots">
              {cell.dots?.map((dot, dotIndex) => (
                <span
                  key={`${cell.key}-${dot}-${dotIndex}`}
                  className={`O-MiniCalendar__dot O-MiniCalendar__dot--${dot}`}
                />
              ))}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
