import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AppLayout from "../widgets/layout/AppLayout";
import { createEvent } from "../entities/event/api";
import {
  createHealthCheck,
  getHealthChecks,
  type CreateHealthCheckPayload,
  type HealthCheck,
} from "../entities/health-check/api";
import { getPets, type Pet } from "../entities/pet/api";
import {
  buildPassportEditPath,
  buildPassportPath,
  syncActivePet,
} from "../shared/lib/activePet";
import { zonedDateTimeToUtcIso } from "../shared/lib/dateTime";
import arrowIcon from "../shared/ui/icons/arrow-icon.svg";
import { useToast } from "../shared/ui/useToast";
import "./health-check-page.css";

type ScaleOption = {
  value: number;
  label: string;
};

type ChoiceOption = {
  value: string;
  label: string;
};

type HealthCheckDraft = {
  weightKg: string;
  appetite: number | null;
  water: number | null;
  urinationCount: string;
  stoolCount: string;
  stoolConsistency: number | null;
  sleepHours: string;
  activity: number | null;
  vomiting: string | null;
  itching: number | null;
  sleepBreathing: string | null;
  mood: number | null;
  pain: string | null;
  cough: string | null;
  discharge: string | null;
  ownerNote: string;
};

const initialDraft: HealthCheckDraft = {
  weightKg: "",
  appetite: null,
  water: null,
  urinationCount: "",
  stoolCount: "",
  stoolConsistency: null,
  sleepHours: "",
  activity: null,
  vomiting: null,
  itching: null,
  sleepBreathing: null,
  mood: null,
  pain: null,
  cough: null,
  discharge: null,
  ownerNote: "",
};

const appetiteOptions: ScaleOption[] = [
  { value: 1, label: "почти не ест" },
  { value: 2, label: "ест меньше обычного" },
  { value: 3, label: "как обычно" },
  { value: 4, label: "ест больше обычного" },
];

const waterOptions: ScaleOption[] = [
  { value: 1, label: "пьет мало" },
  { value: 2, label: "меньше обычного" },
  { value: 3, label: "как обычно" },
  { value: 4, label: "больше обычного" },
  { value: 5, label: "значительно больше" },
];

const stoolConsistencyOptions: ScaleOption[] = [
  { value: 1, label: "твердый" },
  { value: 2, label: "нормальный" },
  { value: 3, label: "мягкий" },
  { value: 4, label: "жидкий" },
];

const activityOptions: ScaleOption[] = [
  { value: 1, label: "очень вялый" },
  { value: 2, label: "менее активный" },
  { value: 3, label: "обычный уровень" },
  { value: 4, label: "активнее обычного" },
  { value: 5, label: "очень активный" },
];

const itchingOptions: ScaleOption[] = [
  { value: 0, label: "нет" },
  { value: 1, label: "редко" },
  { value: 2, label: "иногда" },
  { value: 3, label: "часто" },
  { value: 4, label: "постоянно" },
];

const moodOptions: ScaleOption[] = [
  { value: 1, label: "вялый" },
  { value: 2, label: "спокойный" },
  { value: 3, label: "как обычно" },
  { value: 4, label: "игривый" },
];

const vomitingOptions: ChoiceOption[] = [
  { value: "Нет", label: "Нет" },
  { value: "1 раз", label: "1 раз" },
  { value: "2-3 раза", label: "2-3 раза" },
  { value: "более 3 раз", label: "более 3 раз" },
];

const frequencyOptions: ChoiceOption[] = [
  { value: "Нет", label: "Нет" },
  { value: "Иногда", label: "Иногда" },
  { value: "Часто", label: "Часто" },
];

const dischargeOptions: ChoiceOption[] = [
  { value: "Нет", label: "Нет" },
  { value: "Немного", label: "Немного" },
  { value: "Много", label: "Много" },
];

