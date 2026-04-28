import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getPets } from "../entities/pet/api";
import { trackButtonClick, trackEvent, trackFeatureUse } from "../shared/analytics/metrica";
import AppLayout from "../widgets/layout/AppLayout";
import CalendarHeaderLive from "../widgets/calendar/CalendarHeaderLive";
import MonthCalendarLive from "../widgets/calendar/MonthCalendarLive";
import ReminderCreateModal from "../widgets/calendar/ReminderCreateModal";
import TodayRemindersLive from "../widgets/calendar/TodayRemindersLive";
import { getActivePetId, pickActivePet } from "../shared/lib/activePet";
import "./calendar-page.css";

function parseDateParam(value: string | null) {
  if (!value) return new Date();

  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return new Date();
  return date;
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function CalendarPageLive() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedDate = searchParams.get("date");
  const [selectedDate, setSelectedDate] = useState(() => parseDateParam(requestedDate));
  const [filterMode, setFilterMode] = useState<"active" | "all">("active");
  const [isCreateReminderOpen, setIsCreateReminderOpen] = useState(false);
  const [reminderDate, setReminderDate] = useState(() => parseDateParam(requestedDate));

  const petsQuery = useQuery({
    queryKey: ["pets"],
    queryFn: getPets,
  });

  useEffect(() => {
    setSelectedDate(parseDateParam(requestedDate));
  }, [requestedDate]);

  useEffect(() => {
    setReminderDate(parseDateParam(requestedDate));
  }, [requestedDate]);

  const activePet = useMemo(() => {
    const pets = petsQuery.data ?? [];
    const activePetId = getActivePetId();

    if (activePetId) {
      return pets.find((pet) => pet.id === activePetId) ?? pickActivePet(pets);
    }

    return pickActivePet(pets);
  }, [petsQuery.data]);

  useEffect(() => {
    if (!activePet) {
      setFilterMode("all");
    }
  }, [activePet]);

  function handleSelectDate(date: Date) {
    setSelectedDate(date);
    setSearchParams({ date: toDateKey(date) }, { replace: true });
    trackEvent("calendar_day_selected", {
      source: "calendar_page",
      date: toDateKey(date),
    });
  }

  function openReminderForDate(date: Date) {
    handleSelectDate(date);
    setReminderDate(date);
    setIsCreateReminderOpen(true);
    trackButtonClick("calendar_add_reminder");
    trackEvent("reminder_modal_open", {
      source: "calendar_page",
      date: toDateKey(date),
    });
  }

  const selectedDateKey = useMemo(() => toDateKey(selectedDate), [selectedDate]);
  const filteredPetId = filterMode === "active" ? activePet?.id ?? null : null;

  return (
    <AppLayout>
      <div className="P-Calendar">
        <CalendarHeaderLive />

        {petsQuery.isLoading ? (
          <section className="P-Calendar__filterCard P-Calendar__filterCard--loading">
            <div className="P-Calendar__skeleton P-Calendar__skeleton--title" />
            <div className="P-Calendar__filterRow">
              <div className="P-Calendar__skeleton P-Calendar__skeleton--chip" />
              <div className="P-Calendar__skeleton P-Calendar__skeleton--chip" />
            </div>
          </section>
        ) : activePet ? (
          <section className="P-Calendar__filterCard">
            <div className="P-Calendar__filterTop">
              <h2 className="P-Calendar__filterTitle">Показывать события</h2>
              <span className="P-Calendar__filterMeta">{activePet.name}</span>
            </div>

            <div className="P-Calendar__filterRow">
              <button
                type="button"
                className={`P-Calendar__filterChip ${filterMode === "active" ? "is-active" : ""}`}
                onClick={() => {
                  setFilterMode("active");
                  trackButtonClick("calendar_filter_active_pet");
                  trackFeatureUse("calendar_filter", "change", { mode: "active" });
                }}
              >
                Активный питомец
              </button>
              <button
                type="button"
                className={`P-Calendar__filterChip ${filterMode === "all" ? "is-active" : ""}`}
                onClick={() => {
                  setFilterMode("all");
                  trackButtonClick("calendar_filter_all_pets");
                  trackFeatureUse("calendar_filter", "change", { mode: "all" });
                }}
              >
                Все питомцы
              </button>
            </div>
          </section>
        ) : null}

        <section className="P-Calendar__calendarSection">
          <MonthCalendarLive
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
            onAddReminder={openReminderForDate}
            petId={filteredPetId}
          />
        </section>

        <section className="P-Calendar__remindersSection">
          <TodayRemindersLive
            key={`${selectedDateKey}-${filteredPetId ?? "all"}`}
            selectedDate={selectedDate}
            petId={filteredPetId}
            onAddReminder={openReminderForDate}
          />
        </section>

        {isCreateReminderOpen ? (
          <ReminderCreateModal
            key={`${toDateKey(reminderDate)}-${filteredPetId ?? activePet?.id ?? "all"}`}
            open={isCreateReminderOpen}
            selectedDate={reminderDate}
            pets={petsQuery.data ?? []}
            preferredPetId={filteredPetId ?? activePet?.id ?? null}
            onClose={() => setIsCreateReminderOpen(false)}
          />
        ) : null}
      </div>
    </AppLayout>
  );
}
