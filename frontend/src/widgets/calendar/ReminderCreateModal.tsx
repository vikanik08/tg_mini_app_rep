import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Clock3, PencilLine, X } from "lucide-react";
import { createEvent, type EventType } from "@/entities/event/api";
import type { Pet } from "@/entities/pet/api";
import { zonedDateTimeToUtcIso } from "@/shared/lib/dateTime";
import { useToast } from "@/shared/ui/useToast";
import arrowIcon from "../../shared/ui/icons/arrow-icon.svg";
import "./reminder-create-modal.css";

type ReminderCreateModalProps = {
  open: boolean;
  selectedDate: Date;
  pets: Array<Pick<Pet, "id" | "name" | "species">>;
  preferredPetId: string | null;
  onClose: () => void;
};

type TaskOption = {
  id: string;
  label: string;
  eventType: EventType;
  title: string;
  icon: string;
};

type RepeatPreset = "day" | "three-days" | "week" | "month" | "custom";

const taskOptions: TaskOption[] = [
  { id: "feeding", label: "Питание", eventType: "other", title: "Питание", icon: "🍽️" },
  { id: "medicine", label: "Лекарство", eventType: "other", title: "Лекарство", icon: "💊" },
  { id: "parasites", label: "Обработка от паразитов", eventType: "flea_treatment", title: "Профилактика от паразитов", icon: "🛡️" },
  { id: "vaccine", label: "Вакцинация", eventType: "vaccine", title: "Вакцинация", icon: "💉" },
  { id: "vet", label: "Ветврач", eventType: "vet_visit", title: "Прием у ветеринара", icon: "🩺" },
  { id: "custom", label: "Другое", eventType: "other", title: "", icon: "✏️" },
];

const repeatOptions: Array<{ id: RepeatPreset; label: string }> = [
  { id: "day", label: "Через день" },
  { id: "three-days", label: "Через 3 дня" },
  { id: "week", label: "Через неделю" },
  { id: "month", label: "Через месяц" },
  { id: "custom", label: "Своя дата" },
];

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function formatPetEmoji(species: Pet["species"]) {
  if (species === "cat") return "🐱";
  if (species === "dog") return "🐶";
  return "🐾";
}

