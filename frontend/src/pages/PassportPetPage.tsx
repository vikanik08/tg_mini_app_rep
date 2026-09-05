import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AppLayout from "../widgets/layout/AppLayout";
import {
  completeEvent,
  deleteEvent,
  getEvents,
  type EventItem,
  uncompleteEvent,
} from "../entities/event/api";
import { getPetById, getPets, type Pet } from "../entities/pet/api";
import {
  buildPetTransferLinks,
  createPetTransfer,
  type PetTransfer,
} from "../entities/petTransfer/api";
import {
  buildPassportEditPath,
  buildHealthCheckPath,
  buildProcedurePath,
  ensureActivePet,
  setActivePetId,
} from "../shared/lib/activePet";
import {
  trackButtonClick,
  trackEvent,
  trackFeatureUse,
} from "../shared/analytics/metrica";
import { formatHealthFeatureNotes } from "../shared/lib/healthFeatures";
import { openPassportPdf } from "../shared/lib/passportPdf";
import { hasBreederAccess, hasPremiumAccess } from "../shared/lib/subscription";
import { useToast } from "../shared/ui/useToast";
import "./passport-page-live.css";

const procedureLinkDefs = [
  { label: "Блохи", type: "fleas" },
  { label: "Глисты", type: "worms" },
  { label: "Вакцина", type: "rabies" },
  { label: "Ветврач", type: "vet" },
] as const;

function formatDate(value: string | null | undefined) {
  if (!value) return "Нет";

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function formatSpecies(pet: Pet) {
  if (pet.species === "cat") return "Кошка";
  if (pet.species === "dog") return "Собака";
  return pet.species_label || "Другой питомец";
}

function formatSex(sex: Pet["sex"]) {
  if (sex === "male") return "Мальчик";
  if (sex === "female") return "Девочка";
  return "Не указан";
}

function formatAgeCompact(birthdate: string | null) {
  if (!birthdate) return "Возраст не указан";

  const today = new Date();
  const date = new Date(birthdate);
  let years = today.getFullYear() - date.getFullYear();
  const monthDiff = today.getMonth() - date.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
    years -= 1;
  }

  if (years <= 0) return "меньше года";
  if (years === 1) return "1 год";
  if (years < 5) return `${years} года`;
  return `${years} лет`;
}

function toDateKey(dateValue: string) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getSortedEvents(events: EventItem[] | undefined) {
  return [...(events ?? [])].sort(
    (left, right) =>
      new Date(right.scheduled_at).getTime() - new Date(left.scheduled_at).getTime(),
  );
}

function getLatestEventByType(events: EventItem[], type: EventItem["type"]) {
  return events.find((event) => event.type === type);
}

function getLatestParasiteDate(pet: Pet, events: EventItem[]) {
  const fromPet = [pet.flea_treatment_date, pet.worm_treatment_date].filter(Boolean) as string[];
  const fromEvents = events
    .filter((event) => event.type === "flea_treatment")
    .map((event) => event.scheduled_at);
  const allDates = [...fromPet, ...fromEvents].sort();
  return allDates.at(-1) ?? null;
}

function getDisplayWeight(weight: string | null) {
  if (!weight) return "Нет";
  return `${String(weight).replace(".", ",")} кг`;
}

