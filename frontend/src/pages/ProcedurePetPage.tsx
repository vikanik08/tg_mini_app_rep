import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AppLayout from "../widgets/layout/AppLayout";
import {
  completeEvent,
  createEvent,
  deleteEvent,
  getEvent,
  type EventType,
  uncompleteEvent,
  updateEvent,
} from "../entities/event/api";
import { getPets } from "../entities/pet/api";
import {
  buildPassportEditPath,
  buildPassportPath,
  syncActivePet,
} from "../shared/lib/activePet";
import arrowIcon from "../shared/ui/icons/arrow-icon.svg";
import { useToast } from "../shared/ui/useToast";
import "./procedure-page.css";

type ProcedureRouteType =
  | "fleas"
  | "worms"
  | "rabies"
  | "infection"
  | "vet"
  | "custom";

type ProcedureConfig = {
  title: string;
  defaultTitle: string;
  notesHint: string;
  eventType: EventType;
};

type ReminderPreset = {
  id: string;
  label: string;
  getDate: (baseDate: string) => string;
};

const procedureConfig: Record<ProcedureRouteType, ProcedureConfig> = {
  fleas: {
    title: "Обработка от блох",
    defaultTitle: "Обработка от блох и клещей",
    notesHint: "Например, препарат и реакция питомца",
    eventType: "flea_treatment",
  },
  worms: {
    title: "Обработка от глистов",
    defaultTitle: "Профилактика от глистов",
    notesHint: "Например, название препарата и дозировка",
    eventType: "other",
  },
  rabies: {
    title: "Вакцинация от бешенства",
    defaultTitle: "Вакцинация от бешенства",
    notesHint: "Например, название вакцины и серия",
    eventType: "vaccine",
  },
  infection: {
    title: "Вакцинация от инфекции",
    defaultTitle: "Комплексная вакцинация",
    notesHint: "Например, какой комплекс поставили",
    eventType: "vaccine",
  },
  vet: {
    title: "Прием у ветеринара",
    defaultTitle: "Прием у ветеринара",
    notesHint: "Например, жалобы, назначения и рекомендации",
    eventType: "vet_visit",
  },
  custom: {
    title: "Другое событие",
    defaultTitle: "Процедура для питомца",
    notesHint: "Коротко опиши, что сделали",
    eventType: "other",
  },
};

const reminderPresets: ReminderPreset[] = [
  { id: "1-week", label: "1 неделя", getDate: (baseDate) => shiftDate(baseDate, { days: 7 }) },
  { id: "2-weeks", label: "2 недели", getDate: (baseDate) => shiftDate(baseDate, { days: 14 }) },
  { id: "3-weeks", label: "3 недели", getDate: (baseDate) => shiftDate(baseDate, { days: 21 }) },
  { id: "1-month", label: "1 месяц", getDate: (baseDate) => shiftDate(baseDate, { months: 1 }) },
  { id: "2-months", label: "2 месяца", getDate: (baseDate) => shiftDate(baseDate, { months: 2 }) },
  { id: "3-months", label: "3 месяца", getDate: (baseDate) => shiftDate(baseDate, { months: 3 }) },
  { id: "6-months", label: "пол года", getDate: (baseDate) => shiftDate(baseDate, { months: 6 }) },
  { id: "9-months", label: "9 месяцев", getDate: (baseDate) => shiftDate(baseDate, { months: 9 }) },
  { id: "1-year", label: "1 год", getDate: (baseDate) => shiftDate(baseDate, { months: 12 }) },
];

function getSafeType(value: string | undefined): ProcedureRouteType {
  if (
    value === "fleas"
    || value === "worms"
    || value === "rabies"
    || value === "infection"
    || value === "vet"
    || value === "custom"
  ) {
    return value;
  }

  return "custom";
}

function toDateTimeString(date: string) {
  return `${date}T12:00:00`;
}

function buildNotes(doneDate: string, notes: string, nextDate: string) {
  const chunks = [`Выполнено: ${doneDate}`];

  if (nextDate) {
    chunks.push(`Следующее напоминание: ${nextDate}`);
  }

  if (notes.trim()) {
    chunks.push(notes.trim());
  }

  return chunks.join("\n");
}

function getRequestedDate(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  return value;
}

function toInputDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftDate(
  value: string,
  shift: {
    days?: number;
    months?: number;
  },
) {
  if (!value) return "";

  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "";

  if (shift.days) {
    date.setDate(date.getDate() + shift.days);
  }

  if (shift.months) {
    date.setMonth(date.getMonth() + shift.months);
  }

  return date.toISOString().slice(0, 10);
}

