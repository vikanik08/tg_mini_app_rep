import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getCalendarDay } from "@/entities/calendar/api";
import {
  completeEvent,
  deleteEvent,
  uncompleteEvent,
} from "@/entities/event/api";
import { getPets } from "@/entities/pet/api";
import {
  buildPassportPath,
  buildProcedurePath,
  pickActivePet,
} from "@/shared/lib/activePet";
import { useToast } from "@/shared/ui/useToast";
import plusIcon from "../../shared/ui/icons/plus-icon.svg";
import calendarIcon from "../../shared/ui/icons/calendar-icon.svg";
import "./today-reminders.css";

type TodayRemindersLiveProps = {
  selectedDate: Date;
  petId?: string | null;
  onAddReminder: (date: Date) => void;
};

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatSelectedDate(date: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
  }).format(date);
}

function formatEventTypeLabel(type: string) {
  if (type === "vaccine") return "Вакцина";
  if (type === "flea_treatment") return "Обработка";
  if (type === "vet_visit") return "Ветврач";
  if (type === "grooming") return "Груминг";
  return "Другое";
}

export default function TodayRemindersLive({
  selectedDate,
  petId,
  onAddReminder,
}: TodayRemindersLiveProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const dateKey = toDateKey(selectedDate);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["calendar", "day", dateKey, petId ?? "all"],
    queryFn: () => getCalendarDay(dateKey, petId),
  });
  const petsQuery = useQuery({
    queryKey: ["pets"],
    queryFn: getPets,
  });

  const activePet = useMemo(
    () => pickActivePet(petsQuery.data ?? []),
    [petsQuery.data],
  );
  const petsById = useMemo(
    () => new Map((petsQuery.data ?? []).map((pet) => [pet.id, pet])),
    [petsQuery.data],
  );
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
      showToast(
        variables.isDone
          ? `Событие «${variables.title}» снова в плане`
          : `Событие «${variables.title}» отмечено выполненным`,
        "success",
      );
    },
    onError: () => {
      showToast("Не удалось обновить статус события", "error");
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
      showToast(`Событие «${variables.title}» удалено`, "success");
    },
    onError: () => {
      showToast("Не удалось удалить событие", "error");
    },
  });

  const events = data?.events ?? [];

  return (
    <section className="O-TodayReminders">
      <h2 className="O-TodayReminders__title">
        {`Напоминания на ${formatSelectedDate(selectedDate)}`}
      </h2>

      {isLoading ? (
        <div className="O-TodayReminders__text">Загружаем события...</div>
      ) : isError ? (
        <div className="O-TodayReminders__text">
          Не удалось загрузить события на выбранный день.
        </div>
      ) : events.length === 0 ? (
        <div className="O-TodayReminders__empty">
          <div className="O-TodayReminders__icon">
            <img
              src={calendarIcon}
              alt="Календарь"
              className="A-IconImage A-Icon-Calendar"
            />
          </div>
          <div className="O-TodayReminders__text">
            Нет напоминаний на этот день
          </div>
        </div>
      ) : (
        <div className="O-TodayReminders__list">
          {events.map((event) => {
            const pet = petsById.get(event.pet_id);

            return (
              <div key={event.id} className="O-TodayReminders__eventCard">
                <div className="O-TodayReminders__eventTop">
                  <div>
                    <div className="O-TodayReminders__eventTitle">{event.title}</div>
                    <div className="O-TodayReminders__eventMeta">
                      {formatTime(event.scheduled_at)} • {formatEventTypeLabel(event.type)}
                    </div>
                  </div>

                  <span className={`O-TodayReminders__eventState ${event.is_done ? "is-done" : ""}`}>
                    {event.is_done ? "Выполнено" : "Запланировано"}
                  </span>
                </div>

                {pet ? (
                  <div className="O-TodayReminders__petRow">
                    <span className="O-TodayReminders__petLabel">Питомец: {pet.name}</span>
                    <Link className="O-TodayReminders__petLink" to={buildPassportPath(event.pet_id)}>
                      Открыть паспорт
                    </Link>
                  </div>
                ) : null}

                {event.notes ? (
                  <div className="O-TodayReminders__eventNotes">{event.notes}</div>
                ) : null}

                <div className="O-TodayReminders__actions">
                  <button
                    type="button"
                    className="O-TodayReminders__actionButton"
                    onClick={() =>
                      toggleDoneMutation.mutate({
                        eventId: event.id,
                        isDone: event.is_done,
                        title: event.title,
                      })}
                    disabled={toggleDoneMutation.isPending || deleteMutation.isPending}
                  >
                    {event.is_done ? "Вернуть в план" : "Отметить выполненным"}
                  </button>

                  <Link
                    className="O-TodayReminders__actionButton"
                    to={`${buildProcedurePath("custom", event.pet_id)}?eventId=${event.id}&date=${dateKey}`}
                  >
                    Редактировать
                  </Link>

                  <button
                    type="button"
                    className="O-TodayReminders__actionButton O-TodayReminders__actionButton--danger"
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
              </div>
            );
          })}
        </div>
      )}

      {activePet ? (
        <button
          type="button"
          className="O-TodayReminders__button"
          onClick={() => onAddReminder(selectedDate)}
        >
          <span className="O-TodayReminders__buttonPlus">
            <img
              src={plusIcon}
              alt="Добавить"
              className="A-IconImage A-IconImage--sm"
            />
          </span>
          Добавить напоминание
        </button>
      ) : (
        <Link className="O-TodayReminders__button" to="/passport/edit">
          <span className="O-TodayReminders__buttonPlus">
            <img
              src={plusIcon}
              alt="Добавить"
              className="A-IconImage A-IconImage--sm"
            />
          </span>
          Сначала добавить питомца
        </Link>
      )}
    </section>
  );
}
