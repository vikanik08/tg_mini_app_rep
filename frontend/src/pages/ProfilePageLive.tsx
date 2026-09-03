import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AppLayout from "../widgets/layout/AppLayout";
import { getEvents } from "../entities/event/api";
import { getPets } from "../entities/pet/api";
import { getCurrentUser, updateCurrentUser } from "../entities/user/api";
import type { AuthUser } from "../features/auth/api";
import {
  buildPassportEditPath,
  buildPassportPath,
  getActivePetId,
  pickActivePet,
  setActivePetId as persistActivePetId,
  syncActivePet,
} from "../shared/lib/activePet";
import {
  trackButtonClick,
  trackEvent,
  trackFeatureUse,
} from "../shared/analytics/metrica";
import { getPlatformDisplayName, getPlatformIdLabel } from "../shared/platform";
import { formatDateTimeInUserTimezone } from "../shared/lib/dateTime";
import {
  formatSubscriptionDaysLeft,
  formatSubscriptionExpiryDate,
  getSubscriptionLabel,
} from "../shared/lib/subscription";
import "./profile-page-live.css";

function readCurrentUser(): AuthUser | null {
  const raw = localStorage.getItem("current_user");

  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

function buildUserName(user: AuthUser | null) {
  if (!user) return "Пользователь";

  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
  if (fullName) return fullName;
  if (user.username) return `@${user.username}`;
  return `ID ${user.platform_user_id ?? user.telegram_id ?? "unknown"}`;
}

function buildInitials(user: AuthUser | null) {
  if (!user) return "U";

  const parts = [user.first_name, user.last_name].filter(Boolean);
  const initials = parts.map((item) => item![0]?.toUpperCase()).join("");
  if (initials) return initials.slice(0, 2);
  if (user.username) return user.username.slice(0, 2).toUpperCase();
  return getPlatformDisplayName(user.platform).slice(0, 2).toUpperCase();
}

function getLoginMode(user: AuthUser | null) {
  if (!user) {
    return import.meta.env.VITE_USE_DEV_LOGIN === "true" ? "Dev login" : "Platform login";
  }

  return `${getPlatformDisplayName(user.platform)} login`;
}

function formatDate(value: string) {
  return formatDateTimeInUserTimezone(value, {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatPetEmoji(species: "cat" | "dog" | "other") {
  if (species === "cat") return "🐱";
  if (species === "dog") return "🐶";
  return "🐾";
}

const timezoneOptions = [
  { value: "Europe/Moscow", label: "Москва (UTC+3)" },
  { value: "Europe/Kaliningrad", label: "Калининград (UTC+2)" },
  { value: "Europe/Samara", label: "Самара (UTC+4)" },
  { value: "Asia/Yekaterinburg", label: "Екатеринбург (UTC+5)" },
  { value: "Asia/Omsk", label: "Омск (UTC+6)" },
  { value: "Asia/Novosibirsk", label: "Новосибирск (UTC+7)" },
  { value: "Asia/Krasnoyarsk", label: "Красноярск (UTC+7)" },
  { value: "Asia/Irkutsk", label: "Иркутск (UTC+8)" },
  { value: "Asia/Yakutsk", label: "Якутск (UTC+9)" },
  { value: "Asia/Vladivostok", label: "Владивосток (UTC+10)" },
  { value: "Asia/Magadan", label: "Магадан (UTC+11)" },
  { value: "Asia/Kamchatka", label: "Камчатка (UTC+12)" },
  { value: "UTC", label: "UTC" },
];

export default function ProfilePageLive() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(() => readCurrentUser());
  const [filterMode, setFilterMode] = useState<"active" | "all">("active");

  const updateTimezoneMutation = useMutation({
    mutationFn: updateCurrentUser,
    onSuccess: async (updatedUser) => {
      setUser(updatedUser);
      localStorage.setItem("current_user", JSON.stringify(updatedUser));
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const petsQuery = useQuery({
    queryKey: ["pets"],
    queryFn: getPets,
  });

  const eventsQuery = useQuery({
    queryKey: ["events", "profile"],
    queryFn: () => getEvents(),
  });

  const userQuery = useQuery({
    queryKey: ["current-user"],
    queryFn: getCurrentUser,
  });

  const pets = useMemo(() => petsQuery.data ?? [], [petsQuery.data]);
  const [selectedPetId, setSelectedPetId] = useState<string | null>(() =>
    getActivePetId(),
  );
  const activePet = useMemo(() => {
    if (selectedPetId) {
      return pets.find((pet) => pet.id === selectedPetId) ?? pickActivePet(pets);
    }

    return pickActivePet(pets);
  }, [pets, selectedPetId]);
  const events = useMemo(() => eventsQuery.data ?? [], [eventsQuery.data]);

  useEffect(() => {
    syncActivePet(activePet);
  }, [activePet]);

  useEffect(() => {
    if (!userQuery.data) return;

    setUser(userQuery.data);
    localStorage.setItem("current_user", JSON.stringify(userQuery.data));
  }, [userQuery.data]);

  function handleSelectPet(petId: string) {
    setSelectedPetId(petId);
    persistActivePetId(petId);
    trackEvent("pet_switch", { pet_id: petId, source: "profile" });
  }

  function handleResetSession() {
    trackButtonClick("profile_reset_session");
    localStorage.removeItem("access_token");
    localStorage.removeItem("current_user");
    window.location.reload();
  }

  function handleTimezoneChange(timezone: string) {
    if (!user) return;

    setUser({ ...user, timezone });
    updateTimezoneMutation.mutate({ timezone });
    trackEvent("timezone_changed", { timezone });
  }

  const effectiveFilterMode = activePet ? filterMode : "all";
  const filteredEvents = useMemo(() => {
    if (effectiveFilterMode === "active" && activePet) {
      return events.filter((event) => event.pet_id === activePet.id);
    }

    return events;
  }, [events, effectiveFilterMode, activePet]);

  const completedEvents = filteredEvents.filter((event) => event.is_done);
  const upcomingEvents = filteredEvents
    .filter((event) => !event.is_done)
    .sort(
      (left, right) =>
        new Date(left.scheduled_at).getTime() - new Date(right.scheduled_at).getTime(),
    );

  const petsById = useMemo(
    () => new Map(pets.map((pet) => [pet.id, pet])),
    [pets],
  );

  const activePassportPath = activePet ? buildPassportPath(activePet.id) : "/passport";
  const activePassportEditPath = activePet
    ? buildPassportEditPath(activePet.id)
    : "/passport/edit";
  const primaryActionLabel = activePet ? "Открыть паспорт" : "Добавить питомца";
  const isInitialLoading = petsQuery.isLoading && eventsQuery.isLoading;
  const subscriptionLabel = getSubscriptionLabel(user);
  const subscriptionDaysLeft = formatSubscriptionDaysLeft(user);
  const subscriptionExpiryDate = formatSubscriptionExpiryDate(user);

  return (
    <AppLayout>
      <div className="P-ProfilePageLive">
        <section className="P-ProfilePageLive__hero">
          <div className="P-ProfilePageLive__avatar">{buildInitials(user)}</div>

          <div className="P-ProfilePageLive__heroBody">
            <p className="P-ProfilePageLive__eyebrow">Аккаунт</p>
            <h1 className="P-ProfilePageLive__title">{buildUserName(user)}</h1>
            <p className="P-ProfilePageLive__meta">
              {user?.username ? `@${user.username}` : "Без username"} • {getLoginMode(user)}
            </p>

            <div className="P-ProfilePageLive__pillRow">
              <span className="P-ProfilePageLive__pill">
                {user ? getPlatformIdLabel(user.platform) : "ID"}: {user?.platform_user_id ?? user?.telegram_id ?? "неизвестно"}
              </span>
            </div>

            <Link
              className="P-ProfilePageLive__subscriptionPanel"
              to="/subscriptions"
              onClick={() => {
                trackButtonClick("profile_subscription_panel");
                trackFeatureUse("subscriptions", "open", { source: "profile_panel" });
              }}
            >
              <span className="P-ProfilePageLive__subscriptionLabel">
                Текущая подписка
              </span>
              <span className="P-ProfilePageLive__subscriptionName">
                {subscriptionLabel}
              </span>
              <span className="P-ProfilePageLive__subscriptionMeta">
                {subscriptionDaysLeft}
                {subscriptionExpiryDate ? ` • до ${subscriptionExpiryDate}` : ""}
              </span>
            </Link>

            <label className="P-ProfilePageLive__timezoneField">
              <span>Часовой пояс для напоминаний</span>
              <select
                value={user?.timezone ?? "Europe/Moscow"}
                onChange={(event) => handleTimezoneChange(event.target.value)}
                disabled={updateTimezoneMutation.isPending || !user}
              >
                {timezoneOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        {isInitialLoading ? (
          <section className="P-ProfilePageLive__stats">
            <article className="P-ProfilePageLive__statCard P-ProfilePageLive__statCard--loading">
              <div className="P-ProfilePageLive__skeleton P-ProfilePageLive__skeleton--statValue" />
              <div className="P-ProfilePageLive__skeleton P-ProfilePageLive__skeleton--statLabel" />
            </article>

            <article className="P-ProfilePageLive__statCard P-ProfilePageLive__statCard--loading">
              <div className="P-ProfilePageLive__skeleton P-ProfilePageLive__skeleton--statValue" />
              <div className="P-ProfilePageLive__skeleton P-ProfilePageLive__skeleton--statLabel" />
            </article>

            <article className="P-ProfilePageLive__statCard P-ProfilePageLive__statCard--loading">
              <div className="P-ProfilePageLive__skeleton P-ProfilePageLive__skeleton--statValue" />
              <div className="P-ProfilePageLive__skeleton P-ProfilePageLive__skeleton--statLabel" />
            </article>
          </section>
        ) : (
          <section className="P-ProfilePageLive__stats">
            <article className="P-ProfilePageLive__statCard">
              <div className="P-ProfilePageLive__statValue">{pets.length}</div>
              <div className="P-ProfilePageLive__statLabel">Питомцев</div>
            </article>

            <article className="P-ProfilePageLive__statCard">
              <div className="P-ProfilePageLive__statValue">{upcomingEvents.length}</div>
              <div className="P-ProfilePageLive__statLabel">
                {effectiveFilterMode === "active" && activePet
                  ? `Напоминаний для ${activePet.name}`
                  : "Напоминаний"}
              </div>
            </article>

            <article className="P-ProfilePageLive__statCard">
              <div className="P-ProfilePageLive__statValue">{completedEvents.length}</div>
              <div className="P-ProfilePageLive__statLabel">
                {effectiveFilterMode === "active" && activePet
                  ? "Выполнено для активного"
                  : "Выполнено"}
              </div>
            </article>
          </section>
        )}

        <section className="P-ProfilePageLive__card">
          <div className="P-ProfilePageLive__sectionTop">
            <h2 className="P-ProfilePageLive__sectionTitle">Мои питомцы</h2>
            <Link
              className="P-ProfilePageLive__textLink"
              to={activePassportEditPath}
              onClick={() => {
                trackButtonClick("profile_edit_pet");
                trackFeatureUse("pet_form", "open", { source: "profile_pets" });
              }}
            >
              Изменить
            </Link>
          </div>

          {petsQuery.isLoading ? (
            <div className="P-ProfilePageLive__list">
              <article className="P-ProfilePageLive__listRow">
                <div className="P-ProfilePageLive__listCol">
                  <div className="P-ProfilePageLive__skeleton P-ProfilePageLive__skeleton--rowTitle" />
                  <div className="P-ProfilePageLive__skeleton P-ProfilePageLive__skeleton--rowMeta" />
                </div>
                <div className="P-ProfilePageLive__skeleton P-ProfilePageLive__skeleton--badge" />
              </article>
              <article className="P-ProfilePageLive__listRow">
                <div className="P-ProfilePageLive__listCol">
                  <div className="P-ProfilePageLive__skeleton P-ProfilePageLive__skeleton--rowTitle" />
                  <div className="P-ProfilePageLive__skeleton P-ProfilePageLive__skeleton--rowMeta" />
                </div>
                <div className="P-ProfilePageLive__skeleton P-ProfilePageLive__skeleton--badge" />
              </article>
            </div>
          ) : pets.length > 0 ? (
            <div className="P-ProfilePageLive__list">
              {pets.map((pet) => (
                <article key={pet.id} className="P-ProfilePageLive__listRow">
                  <div className="P-ProfilePageLive__petIdentity">
                    <span className="P-ProfilePageLive__petEmoji">
                      {formatPetEmoji(pet.species)}
                    </span>
                    <div className="P-ProfilePageLive__petCopy">
                      <h3 className="P-ProfilePageLive__rowTitle">{pet.name}</h3>
                    </div>
                  </div>

                  <button
                    type="button"
                    className={`P-ProfilePageLive__petBadge ${
                      activePet?.id === pet.id ? "is-active" : ""
                    }`}
                    onClick={() => handleSelectPet(pet.id)}
                  >
                    {activePet?.id === pet.id ? "Активный" : "Выбрать"}
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <div className="P-ProfilePageLive__emptyState">
              <p className="P-ProfilePageLive__emptyTitle">
                Профиль готов, теперь добавим первого питомца
              </p>
              <p className="P-ProfilePageLive__muted">
                После этого здесь появятся карточки питомцев, активный выбор и
                ближайшие события.
              </p>
              <div className="P-ProfilePageLive__actions">
                <Link
                  className="P-ProfilePageLive__actionButton"
                  to="/passport/edit"
                  onClick={() => {
                    trackButtonClick("profile_add_first_pet");
                    trackFeatureUse("pet_form", "open", { source: "profile_empty_state" });
                  }}
                >
                  Добавить питомца
                </Link>
                <Link
                  className="P-ProfilePageLive__actionButton P-ProfilePageLive__actionButton--ghost"
                  to="/calendar"
                  onClick={() => {
                    trackButtonClick("profile_open_calendar_empty");
                    trackFeatureUse("calendar", "open", { source: "profile_empty_state" });
                  }}
                >
                  Открыть календарь
                </Link>
              </div>
            </div>
          )}
        </section>

        {activePet ? (
          <section className="P-ProfilePageLive__card">
            <div className="P-ProfilePageLive__sectionTop">
              <h2 className="P-ProfilePageLive__sectionTitle">Фильтр событий</h2>
              <span className="P-ProfilePageLive__petTag">
                <span>{formatPetEmoji(activePet.species)}</span>
                <span>{activePet.name}</span>
              </span>
            </div>

            <div className="P-ProfilePageLive__filterRow">
              <button
                type="button"
                className={`P-ProfilePageLive__filterChip ${effectiveFilterMode === "active" ? "is-active" : ""}`}
                onClick={() => {
                  setFilterMode("active");
                  trackButtonClick("profile_filter_active_pet");
                  trackFeatureUse("profile_event_filter", "change", { mode: "active" });
                }}
              >
                Активный питомец
              </button>
              <button
                type="button"
                className={`P-ProfilePageLive__filterChip ${effectiveFilterMode === "all" ? "is-active" : ""}`}
                onClick={() => {
                  setFilterMode("all");
                  trackButtonClick("profile_filter_all_pets");
                  trackFeatureUse("profile_event_filter", "change", { mode: "all" });
                }}
              >
                Все питомцы
              </button>
            </div>
          </section>
        ) : null}

        <section className="P-ProfilePageLive__card">
          <div className="P-ProfilePageLive__sectionTop">
            <h2 className="P-ProfilePageLive__sectionTitle">Ближайшие записи</h2>
            <Link
              className="P-ProfilePageLive__textLink"
              to="/calendar"
              onClick={() => {
                trackButtonClick("profile_to_calendar");
                trackFeatureUse("calendar", "open", { source: "profile_upcoming" });
              }}
            >
              К календарю
            </Link>
          </div>

          {eventsQuery.isLoading ? (
            <div className="P-ProfilePageLive__list">
              <article className="P-ProfilePageLive__listRow">
                <div className="P-ProfilePageLive__listCol">
                  <div className="P-ProfilePageLive__skeleton P-ProfilePageLive__skeleton--rowTitle" />
                  <div className="P-ProfilePageLive__skeleton P-ProfilePageLive__skeleton--rowMeta" />
                </div>
                <div className="P-ProfilePageLive__skeleton P-ProfilePageLive__skeleton--badge" />
              </article>
              <article className="P-ProfilePageLive__listRow">
                <div className="P-ProfilePageLive__listCol">
                  <div className="P-ProfilePageLive__skeleton P-ProfilePageLive__skeleton--rowTitle" />
                  <div className="P-ProfilePageLive__skeleton P-ProfilePageLive__skeleton--rowMeta" />
                </div>
                <div className="P-ProfilePageLive__skeleton P-ProfilePageLive__skeleton--badge" />
              </article>
            </div>
          ) : upcomingEvents.length > 0 ? (
            <div className="P-ProfilePageLive__list">
              {upcomingEvents.slice(0, 4).map((event) => {
                const eventPet = petsById.get(event.pet_id);

                return (
                  <article
                    key={event.id}
                    className="P-ProfilePageLive__listRow P-ProfilePageLive__listRow--event"
                  >
                    <div className="P-ProfilePageLive__eventCopy">
                      <h3 className="P-ProfilePageLive__eventTitle">{event.title}</h3>
                      {effectiveFilterMode === "all" && eventPet ? (
                        <p className="P-ProfilePageLive__eventPet">
                          {formatPetEmoji(eventPet.species)} {eventPet.name}
                        </p>
                      ) : null}
                    </div>
                    <div className="P-ProfilePageLive__eventSide">
                      <span className="P-ProfilePageLive__eventDate">{formatDate(event.scheduled_at)}</span>
                      <Link
                        className="P-ProfilePageLive__eventAction"
                        to="/calendar"
                        onClick={() => {
                          trackButtonClick("profile_upcoming_add");
                          trackFeatureUse("calendar", "open", { source: "profile_upcoming_item" });
                        }}
                      >
                        Добавить
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="P-ProfilePageLive__emptyState">
              <p className="P-ProfilePageLive__emptyTitle">
                {effectiveFilterMode === "active" && activePet
                  ? `Для ${activePet.name} пока нет ближайших напоминаний`
                  : "Ближайших напоминаний пока нет"}
              </p>
              <p className="P-ProfilePageLive__muted">
                {effectiveFilterMode === "active" && activePet
                  ? "Добавь первое напоминание из календаря или из карточки питомца."
                  : "Создай первое напоминание, и оно сразу появится здесь."}
              </p>
              <div className="P-ProfilePageLive__actions">
                <Link
                  className="P-ProfilePageLive__actionButton"
                  to="/calendar"
                  onClick={() => {
                    trackButtonClick("profile_add_reminder_empty");
                    trackFeatureUse("calendar", "open", { source: "profile_empty_upcoming" });
                  }}
                >
                  Добавить напоминание
                </Link>
                <Link
                  className="P-ProfilePageLive__actionButton P-ProfilePageLive__actionButton--ghost"
                  to={activePassportPath}
                  onClick={() => {
                    trackButtonClick("profile_go_to_passport_empty");
                    trackFeatureUse("passport", "open", { source: "profile_empty_upcoming" });
                  }}
                >
                  Перейти в паспорт
                </Link>
              </div>
            </div>
          )}
        </section>

        <section className="P-ProfilePageLive__card">
          <div className="P-ProfilePageLive__sectionTop">
            <h2 className="P-ProfilePageLive__sectionTitle">Действия</h2>
          </div>

          <div className="P-ProfilePageLive__actions">
            <Link
              className="P-ProfilePageLive__actionButton"
              to={activePassportPath}
              onClick={() => {
                trackButtonClick("profile_open_passport");
                trackFeatureUse("passport", "open", { source: "profile_actions" });
              }}
            >
              {primaryActionLabel}
            </Link>
            <Link
              className="P-ProfilePageLive__actionButton"
              to="/calendar"
              onClick={() => {
                trackButtonClick("profile_open_calendar");
                trackFeatureUse("calendar", "open", { source: "profile_actions" });
              }}
            >
              Открыть календарь
            </Link>
            <button
              type="button"
              className="P-ProfilePageLive__actionButton P-ProfilePageLive__actionButton--ghost"
              onClick={handleResetSession}
            >
              Сбросить сессию
            </button>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