export default function ProcedurePetPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const params = useParams();
  const [searchParams] = useSearchParams();
  const safeType = getSafeType(params.type);
  const routePetId = params.petId;
  const eventId = searchParams.get("eventId");
  const config = procedureConfig[safeType];
  const requestedDate = getRequestedDate(searchParams.get("date"));
  const isEditMode = Boolean(eventId);
  const isReminderMode = safeType === "custom" && Boolean(requestedDate) && !isEditMode;

  const petsQuery = useQuery({
    queryKey: ["pets"],
    queryFn: getPets,
  });
  const eventQuery = useQuery({
    queryKey: ["events", eventId],
    queryFn: () => getEvent(eventId!),
    enabled: isEditMode,
  });

  const petId = eventQuery.data?.pet_id ?? routePetId;
  const pet = useMemo(
    () => (petsQuery.data ?? []).find((item) => item.id === petId) ?? null,
    [petsQuery.data, petId],
  );

  const today = new Date().toISOString().slice(0, 10);
  const [draftTitle, setDraftTitle] = useState<string | null>(null);
  const [draftDoneDate, setDraftDoneDate] = useState<string | null>(null);
  const [nextDate, setNextDate] = useState("");
  const [selectedReminderPreset, setSelectedReminderPreset] = useState<string | null>(null);
  const [draftNotes, setDraftNotes] = useState<string | null>(null);
  const [draftIsDone, setDraftIsDone] = useState<boolean | null>(null);
  const [errorText, setErrorText] = useState("");

  const title = draftTitle ?? eventQuery.data?.title ?? (isReminderMode ? "Напоминание для питомца" : config.defaultTitle);
  const doneDate = draftDoneDate ?? (eventQuery.data ? toInputDate(eventQuery.data.scheduled_at) : requestedDate || today);
  const notes = draftNotes ?? eventQuery.data?.notes ?? "";
  const isDone = draftIsDone ?? eventQuery.data?.is_done ?? false;

  useEffect(() => {
    syncActivePet(pet);
  }, [pet]);

  function getBackPath() {
    if (doneDate) {
      return `/calendar?date=${doneDate}`;
    }

    if (requestedDate) {
      return `/calendar?date=${requestedDate}`;
    }

    return pet ? buildPassportPath(pet.id) : "/passport";
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!pet?.id) {
        throw new Error("Сначала создай питомца в паспорте");
      }

      if (!title.trim()) {
        throw new Error("Добавь название события");
      }

      if (!doneDate) {
        throw new Error(isReminderMode ? "Укажи дату напоминания" : "Укажи дату выполнения");
      }

      if (isEditMode && eventId) {
        await updateEvent(eventId, {
          pet_id: pet.id,
          title: title.trim(),
          scheduled_at: toDateTimeString(doneDate),
          notes: notes.trim() || null,
        });

        if (eventQuery.data && isDone !== eventQuery.data.is_done) {
          if (isDone) {
            await completeEvent(eventId);
          } else {
            await uncompleteEvent(eventId);
          }
        }

        return;
      }

      if (isReminderMode) {
        await createEvent({
          pet_id: pet.id,
          type: config.eventType,
          title: title.trim(),
          scheduled_at: toDateTimeString(doneDate),
          notes: notes.trim() || null,
        });
        return;
      }

      const completedEvent = await createEvent({
        pet_id: pet.id,
        type: config.eventType,
        title: title.trim(),
        scheduled_at: toDateTimeString(doneDate),
        notes: buildNotes(doneDate, notes, nextDate),
      });

      await completeEvent(completedEvent.id);

      if (nextDate) {
        await createEvent({
          pet_id: pet.id,
          type: config.eventType,
          title: `${title.trim()} - повтор`,
          scheduled_at: toDateTimeString(nextDate),
          notes: notes.trim() || null,
        });
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      showToast(
        isEditMode
          ? "Событие обновлено"
          : isReminderMode
            ? "Напоминание создано"
            : "Процедура сохранена",
        "success",
      );
      if (isReminderMode || isEditMode) {
        navigate(getBackPath());
        return;
      }

      if (pet) {
        navigate(buildPassportPath(pet.id));
      } else {
        navigate("/passport");
      }
    },
    onError: (error: Error) => {
      setErrorText(error.message || "Не удалось сохранить событие");
      showToast(error.message || "Не удалось сохранить событие", "error");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!eventId) {
        throw new Error("Событие не найдено");
      }

      await deleteEvent(eventId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      showToast("Событие удалено", "success");
      navigate(getBackPath());
    },
    onError: (error: Error) => {
      setErrorText(error.message || "Не удалось удалить событие");
      showToast(error.message || "Не удалось удалить событие", "error");
    },
  });

  return (
    <AppLayout>
      <div className="P-ProcedurePage">
        <header className="O-ProcedureHeader">
          <button
            type="button"
            className="O-ProcedureHeader__back"
            onClick={() => navigate(getBackPath())}
            aria-label="Назад"
          >
            <img src={arrowIcon} alt="Назад" className="A-IconImage A-IconImage--md" />
          </button>

          <h1 className="O-ProcedureHeader__title">
            {isEditMode
              ? "Редактирование события"
              : isReminderMode
                ? "Новое напоминание"
                : config.title}
          </h1>
        </header>

        {!pet && !petsQuery.isLoading ? (
          <section className="O-ProcedureCard">
            <p className="P-ProcedurePage__error">
              Сначала создай питомца, чтобы привязать к нему событие.
            </p>
            <Link className="A-ProcedureSaveButton" to="/passport/edit">
              Открыть паспорт
            </Link>
          </section>
        ) : isEditMode && eventQuery.isLoading ? (
          <section className="O-ProcedureCard">
            <p className="P-ProcedurePage__error">Загружаю событие...</p>
          </section>
        ) : isEditMode && eventQuery.isError ? (
          <section className="O-ProcedureCard">
            <p className="P-ProcedurePage__error">Не удалось загрузить событие для редактирования.</p>
          </section>
        ) : (
          <section className="O-ProcedureCard">
            {isEditMode ? (
              <div className="O-ProcedureStatusRow">
                <button
                  type="button"
                  className={`O-ProcedureStatusChip ${!isDone ? "is-active" : ""}`}
                  onClick={() => setDraftIsDone(false)}
                >
                  Запланировано
                </button>
                <button
                  type="button"
                  className={`O-ProcedureStatusChip ${isDone ? "is-active" : ""}`}
                  onClick={() => setDraftIsDone(true)}
                >
                  Выполнено
                </button>
              </div>
            ) : null}

            <label className="O-ProcedureField O-ProcedureField--accent">
              <span className="O-ProcedureField__label">
                {isEditMode
                  ? "Дата события"
                  : isReminderMode
                    ? "Дата напоминания"
                    : "Дата выполнения"}
              </span>
              <input
                className="O-ProcedureField__input"
                type="date"
                value={doneDate}
                onChange={(event) => {
                  setDraftDoneDate(event.target.value);
                  setSelectedReminderPreset(null);
                  if (errorText) setErrorText("");
                }}
              />
            </label>

            <label className="O-ProcedureField">
              <span className="O-ProcedureField__label">Название</span>
              <input
                className="O-ProcedureField__input O-ProcedureField__input--single"
                type="text"
                value={title}
                onChange={(event) => {
                  setDraftTitle(event.target.value);
                  if (errorText) setErrorText("");
                }}
                placeholder={config.defaultTitle}
              />
            </label>

            {!isReminderMode && !isEditMode ? (
              <>
                <section className="O-ProcedureReminder">
                  <h3 className="O-ProcedureReminder__title">Напоминание о следующей процедуре</h3>
                  <div className="O-ProcedureReminder__grid">
                    {reminderPresets.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        className={`O-ProcedureReminder__chip ${selectedReminderPreset === preset.id ? "is-active" : ""}`}
                        onClick={() => {
                          setSelectedReminderPreset(preset.id);
                          setNextDate(preset.getDate(doneDate));
                        }}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </section>

                <label className="O-ProcedureField">
                  <span className="O-ProcedureField__label">Дата следующей процедуры</span>
                  <input
                    className="O-ProcedureField__input"
                    type="date"
                    value={nextDate}
                    onChange={(event) => {
                      setSelectedReminderPreset(null);
                      setNextDate(event.target.value);
                    }}
                  />
                </label>
              </>
            ) : null}

            <label className="O-ProcedureField">
              <span className="O-ProcedureField__label">Комментарий</span>
              <input
                className="O-ProcedureField__input O-ProcedureField__input--single"
                type="text"
                value={notes}
                onChange={(event) => {
                  setDraftNotes(event.target.value);
                  if (errorText) setErrorText("");
                }}
                placeholder={config.notesHint}
              />
            </label>

            {pet ? (
              <div className="P-ProcedurePage__error">
                {isEditMode
                  ? `Редактирую событие для питомца: ${pet.name}`
                  : isReminderMode
                    ? `Создаю напоминание для питомца: ${pet.name}`
                    : `Сохраняю запись для питомца: ${pet.name}`}
              </div>
            ) : null}

            {pet ? (
              <Link className="P-PassportEditLive__ghostAction" to={buildPassportEditPath(pet.id)}>
                Открыть редактирование питомца
              </Link>
            ) : null}

            {errorText ? <div className="P-ProcedurePage__error">{errorText}</div> : null}

            <div className="P-ProcedurePage__actions">
              <button
                type="button"
                className="A-ProcedureSaveButton"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || deleteMutation.isPending || petsQuery.isLoading}
              >
                {saveMutation.isPending
                  ? "Сохраняю..."
                  : isEditMode
                    ? "Сохранить изменения"
                    : isReminderMode
                      ? "Создать"
                      : "Сохранить"}
              </button>

              {isEditMode ? (
                <button
                  type="button"
                  className="A-ProcedureSecondaryButton"
                  onClick={() => {
                    if (!window.confirm("Удалить это событие?")) return;
                    deleteMutation.mutate();
                  }}
                  disabled={saveMutation.isPending || deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? "Удаляю..." : "Удалить событие"}
                </button>
              ) : null}
            </div>
          </section>
        )}
      </div>
    </AppLayout>
  );
}