function MedicalBullet({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="P-PassportLive__medicalBullet">
      <span className="P-PassportLive__medicalDot" />
      <div>
        <div className="P-PassportLive__medicalTitle">{title}</div>
        <div className="P-PassportLive__medicalValue">{value}</div>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="P-PassportLive__infoRow">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function CollapsibleMedicalRow({
  title,
  summary,
  details,
}: {
  title: string;
  summary: string;
  details: string[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const hasDetails = details.length > 0;

  return (
    <div className={`P-PassportLive__collapse ${isOpen ? "is-open" : ""}`}>
      <button
        type="button"
        className="P-PassportLive__collapseButton"
        onClick={() => setIsOpen((current) => !current)}
        disabled={!hasDetails}
        aria-expanded={isOpen}
      >
        <span>{title}</span>
        <strong>{summary}</strong>
      </button>

      {isOpen && hasDetails ? (
        <div className="P-PassportLive__collapseBody">
          {details.map((item) => (
            <span key={item} className="P-PassportLive__collapseChip">
              {item}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PassportSkeleton() {
  return (
    <AppLayout>
      <div className="P-PassportLive">
        <section className="P-PassportLive__header">
          <div className="P-PassportLive__headerBlock">
            <div className="P-PassportLive__skeleton P-PassportLive__skeleton--eyebrow" />
            <div className="P-PassportLive__skeleton P-PassportLive__skeleton--title" />
          </div>
          <div className="P-PassportLive__skeleton P-PassportLive__skeleton--button" />
        </section>

        <section className="P-PassportLive__heroCard">
          <div className="P-PassportLive__skeleton P-PassportLive__skeleton--photo" />
          <div className="P-PassportLive__heroBody">
            <div className="P-PassportLive__skeleton P-PassportLive__skeleton--name" />
            <div className="P-PassportLive__skeleton P-PassportLive__skeleton--line" />
          </div>
        </section>

        <section className="P-PassportLive__card P-PassportLive__card--loading">
          <div className="P-PassportLive__skeleton P-PassportLive__skeleton--detail" />
          <div className="P-PassportLive__skeleton P-PassportLive__skeleton--detail" />
          <div className="P-PassportLive__skeleton P-PassportLive__skeleton--detail" />
          <div className="P-PassportLive__skeleton P-PassportLive__skeleton--detail" />
        </section>
      </div>
    </AppLayout>
  );
}

export default function PassportPetPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [petTransfer, setPetTransfer] = useState<PetTransfer | null>(null);
  const params = useParams();
  const petId = params.petId;

  const petsQuery = useQuery({
    queryKey: ["pets"],
    queryFn: getPets,
  });

  const petQuery = useQuery({
    queryKey: ["pet", petId],
    queryFn: () => getPetById(petId!),
    enabled: Boolean(petId),
  });

  const pet = petQuery.data ?? null;

  useEffect(() => {
    ensureActivePet(pet);
  }, [pet]);

  const eventsQuery = useQuery({
    queryKey: ["events", "pet", pet?.id],
    queryFn: () => getEvents({ pet_id: pet!.id }),
    enabled: Boolean(pet?.id),
  });

  const sortedEvents = useMemo(
    () => getSortedEvents(eventsQuery.data),
    [eventsQuery.data],
  );

  const procedureLinks = useMemo(
    () =>
      pet
        ? procedureLinkDefs.map((item) => ({
            label: item.label,
            to: buildProcedurePath(item.type, pet.id),
          }))
        : [],
    [pet],
  );

  const latestVaccine = pet?.vaccination_date ?? getLatestEventByType(sortedEvents, "vaccine")?.scheduled_at ?? null;
  const latestParasiteTreatment = pet ? getLatestParasiteDate(pet, sortedEvents) : null;
  const healthFeatureDetails = useMemo(
    () => formatHealthFeatureNotes(pet?.chronic_conditions_notes),
    [pet?.chronic_conditions_notes],
  );
  const surgeryDetails = pet?.surgeries_notes ? [pet.surgeries_notes] : [];
  const hasExtendedPassport = hasPremiumAccess();
  const hasBreederPassport = hasBreederAccess();
  const petTransferLinks = useMemo(
    () => (petTransfer ? buildPetTransferLinks(petTransfer.token) : null),
    [petTransfer],
  );
  const createTransferMutation = useMutation({
    mutationFn: async () => createPetTransfer(pet!.id),
    onSuccess: (transfer) => {
      setPetTransfer(transfer);
      trackEvent("pet_transfer_created", { pet_id: transfer.pet_id });
      showToast("Ссылка передачи готова", "success");
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Не удалось создать ссылку передачи";
      showToast(message, "error");
    },
  });
  const toggleDoneMutation = useMutation({
    mutationFn: async ({
      eventId,
      isDone,
    }: {
      eventId: string;
      isDone: boolean;
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
          ? "Событие снова в плане"
          : "Событие отмечено выполненным",
        "success",
      );
    },
    onError: () => {
      showToast("Не удалось обновить статус события", "error");
    },
  });
  const deleteMutation = useMutation({
    mutationFn: async (eventId: string) => {
      await deleteEvent(eventId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      showToast("Событие удалено", "success");
    },
    onError: () => {
      showToast("Не удалось удалить событие", "error");
    },
  });

  if (petsQuery.isLoading || petQuery.isLoading) {
    return <PassportSkeleton />;
  }

  if (petsQuery.isError || petQuery.isError) {
    return (
      <AppLayout>
        <div className="P-PassportLive">
          <section className="P-PassportLive__stateCard">
            <h1 className="P-PassportLive__title">Ветпаспорт</h1>
            <p className="P-PassportLive__stateText">
              Не получилось загрузить питомца. Проверь API и авторизацию.
            </p>
            <Link className="P-PassportLive__primaryAction" to="/passport/edit">
              Открыть форму
            </Link>
          </section>
        </div>
      </AppLayout>
    );
  }

  if (!pet) {
    return (
      <AppLayout>
        <div className="P-PassportLive">
          <section className="P-PassportLive__stateCard">
            <h1 className="P-PassportLive__title">Ветпаспорт</h1>
            <p className="P-PassportLive__stateText">
              Такой питомец не найден. Можно создать нового или выбрать другого в профиле.
            </p>
            <Link className="P-PassportLive__primaryAction" to="/passport/edit">
              Добавить питомца
            </Link>
          </section>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="P-PassportLive">
        <header className="P-PassportLive__header">
          <div>
            <h1 className="P-PassportLive__title">Ветпаспорт</h1>
          </div>

          <div className="P-PassportLive__headerActions">
            <button
              type="button"
              className="P-PassportLive__ghostAction"
              disabled={isExportingPdf}
              onClick={async () => {
                trackButtonClick("passport_export_pdf");
                if (!hasExtendedPassport) {
                  trackEvent("passport_pdf_blocked_basic_plan", { pet_id: pet.id });
                  showToast("Экспорт PDF доступен в подписке Премиум, Семейная или Заводчик", "error");
                  navigate("/subscriptions");
                  return;
                }

                const pdfWindow = window.open("", "_blank");
                if (pdfWindow) {
                  pdfWindow.document.write(
                    "<!doctype html><title>SmartPet PDF</title><body style=\"font-family: sans-serif; padding: 24px;\">Готовим PDF...</body>",
                  );
                }

                setIsExportingPdf(true);
                try {
                  await openPassportPdf(pet, sortedEvents, pdfWindow);
                  showToast("PDF готов", "success");
                } catch (error) {
                  if (pdfWindow && !pdfWindow.closed) {
                    pdfWindow.close();
                  }
                  showToast(
                    error instanceof Error ? error.message : "Не удалось открыть экспорт",
                    "error",
                  );
                } finally {
                  setIsExportingPdf(false);
                }
              }}
            >
              {isExportingPdf ? "Готовим PDF..." : "Экспорт PDF"}
            </button>

            <Link
              className="P-PassportLive__ghostAction"
              to={buildPassportEditPath(pet.id)}
              onClick={() => {
                trackButtonClick("passport_edit");
                trackFeatureUse("pet_form", "open", { source: "passport_header" });
              }}
            >
              Изменить
            </Link>

            <button
              type="button"
              className="P-PassportLive__ghostAction"
              disabled={createTransferMutation.isPending}
              onClick={() => {
                trackButtonClick("passport_transfer_pet");
                if (!hasBreederPassport) {
                  showToast("Передача питомца доступна в тарифе Заводчик", "error");
                  navigate("/subscriptions");
                  return;
                }

                createTransferMutation.mutate();
              }}
            >
              {createTransferMutation.isPending ? "Готовим ссылку..." : "Передать"}
            </button>
          </div>
        </header>

        {petsQuery.data && petsQuery.data.length > 1 ? (
          <section className="P-PassportLive__card">
            <div className="P-PassportLive__sectionTop">
              <h3 className="P-PassportLive__cardTitle">Питомцы</h3>
              <span className="P-PassportLive__counter">{petsQuery.data.length}</span>
            </div>

            <div className="P-PassportLive__petTabs">
              {petsQuery.data.map((item) => (
                <Link
                  key={item.id}
                  className={`P-PassportLive__petTab ${item.id === pet.id ? "is-active" : ""}`}
                  to={`/passport/${item.id}`}
                  onClick={() => {
                    setActivePetId(item.id);
                    trackEvent("pet_switch", { pet_id: item.id, source: "passport" });
                  }}
                >
                  <span className="P-PassportLive__petTabEmoji">
                    {item.species === "cat" ? "🐱" : item.species === "dog" ? "🐶" : "🐾"}
                  </span>
                  <span>{item.name}</span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section className="P-PassportLive__heroCard">
          <div className="P-PassportLive__photoWrap">
            {pet.photo_url ? (
              <img
                className="P-PassportLive__photo"
                src={pet.photo_url}
                alt={pet.name}
              />
            ) : (
              <div className="P-PassportLive__photo P-PassportLive__photo--empty">
                {pet.name.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>

          <div className="P-PassportLive__heroBody">
            <h2 className="P-PassportLive__petName">{pet.name}</h2>
            <p className="P-PassportLive__petMeta">
              {formatAgeCompact(pet.birthdate)} • {getDisplayWeight(pet.weight_kg)}
            </p>
          </div>
        </section>

        {petTransfer && petTransferLinks ? (
          <section className="P-PassportLive__card">
            <div className="P-PassportLive__sectionTop">
              <h3 className="P-PassportLive__cardTitle">Передача питомца</h3>
              <span className="P-PassportLive__counter">14 дней</span>
            </div>
            <p className="P-PassportLive__stateText">
              Отправьте ссылку новому владельцу. После принятия {pet.name} переедет в его
              аккаунт вместе с напоминаниями и историей здоровья.
            </p>
            <div className="P-PassportLive__linkStack">
              <a href={petTransferLinks.telegram}>Открыть через Telegram</a>
              <a href={petTransferLinks.vk}>Открыть через VK</a>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard?.writeText(petTransferLinks.web);
                  showToast("Ссылка скопирована", "success");
                }}
              >
                Скопировать обычную ссылку
              </button>
            </div>
          </section>
        ) : null}

        <section className="P-PassportLive__card">
          <InfoRow label="Питомец" value={formatSpecies(pet)} />
          <InfoRow label="Пол" value={formatSex(pet.sex)} />
          <InfoRow label="Порода" value={pet.breed || "Не указано"} />
          <InfoRow label="Окрас" value={pet.color || "Не указано"} />
          <InfoRow label="Дата рождения" value={formatDate(pet.birthdate)} />
        </section>

        <section className="P-PassportLive__card">
          <div className="P-PassportLive__sectionTop">
            <h3 className="P-PassportLive__cardTitle">Медицинская информация</h3>
            <Link
              className="P-PassportLive__textLink"
              to={buildPassportEditPath(pet.id)}
              onClick={() => {
                trackButtonClick("passport_medical_edit");
                trackFeatureUse("pet_form", "open", { source: "passport_medical" });
              }}
            >
              Изменить
            </Link>
          </div>

          <InfoRow label="Вес" value={getDisplayWeight(pet.weight_kg)} />

          <MedicalBullet
            title={pet.sex === "female" ? "Стерилизована" : "Кастрирован"}
            value={pet.is_neutered ? "Да" : "Нет"}
          />
          <MedicalBullet
            title="Вакцинация"
            value={latestVaccine ? formatDate(latestVaccine) : "Нет данных"}
          />
          <MedicalBullet
            title="Обработка от паразитов"
            value={latestParasiteTreatment ? formatDate(latestParasiteTreatment) : "Нет данных"}
          />

          <CollapsibleMedicalRow
            title="Особенности здоровья"
            summary={pet.has_chronic_conditions ? `${healthFeatureDetails.length || 1} выбрано` : "Нет"}
            details={pet.has_chronic_conditions ? healthFeatureDetails : []}
          />
          <CollapsibleMedicalRow
            title="Операции"
            summary={pet.had_surgeries ? "Есть" : "Нет"}
            details={pet.had_surgeries ? surgeryDetails : []}
          />
          <InfoRow
            label="Микрочип"
            value={pet.has_microchip ? pet.microchip_number || "Есть" : "Нет"}
          />
        </section>

        <section className="P-PassportLive__card">
          <div className="P-PassportLive__sectionTop">
            <h3 className="P-PassportLive__cardTitle">Быстрые действия</h3>
            <span className="P-PassportLive__counter">{procedureLinks.length}</span>
          </div>

          <div className="P-PassportLive__actionRow">
            <Link
              className="P-PassportLive__actionChip"
              to={hasExtendedPassport ? buildHealthCheckPath(pet.id) : "/subscriptions"}
              onClick={() => {
                trackButtonClick("passport_health_check");
                if (!hasExtendedPassport) {
                  trackEvent("health_check_blocked_basic_plan", { source: "passport", pet_id: pet.id });
                  showToast("Трекер здоровья доступен в подписке Премиум, Семейная или Заводчик", "error");
                  return;
                }

                trackFeatureUse(
                  hasExtendedPassport ? "health_check" : "subscriptions",
                  "open",
                  { source: "passport_actions", pet_id: pet.id },
                );
              }}
            >
              Контроль здоровья
            </Link>
            {procedureLinks.map((item) => (
              <Link
                key={item.to}
                className="P-PassportLive__actionChip"
                to={item.to}
                onClick={() => {
                  trackButtonClick(`passport_action_${item.label.toLowerCase()}`);
                  trackFeatureUse("procedure", "open", {
                    source: "passport_actions",
                    label: item.label,
                    pet_id: pet.id,
                  });
                }}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </section>

        <section className="P-PassportLive__card">
          <div className="P-PassportLive__sectionTop">
            <h3 className="P-PassportLive__cardTitle">Последние события</h3>
            <span className="P-PassportLive__counter">{sortedEvents.length}</span>
          </div>

          <div className="P-PassportLive__timeline">
            {eventsQuery.isLoading ? (
              <>
                <article className="P-PassportLive__timelineItem">
                  <div className="P-PassportLive__timelineDot P-PassportLive__timelineDot--skeleton" />
                  <div className="P-PassportLive__timelineBody P-PassportLive__timelineBody--loading">
                    <div className="P-PassportLive__skeleton P-PassportLive__skeleton--line" />
                    <div className="P-PassportLive__skeleton P-PassportLive__skeleton--meta" />
                    <div className="P-PassportLive__skeleton P-PassportLive__skeleton--lineShort" />
                  </div>
                </article>
                <article className="P-PassportLive__timelineItem">
                  <div className="P-PassportLive__timelineDot P-PassportLive__timelineDot--skeleton" />
                  <div className="P-PassportLive__timelineBody P-PassportLive__timelineBody--loading">
                    <div className="P-PassportLive__skeleton P-PassportLive__skeleton--line" />
                    <div className="P-PassportLive__skeleton P-PassportLive__skeleton--meta" />
                    <div className="P-PassportLive__skeleton P-PassportLive__skeleton--lineShort" />
                  </div>
                </article>
              </>
            ) : sortedEvents.length > 0 ? (
              sortedEvents.slice(0, 6).map((event) => (
                <article key={event.id} className="P-PassportLive__timelineItem">
                  <div className="P-PassportLive__timelineDot" />
                  <div className="P-PassportLive__timelineBody">
                    <div className="P-PassportLive__timelineTop">
                      <h4>{event.title}</h4>
                      <span>{event.is_done ? "Выполнено" : "Запланировано"}</span>
                    </div>
                    <p>{formatDate(event.scheduled_at)}</p>
                    {event.notes ? <p>{event.notes}</p> : null}

                    <div className="P-PassportLive__timelineActions">
                      <button
                        type="button"
                        className="P-PassportLive__timelineAction"
                        onClick={() =>
                          toggleDoneMutation.mutate({
                            eventId: event.id,
                            isDone: event.is_done,
                          })}
                        disabled={toggleDoneMutation.isPending || deleteMutation.isPending}
                      >
                        {event.is_done ? "Вернуть в план" : "Выполнить"}
                      </button>

                      <Link
                        className="P-PassportLive__timelineAction"
                        to={`${buildProcedurePath("custom", event.pet_id)}?eventId=${event.id}&date=${toDateKey(event.scheduled_at)}`}
                      >
                        Редактировать
                      </Link>

                      <button
                        type="button"
                        className="P-PassportLive__timelineAction P-PassportLive__timelineAction--danger"
                        onClick={() => {
                          if (!window.confirm("Удалить это событие?")) return;
                          deleteMutation.mutate(event.id);
                        }}
                        disabled={toggleDoneMutation.isPending || deleteMutation.isPending}
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <p className="P-PassportLive__stateText">
                Пока нет процедур. Добавь первую запись через быстрые действия.
              </p>
            )}
          </div>
        </section>
      </div>
    </AppLayout>
  );
}