export default function ReminderCreateModal({
  open,
  selectedDate,
  pets,
  preferredPetId,
  onClose,
}: ReminderCreateModalProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [taskId, setTaskId] = useState(taskOptions[0].id);
  const [dateValue, setDateValue] = useState(toDateKey(selectedDate));
  const [timeValue, setTimeValue] = useState("08:00");
  const [repeatEnabled, setRepeatEnabled] = useState(false);
  const [repeatPreset, setRepeatPreset] = useState<RepeatPreset>("day");
  const [customRepeatDate, setCustomRepeatDate] = useState(toDateKey(addDays(selectedDate, 2)));
  const [repeatCount, setRepeatCount] = useState("2");
  const [customTitle, setCustomTitle] = useState("");
  const [selectedPetId, setSelectedPetId] = useState<string>(preferredPetId ?? pets[0]?.id ?? "");

  const selectedTask = useMemo(
    () => taskOptions.find((option) => option.id === taskId) ?? taskOptions[0],
    [taskId],
  );
  const selectedPet = useMemo(
    () => pets.find((pet) => pet.id === selectedPetId) ?? null,
    [pets, selectedPetId],
  );

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPetId) {
        throw new Error("Сначала выбери питомца");
      }

      const eventTitle =
        selectedTask.id === "custom"
          ? customTitle.trim()
          : selectedTask.title.trim();

      if (!eventTitle) {
        throw new Error("Добавь название задачи");
      }

      const baseDate = new Date(`${dateValue}T${timeValue}:00`);
      if (Number.isNaN(baseDate.getTime())) {
        throw new Error("Проверь дату и время напоминания");
      }

      const occurrences = Math.max(1, Number.parseInt(repeatCount, 10) || 1);
      const scheduleDates = [baseDate];

      if (repeatEnabled && occurrences > 1) {
        if (repeatPreset === "custom") {
          const customDate = new Date(`${customRepeatDate}T${timeValue}:00`);
          if (Number.isNaN(customDate.getTime()) || customDate <= baseDate) {
            throw new Error("Своя дата должна быть позже первой даты напоминания");
          }

          const diff = customDate.getTime() - baseDate.getTime();
          for (let index = 1; index < occurrences; index += 1) {
            scheduleDates.push(new Date(baseDate.getTime() + diff * index));
          }
        } else {
          for (let index = 1; index < occurrences; index += 1) {
            if (repeatPreset === "day") {
              scheduleDates.push(addDays(baseDate, index));
            }
            if (repeatPreset === "three-days") {
              scheduleDates.push(addDays(baseDate, index * 3));
            }
            if (repeatPreset === "week") {
              scheduleDates.push(addDays(baseDate, index * 7));
            }
            if (repeatPreset === "month") {
              scheduleDates.push(addMonths(baseDate, index));
            }
          }
        }
      }

      await Promise.all(
        scheduleDates.map((eventDate) =>
          createEvent({
            pet_id: selectedPetId,
            type: selectedTask.eventType,
            title: eventTitle,
            scheduled_at: zonedDateTimeToUtcIso(toDateKey(eventDate), timeValue),
          }),
        ),
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      showToast("Напоминание создано", "success");
      onClose();
    },
    onError: (error: Error) => {
      showToast(error.message || "Не удалось создать напоминание", "error");
    },
  });

  if (!open) return null;

  return (
    <div className="M-ReminderModal__overlay" onClick={onClose}>
      <div className="M-ReminderModal" onClick={(event) => event.stopPropagation()}>
        <div className="M-ReminderModal__header">
          <h2 className="M-ReminderModal__title">Новое напоминание</h2>
          <button
            type="button"
            className="M-ReminderModal__close"
            onClick={onClose}
            aria-label="Закрыть окно"
          >
            <X size={18} />
          </button>
        </div>

        <label className="M-ReminderModal__field">
          <span className="M-ReminderModal__label">Тип задачи</span>
          <div className="M-ReminderModal__selectWrap">
            <span className="M-ReminderModal__leadingIcon">{selectedTask.icon}</span>
            <select
              className="M-ReminderModal__select"
              value={taskId}
              onChange={(event) => setTaskId(event.target.value)}
            >
              {taskOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <img src={arrowIcon} alt="Открыть список" className="A-IconImage A-IconImage--sm M-ReminderModal__arrowDown" />
          </div>
        </label>

        {selectedTask.id === "custom" ? (
          <label className="M-ReminderModal__field">
            <span className="M-ReminderModal__label">Название задачи</span>
            <div className="M-ReminderModal__inputWrap">
              <input
                className="M-ReminderModal__input M-ReminderModal__input--singleLine"
                type="text"
                value={customTitle}
                onChange={(event) => setCustomTitle(event.target.value)}
                placeholder="Напиши свое название"
              />
            </div>
          </label>
        ) : null}

        <div className="M-ReminderModal__row">
          <label className="M-ReminderModal__field M-ReminderModal__field--half">
            <span className="M-ReminderModal__label">Дата</span>
            <div className="M-ReminderModal__inputWrap">
              <CalendarDays size={18} className="M-ReminderModal__decorIcon" />
              <input
                className="M-ReminderModal__input"
                type="date"
                value={dateValue}
                onChange={(event) => setDateValue(event.target.value)}
              />
              <img src={arrowIcon} alt="Открыть календарь" className="A-IconImage A-IconImage--sm M-ReminderModal__arrowDown" />
            </div>
          </label>

          <label className="M-ReminderModal__field M-ReminderModal__field--time">
            <span className="M-ReminderModal__label">Время</span>
            <div className="M-ReminderModal__inputWrap">
              <Clock3 size={18} className="M-ReminderModal__decorIcon" />
              <input
                className="M-ReminderModal__input"
                type="time"
                value={timeValue}
                onChange={(event) => setTimeValue(event.target.value)}
              />
              <img src={arrowIcon} alt="Открыть выбор времени" className="A-IconImage A-IconImage--sm M-ReminderModal__arrowDown" />
            </div>
          </label>
        </div>

        <div className="M-ReminderModal__field">
          <span className="M-ReminderModal__label">Повтор напоминания</span>
          <div className="M-ReminderModal__toggleRow">
            <span>{repeatEnabled ? "Повтор включен" : "Не повторять"}</span>
            <button
              type="button"
              role="switch"
              aria-checked={repeatEnabled}
              className={`M-ReminderModal__switch ${repeatEnabled ? "is-on" : ""}`}
              onClick={() => setRepeatEnabled((current) => !current)}
            >
              <span className="M-ReminderModal__switchThumb" />
            </button>
          </div>
        </div>

        {repeatEnabled ? (
          <div className="M-ReminderModal__repeatGrid">
            <label className="M-ReminderModal__field">
              <span className="M-ReminderModal__label">Через сколько</span>
              <div className="M-ReminderModal__selectWrap">
                <select
                  className="M-ReminderModal__select"
                  value={repeatPreset}
                  onChange={(event) => setRepeatPreset(event.target.value as RepeatPreset)}
                >
                  {repeatOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <img src={arrowIcon} alt="Открыть список повторов" className="A-IconImage A-IconImage--sm M-ReminderModal__arrowDown" />
              </div>
            </label>

            {repeatPreset === "custom" ? (
              <label className="M-ReminderModal__field">
                <span className="M-ReminderModal__label">Своя дата</span>
                <div className="M-ReminderModal__inputWrap">
                  <CalendarDays size={18} className="M-ReminderModal__decorIcon" />
                  <input
                    className="M-ReminderModal__input"
                    type="date"
                    value={customRepeatDate}
                    onChange={(event) => setCustomRepeatDate(event.target.value)}
                  />
                  <img src={arrowIcon} alt="Открыть календарь повторов" className="A-IconImage A-IconImage--sm M-ReminderModal__arrowDown" />
                </div>
              </label>
            ) : null}

            <label className="M-ReminderModal__field">
              <span className="M-ReminderModal__label">Сколько раз повторять</span>
              <div className="M-ReminderModal__inputWrap">
                <input
                  className="M-ReminderModal__input"
                  type="number"
                  min="1"
                  value={repeatCount}
                  onChange={(event) => setRepeatCount(event.target.value)}
                />
              </div>
            </label>
          </div>
        ) : null}

        <label className="M-ReminderModal__field">
          <span className="M-ReminderModal__label">Питомец</span>
          <div className="M-ReminderModal__selectWrap">
            <span className="M-ReminderModal__petPreview">
              {selectedPet ? formatPetEmoji(selectedPet.species) : "🐾"}
            </span>
            <select
              className="M-ReminderModal__select"
              value={selectedPetId}
              onChange={(event) => setSelectedPetId(event.target.value)}
            >
              {pets.map((pet) => (
                <option key={pet.id} value={pet.id}>
                  {pet.name}
                </option>
              ))}
            </select>
            <PencilLine size={18} className="M-ReminderModal__decorIcon" />
          </div>
        </label>

        <button
          type="button"
          className="M-ReminderModal__submit"
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending || !selectedPetId}
        >
          {createMutation.isPending ? "Создаю..." : "Создать напоминание"}
        </button>
      </div>
    </div>
  );
}

