import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AppLayout from "../widgets/layout/AppLayout";
import { getEvents } from "../entities/event/api";
import { getPets } from "../entities/pet/api";
import { updateCurrentUser } from "../entities/user/api";
import type { AuthUser } from "../features/auth/api";
import {
  buildPassportEditPath,
  buildPassportPath,
  getActivePetId,
  pickActivePet,
  setActivePetId as persistActivePetId,
  syncActivePet,
} from "../shared/lib/activePet";
import { formatDateTimeInUserTimezone } from "../shared/lib/dateTime";
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
  return `ID ${user.telegram_id}`;
}

function buildInitials(user: AuthUser | null) {
  if (!user) return "U";

  const parts = [user.first_name, user.last_name].filter(Boolean);
  const initials = parts.map((item) => item![0]?.toUpperCase()).join("");
  if (initials) return initials.slice(0, 2);
  if (user.username) return user.username.slice(0, 2).toUpperCase();
  return "TG";
}

function getLoginMode() {
  return import.meta.env.VITE_USE_DEV_LOGIN === "true" ? "Dev login" : "Telegram login";
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

  function handleSelectPet(petId: string) {
    setSelectedPetId(petId);
    persistActivePetId(petId);
  }

  function handleResetSession() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("current_user");
    window.location.reload();
  }

  function handleTimezoneChange(timezone: string) {
    if (!user) return;

    setUser({ ...user, timezone });
    updateTimezoneMutation.mutate({ timezone });
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

  return (
    <AppLayout>
      <div className="P-ProfilePageLive">
        <section className="P-ProfilePageLive__hero">
          <div className="P-ProfilePageLive__avatar">{buildInitials(user)}</div>

          <div className="P-ProfilePageLive__heroBody">
            <p className="P-ProfilePageLive__eyebrow">Аккаунт</p>
            <h1 className="P-ProfilePageLive__title">{buildUserName(user)}</h1>
            <p className="P-ProfilePageLive__meta">
              {user?.username ? `@${user.username}` : "Без username"} • {getLoginMode()}
            </p>

            <div className="P-ProfilePageLive__pillRow">
              <span className="P-ProfilePageLive__pill">
                Telegram ID: {user?.telegram_id ?? "неизвестно"}
              </span>
            </div>

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
            <Link className="P-ProfilePageLive__textLink" to={activePassportEditPath}>
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
                <Link className="P-ProfilePageLive__actionButton" to="/passport/edit">
                  Добавить питомца
                </Link>
                <Link
                  className="P-ProfilePageLive__actionButton P-ProfilePageLive__actionButton--ghost"
                  to="/calendar"
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
                onClick={() => setFilterMode("active")}
              >
                Активный питомец
              </button>
              <button
                type="button"
                className={`P-ProfilePageLive__filterChip ${effectiveFilterMode === "all" ? "is-active" : ""}`}
                onClick={() => setFilterMode("all")}
              >
                Все питомцы
              </button>
            </div>
          </section>
        ) : null}

        <section className="P-ProfilePageLive__card">
          <div className="P-ProfilePageLive__sectionTop">
            <h2 className="P-ProfilePageLive__sectionTitle">Ближайшие записи</h2>
            <Link className="P-ProfilePageLive__textLink" to="/calendar">
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
                      <Link className="P-ProfilePageLive__eventAction" to="/calendar">
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
                <Link className="P-ProfilePageLive__actionButton" to="/calendar">
                  Добавить напоминание
                </Link>
                <Link
                  className="P-ProfilePageLive__actionButton P-ProfilePageLive__actionButton--ghost"
                  to={activePassportPath}
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
            <Link className="P-ProfilePageLive__actionButton" to={activePassportPath}>
              {primaryActionLabel}
            </Link>
            <Link className="P-ProfilePageLive__actionButton" to="/calendar">
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