function formatDate(value?: string | null) {
  if (!value) return "Нет данных";

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function formatValue(value: string | number | null | undefined, suffix = "") {
  if (value === null || value === undefined || value === "") return "пока нет";
  return `${String(value).replace(".", ",")}${suffix}`;
}

function parseNumberField(value: string, fieldName: string) {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return null;

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${fieldName}: введи число`);
  }

  return parsed;
}

function parseIntegerField(value: string, fieldName: string) {
  const parsed = parseNumberField(value, fieldName);
  if (parsed === null) return null;

  if (!Number.isInteger(parsed)) {
    throw new Error(`${fieldName}: введи целое число`);
  }

  return parsed;
}

function buildNextMonthlyReminderDate() {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  const dateKey = date.toISOString().slice(0, 10);
  return zonedDateTimeToUtcIso(dateKey, "10:00");
}

function buildPayload(petId: string, draft: HealthCheckDraft): CreateHealthCheckPayload {
  return {
    pet_id: petId,
    weight_kg: parseNumberField(draft.weightKg, "Вес"),
    appetite: draft.appetite,
    water: draft.water,
    urination_count: parseIntegerField(draft.urinationCount, "Мочеиспускание"),
    stool_count: parseIntegerField(draft.stoolCount, "Стул"),
    stool_consistency: draft.stoolConsistency,
    sleep_hours: parseNumberField(draft.sleepHours, "Сон"),
    activity: draft.activity,
    vomiting: draft.vomiting,
    itching: draft.itching,
    sleep_breathing: draft.sleepBreathing,
    mood: draft.mood,
    pain: draft.pain,
    cough: draft.cough,
    discharge: draft.discharge,
    owner_note: draft.ownerNote.trim() || null,
  };
}

function getPetAvatar(pet: Pet) {
  if (pet.photo_url) {
    return <img src={pet.photo_url} alt={pet.name} />;
  }

  return <span>{pet.species === "cat" ? "🐱" : pet.species === "dog" ? "🐶" : "🐾"}</span>;
}

function ScaleQuestion({
  title,
  hint,
  value,
  options,
  onChange,
}: {
  title: string;
  hint: string;
  value: number | null;
  options: ScaleOption[];
  onChange: (value: number) => void;
}) {
  return (
    <section className="P-HealthCheck__question">
      <div>
        <h3>{title}</h3>
        <p>{hint}</p>
      </div>

      <div className="P-HealthCheck__scaleGrid">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`P-HealthCheck__scaleButton ${
              value === option.value ? "is-active" : ""
            }`}
            onClick={() => onChange(option.value)}
            aria-pressed={value === option.value}
          >
            <strong>{option.value}</strong>
            <span>{option.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function ChoiceQuestion({
  title,
  hint,
  value,
  options,
  onChange,
}: {
  title: string;
  hint: string;
  value: string | null;
  options: ChoiceOption[];
  onChange: (value: string) => void;
}) {
  return (
    <section className="P-HealthCheck__question">
      <div>
        <h3>{title}</h3>
        <p>{hint}</p>
      </div>

      <div className="P-HealthCheck__chipRow">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`P-HealthCheck__choiceChip ${
              value === option.value ? "is-active" : ""
            }`}
            onClick={() => onChange(option.value)}
            aria-pressed={value === option.value}
          >
            {option.label}
          </button>
        ))}
      </div>
    </section>
  );
}

function NumberQuestion({
  title,
  hint,
  value,
  placeholder,
  suffix,
  onChange,
}: {
  title: string;
  hint: string;
  value: string;
  placeholder: string;
  suffix: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="P-HealthCheck__numberQuestion">
      <span>{title}</span>
      <p>{hint}</p>
      <div className="P-HealthCheck__inputWrap">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          inputMode="decimal"
          placeholder={placeholder}
        />
        <strong>{suffix}</strong>
      </div>
    </label>
  );
}

function DynamicsCard({
  latestCheck,
  checksCount,
}: {
  latestCheck?: HealthCheck;
  checksCount: number;
}) {
  return (
    <section className="P-HealthCheck__dynamics">
      <div className="P-HealthCheck__sectionTop">
        <h2>Динамика</h2>
        <span>{checksCount ? `${checksCount} записей` : "пока пусто"}</span>
      </div>

      <div className="P-HealthCheck__dynamicsGrid">
        <article>
          <span>Последний вес</span>
          <strong>{formatValue(latestCheck?.weight_kg, " кг")}</strong>
        </article>
        <article>
          <span>Последняя проверка</span>
          <strong>{latestCheck ? formatDate(latestCheck.checked_at) : "пока нет"}</strong>
        </article>
      </div>
    </section>
  );
}

export default function HealthCheckPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { petId } = useParams();
  const [draft, setDraft] = useState<HealthCheckDraft>(initialDraft);
  const [savedCheck, setSavedCheck] = useState<HealthCheck | null>(null);
  const [errorText, setErrorText] = useState("");

  const petsQuery = useQuery({
    queryKey: ["pets"],
    queryFn: getPets,
  });

  const pet = useMemo(
    () => (petsQuery.data ?? []).find((item) => item.id === petId) ?? null,
    [petId, petsQuery.data],
  );

  const healthChecksQuery = useQuery({
    queryKey: ["health-checks", petId],
    queryFn: () => getHealthChecks(petId),
    enabled: Boolean(petId),
  });

  useEffect(() => {
    syncActivePet(pet);
  }, [pet]);

  function updateDraft<T extends keyof HealthCheckDraft>(
    field: T,
    value: HealthCheckDraft[T],
  ) {
    setDraft((current) => ({ ...current, [field]: value }));
    if (errorText) setErrorText("");
    if (savedCheck) setSavedCheck(null);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!pet?.id) {
        throw new Error("Сначала выбери или добавь питомца");
      }

      const createdCheck = await createHealthCheck(buildPayload(pet.id, draft));

      try {
        await createEvent({
          pet_id: pet.id,
          type: "other",
          title: "Проверка здоровья питомца",
          scheduled_at: buildNextMonthlyReminderDate(),
          notes: "Раз в месяц уделите несколько минут наблюдению за питомцем.",
        });
      } catch (error) {
        console.warn("Health check was saved, but monthly reminder was not created", error);
      }

      return createdCheck;
    },
    onSuccess: async (createdCheck) => {
      setSavedCheck(createdCheck);
      setDraft(initialDraft);
      await queryClient.invalidateQueries({ queryKey: ["health-checks"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      await queryClient.invalidateQueries({ queryKey: ["events"] });
      showToast("Проверка сохранена, следующее напоминание добавлено", "success");
    },
    onError: (error: Error) => {
      setErrorText(error.message || "Не удалось сохранить проверку");
      showToast(error.message || "Не удалось сохранить проверку", "error");
    },
  });

  if (petsQuery.isLoading) {
    return (
      <AppLayout>
        <div className="P-HealthCheck">
          <section className="P-HealthCheck__state">Загружаю питомца...</section>
        </div>
      </AppLayout>
    );
  }

  if (!pet) {
    return (
      <AppLayout>
        <div className="P-HealthCheck">
          <section className="P-HealthCheck__state">
            <h1>Контроль здоровья</h1>
            <p>Сначала добавь питомца, чтобы сохранить наблюдения в его историю.</p>
            <Link to="/passport/edit">Добавить питомца</Link>
          </section>
        </div>
      </AppLayout>
    );
  }

  const latestCheck = healthChecksQuery.data?.[0];

  return (
    <AppLayout>
      <div className="P-HealthCheck">
        <header className="P-HealthCheck__header">
          <button
            type="button"
            className="P-HealthCheck__back"
            onClick={() => navigate(buildPassportPath(pet.id))}
            aria-label="Назад"
          >
            <img src={arrowIcon} alt="Назад" className="A-IconImage A-IconImage--md" />
          </button>
          <div>
            <p>Проверка здоровья</p>
            <h1>Контроль здоровья</h1>
          </div>
          <Link className="P-HealthCheck__petAvatar" to={buildPassportPath(pet.id)}>
            {getPetAvatar(pet)}
          </Link>
        </header>

        <section className="P-HealthCheck__hero">
          <div>
            <span>Раз в месяц</span>
            <h2>Проверьте здоровье питомца</h2>
            <p>
              Уделите 2 минуты наблюдениям: аппетит, вода, туалет, сон,
              активность и заметки владельца сохранятся в истории здоровья.
            </p>
          </div>
          <Link to={buildPassportEditPath(pet.id)}>Паспорт {pet.name}</Link>
        </section>

        <section className="P-HealthCheck__why">
          <h2>Почему это важно</h2>
          <p>
            Животные не могут сказать, что им плохо. Часто первые признаки
            болезни — это небольшие изменения в поведении, а регулярные
            наблюдения помогают заметить их раньше.
          </p>
        </section>

        <DynamicsCard
          latestCheck={latestCheck}
          checksCount={healthChecksQuery.data?.length ?? 0}
        />

        {savedCheck ? (
          <section className="P-HealthCheck__result">
            <h2>Проверка завершена</h2>
            <p>
              Все данные сохранены в истории здоровья питомца. Их можно будет
              показать ветеринару при визите.
            </p>
          </section>
        ) : null}

        <form
          className="P-HealthCheck__form"
          onSubmit={(event) => {
            event.preventDefault();
            saveMutation.mutate();
          }}
        >
          <NumberQuestion
            title="Вес"
            hint="Введите вес питомца"
            value={draft.weightKg}
            placeholder="4,7"
            suffix="кг"
            onChange={(value) => updateDraft("weightKg", value)}
          />

          <ScaleQuestion
            title="Аппетит"
            hint="Как питомец ел в последние дни?"
            value={draft.appetite}
            options={appetiteOptions}
            onChange={(value) => updateDraft("appetite", value)}
          />

          <ScaleQuestion
            title="Вода"
            hint="Сколько воды пьет питомец?"
            value={draft.water}
            options={waterOptions}
            onChange={(value) => updateDraft("water", value)}
          />

          <div className="P-HealthCheck__split">
            <NumberQuestion
              title="Мочеиспускание"
              hint="Сколько раз в день ходит писать?"
              value={draft.urinationCount}
              placeholder="3"
              suffix="раз"
              onChange={(value) => updateDraft("urinationCount", value)}
            />
            <NumberQuestion
              title="Стул"
              hint="Сколько раз в день ходит в туалет?"
              value={draft.stoolCount}
              placeholder="1"
              suffix="раз"
              onChange={(value) => updateDraft("stoolCount", value)}
            />
          </div>

          <ScaleQuestion
            title="Консистенция стула"
            hint="Оцените по шкале"
            value={draft.stoolConsistency}
            options={stoolConsistencyOptions}
            onChange={(value) => updateDraft("stoolConsistency", value)}
          />

          <NumberQuestion
            title="Сон"
            hint="Сколько часов в сутки спит питомец?"
            value={draft.sleepHours}
            placeholder="14"
            suffix="часов"
            onChange={(value) => updateDraft("sleepHours", value)}
          />

          <ScaleQuestion
            title="Активность"
            hint="Оцените уровень активности"
            value={draft.activity}
            options={activityOptions}
            onChange={(value) => updateDraft("activity", value)}
          />

          <ChoiceQuestion
            title="Рвота"
            hint="Была ли рвота?"
            value={draft.vomiting}
            options={vomitingOptions}
            onChange={(value) => updateDraft("vomiting", value)}
          />

          <ScaleQuestion
            title="Зуд"
            hint="Насколько часто питомец чешется?"
            value={draft.itching}
            options={itchingOptions}
            onChange={(value) => updateDraft("itching", value)}
          />

          <ChoiceQuestion
            title="Дыхание во сне"
            hint="Наблюдали ли учащенное дыхание?"
            value={draft.sleepBreathing}
            options={frequencyOptions}
            onChange={(value) => updateDraft("sleepBreathing", value)}
          />

          <ScaleQuestion
            title="Настроение"
            hint="Как ведет себя питомец?"
            value={draft.mood}
            options={moodOptions}
            onChange={(value) => updateDraft("mood", value)}
          />

          <ChoiceQuestion
            title="Хромота / признаки боли"
            hint="Есть ли признаки боли?"
            value={draft.pain}
            options={frequencyOptions}
            onChange={(value) => updateDraft("pain", value)}
          />

          <ChoiceQuestion
            title="Кашель"
            hint="Был ли кашель?"
            value={draft.cough}
            options={frequencyOptions}
            onChange={(value) => updateDraft("cough", value)}
          />

          <ChoiceQuestion
            title="Выделения из глаз или носа"
            hint="Отметьте, если заметили выделения"
            value={draft.discharge}
            options={dischargeOptions}
            onChange={(value) => updateDraft("discharge", value)}
          />

          <label className="P-HealthCheck__note">
            <span>Заметка владельца</span>
            <p>Заметили что-то необычное? Напишите здесь.</p>
            <textarea
              value={draft.ownerNote}
              onChange={(event) => updateDraft("ownerNote", event.target.value)}
              placeholder="Например, стал чаще прятаться или меньше играть"
            />
          </label>

          {errorText ? <p className="P-HealthCheck__error">{errorText}</p> : null}

          <button
            type="submit"
            className="P-HealthCheck__submit"
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? "Сохраняю..." : "Сохранить проверку"}
          </button>
        </form>
      </div>
    </AppLayout>
  );
}
