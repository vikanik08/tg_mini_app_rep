import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCalendarMonth } from "@/entities/calendar/api";
import arrowIcon from "@/shared/ui/icons/arrow-icon.svg";
import "./month-calendar.css";

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
const legend = [
  { label: "Есть события", color: "pink" },
  { label: "Выполнено", color: "purple" },
  { label: "Осталось", color: "orange" },
];

type CalendarMonthLiveProps = {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onAddReminder: (date: Date) => void;
  petId?: string | null;
};

type CellEvent = {
  text: string;
  color: string;
};

type CalendarCell = {
  key: string;
  date: Date;
  day: string;
  muted?: boolean;
  selected?: boolean;
  sunday?: boolean;
  events?: CellEvent[];
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

function buildEvents(total: number, incomplete: number, completed: number): CellEvent[] {
  const result: CellEvent[] = [];
  if (total > 0) {
    result.push({ text: `${total} соб.`, color: "pink" });
  }
  if (completed > 0) {
    result.push({ text: `${completed} вып.`, color: "purple" });
  }
  if (incomplete > 0) {
    result.push({ text: `${incomplete} акт.`, color: "orange" });
  }
  return result;
}

function buildCells(
  monthDate: Date,
  selectedDate: Date,
  monthData?: Awaited<ReturnType<typeof getCalendarMonth>>,
) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const offset = (firstDay.getDay() + 6) % 7;
  const selectedKey = toDateKey(selectedDate);
  const daysMap = new Map(
    (monthData?.days ?? []).map((day) => [
      day.date,
      buildEvents(day.total_events, day.incomplete_events, day.completed_events),
    ]),
  );
  const cells: CalendarCell[] = [];

  for (let index = 0; index < offset; index += 1) {
    const day = daysInPrevMonth - offset + index + 1;
    const date = new Date(year, month - 1, day);
    cells.push({
      key: `prev-${day}`,
      date,
      day: String(day),
      muted: true,
      sunday: date.getDay() === 0,
      selected: toDateKey(date) === selectedKey,
    });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    const dateKey = toDateKey(date);
    cells.push({
      key: dateKey,
      date,
      day: String(day),
      sunday: date.getDay() === 0,
      selected: dateKey === selectedKey,
      events: daysMap.get(dateKey),
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
      sunday: date.getDay() === 0,
      selected: toDateKey(date) === selectedKey,
    });
  }

  return cells;
}

export default function MonthCalendarLive({
  selectedDate,
  onSelectDate,
  onAddReminder,
  petId,
}: CalendarMonthLiveProps) {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(selectedDate));
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth() + 1;

  const { data, isLoading } = useQuery({
    queryKey: ["calendar", "month", year, month, petId ?? "all"],
    queryFn: () => getCalendarMonth(year, month, petId),
  });

  useEffect(() => {
    setCurrentMonth(startOfMonth(selectedDate));
  }, [selectedDate]);

  const cells = useMemo(
    () => buildCells(currentMonth, selectedDate, data),
    [currentMonth, selectedDate, data],
  );

  return (
    <section className="O-MonthCalendar">
      <div className="O-MonthCalendar__top">
        <div className="O-MonthCalendar__monthWrap">
          <button
            className="O-MonthCalendar__arrow"
            type="button"
            onClick={() => setCurrentMonth((value) => shiftMonth(value, -1))}
            aria-label="Предыдущий месяц"
          >
            <img src={arrowIcon} alt="Назад" className="A-IconImage A-IconImage--md" />
          </button>
          <h2 className="O-MonthCalendar__month">
            {monthNames[currentMonth.getMonth()]}
          </h2>
          <button
            className="O-MonthCalendar__arrow"
            type="button"
            onClick={() => setCurrentMonth((value) => shiftMonth(value, 1))}
            aria-label="Следующий месяц"
          >
            <img
              src={arrowIcon}
              alt="Дальше"
              className="A-IconImage A-IconImage--md A-IconImage--rotate-left"
            />
          </button>
        </div>

        <button
          className="O-MonthCalendar__add"
          type="button"
          aria-label="Добавить событие"
          onClick={() => onAddReminder(selectedDate)}
        >
          +
        </button>
      </div>

      <div className="O-MonthCalendar__weekdays">
        {weekDays.map((day) => (
          <div key={day} className="O-MonthCalendar__weekday">
            {day}
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="O-MonthCalendar__grid O-MonthCalendar__grid--loading">
          {Array.from({ length: 35 }).map((_, index) => (
            <div key={index} className="O-MonthCalendar__cell O-MonthCalendar__cell--loading">
              <div className="O-MonthCalendar__skeleton O-MonthCalendar__skeleton--day" />
              <div className="O-MonthCalendar__skeleton O-MonthCalendar__skeleton--event" />
              <div className="O-MonthCalendar__skeleton O-MonthCalendar__skeleton--eventShort" />
            </div>
          ))}
        </div>
      ) : (
        <div className="O-MonthCalendar__grid">
          {cells.map((cell) => (
            <button
              key={cell.key}
              type="button"
              className={[
                "O-MonthCalendar__cell",
                cell.muted ? "is-muted" : "",
                cell.selected ? "is-selected" : "",
                cell.sunday ? "is-sunday" : "",
              ].join(" ")}
              onClick={() => {
                onSelectDate(cell.date);
                onAddReminder(cell.date);
              }}
            >
              <div className="O-MonthCalendar__day">{cell.day}</div>

              <div className="O-MonthCalendar__events">
                {cell.events?.map((event, eventIndex) => (
                  <div key={`${cell.key}-${eventIndex}`} className="O-MonthCalendar__event">
                    <span
                      className={`O-MonthCalendar__eventMarker O-MonthCalendar__eventMarker--${event.color}`}
                    />
                    <span className="O-MonthCalendar__eventText">{event.text}</span>
                  </div>
                ))}
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="O-MonthCalendar__legend">
        {legend.map((item) => (
          <div key={item.label} className="O-MonthCalendar__legendItem">
            <span
              className={`O-MonthCalendar__legendDot O-MonthCalendar__legendDot--${item.color}`}
            />
            <span className="O-MonthCalendar__legendText">{item.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
