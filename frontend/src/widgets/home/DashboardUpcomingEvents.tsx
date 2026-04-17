import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, MoreHorizontal } from "lucide-react";
import {
  completeEvent,
  deleteEvent,
  uncompleteEvent,
} from "@/entities/event/api";
import { useToast } from "@/shared/ui/useToast";
import "./upcoming-events.css";

type EventItem = {
  id: string;
  weekday: string;
  day: string;
  title: string;
  time: string;
  subtitle: string;
  petId: string;
  petName: string;
  isDone: boolean;
  passportPath: string;
  editPath: string;
};

type DashboardUpcomingEventsProps = {
  events: EventItem[];
};

export default function DashboardUpcomingEvents({
  events,
}: DashboardUpcomingEventsProps) {
  const [menuEventId, setMenuEventId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const toggleDoneMutation = useMutation({
    mutationFn: async ({
      eventId,
      isDone,
    }: {
      eventId: string;
      isDone: boolean;
      title: string;
    }) => {
      if (isDone) {
        await uncompleteEvent(eventId);
        return;
      }

      await completeEvent(eventId);
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries();
      setMenuEventId(null);
      showToast(
        variables.isDone
          ? `Событие «${variables.title}» снова в плане`
          : `Событие «${variables.title}» выполнено`,
        "success",
      );
    },
    onError: () => {
      showToast("Не удалось обновить событие", "error");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({
      eventId,
    }: {
      eventId: string;
      title: string;
    }) => {
      await deleteEvent(eventId);
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries();
      setMenuEventId(null);
      showToast(`Событие «${variables.title}» удалено`, "success");
    },
    onError: () => {
      showToast("Не удалось удалить событие", "error");
    },
  });

  if (events.length === 0) {
    return (
      <section className="O-EventsCard">
        <div className="M-EventRow">
          <div className="M-EventRow__content">
            <div className="M-EventRow__title">Событий пока нет</div>
            <div className="M-EventRow__meta">
              Добавьте первое напоминание для питомца из календаря или паспорта.
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="O-EventsCard">
      {events.map((event, index) => (
        <div key={event.id} className="M-EventRow M-EventRow--card">
          <div className="M-EventRow__date">
            <div className="M-EventRow__weekday">{event.weekday}</div>
            <div className="M-EventRow__day">{event.day}</div>
          </div>

          <div className="M-EventRow__content">
            <div className="M-EventRow__top">
              <div className="M-EventRow__title">{event.title}</div>

              <div className="M-EventRow__menuWrap">
                <button
                  type="button"
                  className="M-EventRow__menuButton"
                  aria-label="Открыть действия события"
                  aria-expanded={menuEventId === event.id}
                  onClick={() =>
                    setMenuEventId((current) =>
                      current === event.id ? null : event.id,
                    )
                  }
                  disabled={toggleDoneMutation.isPending || deleteMutation.isPending}
                >
                  <MoreHorizontal size={18} />
                </button>

                {menuEventId === event.id ? (
                  <div className="M-EventRow__menu">
                    <Link
                      className="M-EventRow__menuItem"
                      to={event.editPath}
                      onClick={() => setMenuEventId(null)}
                    >
                      Редактировать
                    </Link>

                    <button
                      type="button"
                      className="M-EventRow__menuItem M-EventRow__menuItem--danger"
                      onClick={() => {
                        if (!window.confirm("Удалить это событие?")) return;
                        deleteMutation.mutate({
                          eventId: event.id,
                          title: event.title,
                        });
                      }}
                      disabled={toggleDoneMutation.isPending || deleteMutation.isPending}
                    >
                      Удалить
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="M-EventRow__meta">
              {event.time} {event.subtitle}
            </div>

            <div className="M-EventRow__petRow">
              <span className="M-EventRow__petName">Питомец: {event.petName}</span>
              <Link className="M-EventRow__petLink" to={event.passportPath}>
                Открыть паспорт
              </Link>
            </div>
          </div>

          <div className="M-EventRow__controls">
            <button
              type="button"
              className={`M-EventRow__checkButton ${event.isDone ? "is-checked" : ""}`}
              aria-label={
                event.isDone
                  ? "Вернуть событие в план"
                  : "Отметить событие выполненным"
              }
              onClick={() =>
                toggleDoneMutation.mutate({
                  eventId: event.id,
                  isDone: event.isDone,
                  title: event.title,
                })
              }
              disabled={toggleDoneMutation.isPending || deleteMutation.isPending}
            >
              <Check size={16} />
            </button>
          </div>

          {index !== events.length - 1 && <div className="M-EventRow__divider" />}
        </div>
      ))}

      <Link className="O-EventsCard__footerLink" to="/calendar">
        Посмотреть все
      </Link>
    </section>
  );
}
