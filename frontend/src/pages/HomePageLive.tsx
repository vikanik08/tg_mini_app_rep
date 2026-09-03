import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Star } from "lucide-react";
import { useDashboard } from "@/entities/dashboard/userDashboard";
import type {
  DashboardEvent,
  DashboardPet,
} from "@/entities/dashboard/api";
import {
  buildPassportPath,
  buildHealthCheckPath,
  buildProcedurePath,
  getActivePetId,
  pickActivePet,
  setActivePetId,
  syncActivePet,
} from "@/shared/lib/activePet";
import {
  formatDateKeyInUserTimezone,
  formatDateTimeInUserTimezone,
} from "@/shared/lib/dateTime";
import {
  trackButtonClick,
  trackEvent,
  trackFeatureUse,
} from "@/shared/analytics/metrica";
import {
  canAddPet,
  formatSubscriptionDaysLeft,
  formatSubscriptionStatus,
  getSubscriptionLabel,
  hasPremiumAccess,
} from "@/shared/lib/subscription";
import AppLayout from "../widgets/layout/AppLayout";
import DashboardPetCard from "../widgets/home/DashboardPetCard";
import DashboardUpcomingEvents from "../widgets/home/DashboardUpcomingEvents";
import DashboardMiniCalendar from "../widgets/home/DashboardMiniCalendar";
import ReminderCreateModal from "../widgets/calendar/ReminderCreateModal";
import "./home-page.css";
import plusIcon from "../shared/ui/icons/plus-icon.svg";

function formatGreetingName(
  user?: {
    first_name: string | null;
    username: string | null;
  },
) {
  return user?.first_name || user?.username || "пользователь";
}

function formatWeight(weight?: string | null) {
  if (!weight) return "вес не указан";
  return `${String(weight).replace(".", ",")} кг`;
}

function formatAge(birthdate?: string | null) {
  if (!birthdate) return "возраст не указан";

  const birth = new Date(birthdate);
  if (Number.isNaN(birth.getTime())) return "возраст не указан";

  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();

  if (now.getDate() < birth.getDate()) {
    months -= 1;
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  if (years > 0) {
    return `${years} ${years === 1 ? "год" : years < 5 ? "года" : "лет"}`;
  }

  if (months > 0) {
    return `${months} ${
      months === 1 ? "месяц" : months < 5 ? "месяца" : "месяцев"
    }`;
  }

  return "меньше месяца";
}

function formatShortDateTime(dateValue?: string | null) {
  if (!dateValue) return "";

  return formatDateTimeInUserTimezone(dateValue, {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPetStatus(pet: DashboardPet) {
  return pet.next_event
    ? "Есть запланированное событие"
    : "Событий пока нет";
}

function toDateKey(dateValue: string) {
  return formatDateKeyInUserTimezone(dateValue);
}

function mapUpcomingEvent(
  event: DashboardEvent,
  petName: string | undefined,
) {
  const eventDateKey = formatDateKeyInUserTimezone(event.scheduled_at);
  const weekday = formatDateTimeInUserTimezone(event.scheduled_at, {
    weekday: "short",
  });
  const day = formatDateTimeInUserTimezone(event.scheduled_at, {
    day: "numeric",
  });
  const time = formatDateTimeInUserTimezone(event.scheduled_at, {
    hour: "2-digit",
    minute: "2-digit",
  });

  const todayKey = formatDateKeyInUserTimezone(new Date().toISOString());
  const eventDay = new Date(`${eventDateKey}T12:00:00`);
  const currentDay = new Date(`${todayKey}T12:00:00`);
  const diffDays = Math.round(
    (eventDay.getTime() - currentDay.getTime()) / 86_400_000,
  );

  let subtitle = "";
  if (diffDays === 0) subtitle = "Сегодня";
  else if (diffDays === 1) subtitle = "Завтра";
  else if (diffDays > 1) subtitle = `через ${diffDays} дн.`;

  return {
    id: event.id,
    weekday,
    day,
    title: event.title,
    time,
    subtitle,
    petId: event.pet_id,
    petName: petName ?? "Питомец",
    isDone: event.is_done,
    passportPath: buildPassportPath(event.pet_id),
    editPath: `${buildProcedurePath("custom", event.pet_id)}?eventId=${event.id}&date=${toDateKey(event.scheduled_at)}`,
  };
}

export default function HomePageLive() {
  const { data, isLoading, isError } = useDashboard();
  const [selectedPetId, setSelectedPetId] = useState<string | null>(() =>
    getActivePetId(),
  );
  const [isCreateReminderOpen, setIsCreateReminderOpen] = useState(false);
  const [reminderDate, setReminderDate] = useState(() => new Date());
  const greetingName = formatGreetingName(data?.user);
  const pets = useMemo(() => data?.pets ?? [], [data?.pets]);
  const petsById = useMemo(
    () => new Map(pets.map((pet) => [pet.id, pet])),
    [pets],
  );
  const upcomingEvents = useMemo(
    () =>
      (data?.upcoming_events ?? []).map((event) =>
        mapUpcomingEvent(event, petsById.get(event.pet_id)?.name),
      ),
    [data?.upcoming_events, petsById],
  );
  const activePet = useMemo(() => {
    if (selectedPetId) {
      return pets.find((pet) => pet.id === selectedPetId) ?? pickActivePet(pets);
    }

    return pickActivePet(pets);
  }, [pets, selectedPetId]);
  const showFirstRunState = !isLoading && !isError && !activePet;
  const canCreatePet = canAddPet(pets.length, data?.user);
  const hasExtendedAccess = hasPremiumAccess(data?.user);
  const subscriptionStatus = formatSubscriptionStatus(data?.user);
  const subscriptionLabel = getSubscriptionLabel(data?.user);
  const subscriptionDaysLeft = formatSubscriptionDaysLeft(data?.user);

  useEffect(() => {
    syncActivePet(activePet ?? null);
  }, [activePet]);

  useEffect(() => {
    if (data?.user) {
      localStorage.setItem("current_user", JSON.stringify(data.user));
    }
  }, [data?.user]);

  function handleSelectPet(petId: string) {
    setSelectedPetId(petId);
    setActivePetId(petId);
    trackEvent("pet_switch", { pet_id: petId, source: "home" });
  }

  function openReminderModal(date = new Date()) {
    setReminderDate(date);
    setIsCreateReminderOpen(true);
    trackButtonClick("home_add_reminder");
    trackEvent("reminder_modal_open", {
      source: "home",
      date: date.toISOString().slice(0, 10),
    });
  }

  return (
    <AppLayout>
      <div className="P-Home">
        <header className="W-HomeHeader">
          <div className="A-HomeGreeting">{`Привет, ${greetingName}`}</div>

          <div className="W-HomeHeaderActions">
            <Link
              className="A-SubscriptionStatusButton"
              to="/subscriptions"
              onClick={() => {
                trackButtonClick("home_subscription_status");
                trackFeatureUse("subscriptions", "open", { source: "home_header_status" });
              }}
            >
              {subscriptionStatus}
            </Link>

            <Link
              className="A-HeaderCircleButton"
              to="/subscriptions"
              onClick={() => {
                trackButtonClick("home_subscription");
                trackFeatureUse("subscriptions", "open", { source: "home_header" });
              }}
            >
              <Star size={20} fill="#F6D35B" color="#F6D35B" />
            </Link>
          </div>
        </header>

        <Link
          className="A-SubscriptionSummary"
          to="/subscriptions"
          onClick={() => {
            trackButtonClick("home_subscription_summary");
            trackFeatureUse("subscriptions", "open", { source: "home_summary" });
          }}
        >
          <span className="A-SubscriptionSummary__label">Текущая подписка</span>
          <span className="A-SubscriptionSummary__title">{subscriptionLabel}</span>
          <span className="A-SubscriptionSummary__meta">{subscriptionDaysLeft}</span>
        </Link>

        <section className="W-HomeSection">
          <div className="W-SectionTitleRow">
            <h1 className="A-SectionTitle">Мои питомцы</h1>

            <Link
              className="A-SectionAddButton"
              to={canCreatePet ? "/passport/edit" : "/subscriptions"}
              onClick={() => {
                trackButtonClick("home_add_pet");
                trackFeatureUse(
                  canCreatePet ? "pet_form" : "subscriptions",
                  "open",
                  { source: "home_pets_section" },
                );
              }}
            >
              <img
                src={plusIcon}
                alt="Добавить"
                className="A-IconImage A-IconImage--md"
              />
            </Link>
          </div>

          {pets.length > 1 ? (
            <div className="W-PetSwitcher">
              {pets.map((pet) => (
                <button
                  key={pet.id}
                  type="button"
                  className={`A-PetSwitcherChip ${
                    activePet?.id === pet.id ? "is-active" : ""
                  }`}
                  onClick={() => handleSelectPet(pet.id)}
                >
                  {pet.name}
                </button>
              ))}
            </div>
          ) : null}

          {isLoading ? (
            <section className="O-PetCard">
              <div className="O-PetCard__meta">Загружаем питомца...</div>
            </section>
          ) : isError ? (
            <section className="O-PetCard">
              <div className="O-PetCard__meta">
                Не удалось загрузить главный экран.
              </div>
            </section>
          ) : activePet ? (
            <DashboardPetCard
              name={activePet.name}
              ageText={formatAge(activePet.birthdate)}
              weightText={formatWeight(activePet.weight_kg)}
              statusText={formatPetStatus(activePet)}
              eventLabel="Ближайшее событие:"
              eventTitle={
                activePet.next_event?.title || "Пока нет запланированных событий"
              }
              eventDate={formatShortDateTime(activePet.next_event?.scheduled_at)}
              nextCheckLabel="Следующие отслеживания:"
              nextCheckDate={formatShortDateTime(activePet.next_event?.scheduled_at)}
              imageUrl={activePet.photo_url ?? undefined}
              to={buildPassportPath(activePet.id)}
              onSelect={() => handleSelectPet(activePet.id)}
            />
          ) : (
            <section className="A-FirstRunCard">
              <p className="A-FirstRunCard__eyebrow">Первый запуск</p>
              <h3 className="A-FirstRunCard__title">Добавь первого питомца</h3>
              <p className="A-FirstRunCard__text">
                После этого на главной появятся паспорт, ближайшие события и
                напоминания по календарю.
              </p>

              <div className="A-FirstRunCard__steps">
                <div className="A-FirstRunCard__step">
                  <span>1</span>
                  <span>Заполни карточку питомца</span>
                </div>
                <div className="A-FirstRunCard__step">
                  <span>2</span>
                  <span>Сохрани первую процедуру или напоминание</span>
                </div>
                <div className="A-FirstRunCard__step">
                  <span>3</span>
                  <span>Проверь даты на главной и в календаре</span>
                </div>
              </div>

              <div className="A-FirstRunCard__actions">
                <Link
                  className="A-FirstRunCard__button"
                  to="/passport/edit"
                  onClick={() => {
                    trackButtonClick("first_run_add_pet");
                    trackFeatureUse("pet_form", "open", { source: "first_run" });
                  }}
                >
                  Добавить питомца
                </Link>
                <Link
                  className="A-FirstRunCard__button A-FirstRunCard__button--ghost"
                  to="/calendar"
                  onClick={() => {
                    trackButtonClick("first_run_open_calendar");
                    trackFeatureUse("calendar", "open", { source: "first_run" });
                  }}
                >
                  Открыть календарь
                </Link>
              </div>
            </section>
          )}
        </section>

        <section className="W-HomeSection">
          <div className="W-SectionTitleRow">
            <h2 className="A-SectionTitle">Ближайшие события</h2>

            {activePet ? (
              <button
                type="button"
                className="A-SectionAddButton"
                onClick={() => openReminderModal()}
              >
                <Plus size={22} />
              </button>
            ) : (
              <Link
                className="A-SectionAddButton"
                to="/passport/edit"
                onClick={() => {
                  trackButtonClick("home_events_add_without_pet");
                  trackFeatureUse("pet_form", "open", { source: "home_events_section" });
                }}
              >
                <Plus size={22} />
              </Link>
            )}
          </div>

          {isLoading ? (
            <section className="O-EventsCard">
              <div className="M-EventRow">
                <div className="M-EventRow__content">
                  <div className="M-EventRow__meta">Загружаем события...</div>
                </div>
              </div>
            </section>
          ) : isError ? (
            <section className="O-EventsCard">
              <div className="M-EventRow">
                <div className="M-EventRow__content">
                  <div className="M-EventRow__meta">
                    Не удалось загрузить ближайшие события.
                  </div>
                </div>
              </div>
            </section>
          ) : (
            <DashboardUpcomingEvents events={upcomingEvents} />
          )}
        </section>

        <section className="W-HomeSection">
          <DashboardMiniCalendar
            onAddReminder={activePet ? openReminderModal : undefined}
          />
        </section>

        {activePet ? (
          <section className="A-HealthSummaryCard">
            <div>
              <p className="A-HealthSummaryCard__eyebrow">Статистика здоровья</p>
              <h2 className="A-HealthSummaryCard__title">
                Замечай маленькие изменения раньше
              </h2>
              <p className="A-HealthSummaryCard__text">
                Раз в месяц отметь аппетит, воду, туалет, сон и активность.
                Эти записи помогут увидеть динамику и подготовиться к визиту к ветеринару.
              </p>
            </div>

            <Link
              className="A-HealthSummaryCard__button"
              to={hasExtendedAccess ? buildHealthCheckPath(activePet.id) : "/subscriptions"}
              onClick={() => {
                trackButtonClick("home_health_summary");
                trackFeatureUse(
                  hasExtendedAccess ? "health_check" : "subscriptions",
                  "open",
                  { source: "home_health_summary" },
                );
              }}
            >
              {hasExtendedAccess ? "Внести данные" : "Оформить подписку"}
            </Link>
          </section>
        ) : null}

        {showFirstRunState ? (
          <section className="A-TipCard">
            <p className="A-TipCard__title">Что будет дальше</p>
            <p className="A-TipCard__text">
              Как только появится первый питомец, главная начнет показывать его
              карточку, а календарь поможет быстро добавлять новые напоминания.
            </p>
          </section>
        ) : null}

        {activePet ? (
          <ReminderCreateModal
            key={`${activePet.id}-${reminderDate.toISOString()}`}
            open={isCreateReminderOpen}
            selectedDate={reminderDate}
            pets={pets.map((pet) => ({
              id: pet.id,
              name: pet.name,
              species:
                pet.species === "cat" || pet.species === "dog" || pet.species === "other"
                  ? pet.species
                  : "other",
            }))}
            preferredPetId={activePet.id}
            onClose={() => setIsCreateReminderOpen(false)}
          />
        ) : null}
      </div>
    </AppLayout>
  );
}
