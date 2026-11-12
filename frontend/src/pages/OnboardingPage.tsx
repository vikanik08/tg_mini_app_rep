import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarDays,
  Camera,
  Check,
  ChevronDown,
  HeartPulse,
  Minus,
  PawPrint,
  Plus,
  X,
} from "lucide-react";
import { createEvent, type EventType } from "@/entities/event/api";
import { createPet, getPets, type Pet } from "@/entities/pet/api";
import { getApiErrorMessage } from "@/shared/api/errors";
import { trackButtonClick, trackEvent, trackPageView } from "@/shared/analytics/metrica";
import { zonedDateTimeToUtcIso } from "@/shared/lib/dateTime";
import { getEffectivePlan, readCurrentUser } from "@/shared/lib/subscription";
import { openPlatformSupport } from "@/shared/platform/support";
import { useToast } from "@/shared/ui/useToast";
import screen01 from "@/assets/onboarding/screen-01.webp";
import screen02 from "@/assets/onboarding/screen-02.webp";
import screen03 from "@/assets/onboarding/screen-03.webp";
import screen04 from "@/assets/onboarding/screen-04.webp";
import screen05 from "@/assets/onboarding/screen-05.webp";
import screen06 from "@/assets/onboarding/screen-06.webp";
import screen07 from "@/assets/onboarding/screen-07.webp";
import screen08 from "@/assets/onboarding/screen-08.webp";
import screen09 from "@/assets/onboarding/screen-09.webp";
import screen10 from "@/assets/onboarding/screen-10.webp";
import screen11 from "@/assets/onboarding/screen-11.webp";
import screen12 from "@/assets/onboarding/screen-12.webp";
import screen13 from "@/assets/onboarding/screen-13.webp";
import featureDiary from "@/assets/onboarding/feature-diary.png";
import featurePassport from "@/assets/onboarding/feature-passport.png";
import featureReminder from "@/assets/onboarding/feature-reminder.png";
import "./onboarding-page.css";

type DraftPet = {
  name: string;
  species: "cat" | "dog";
  birthdate: string;
  photo_url: string;
};

type Priority = "care" | "health" | "report";
type Recommendation = "basic" | "premium" | "family" | "breeder";

const completionKey = "smartpet_onboarding_completed_v1";
const emptyPet = (): DraftPet => ({ name: "", species: "cat", birthdate: "", photo_url: "" });

const planCopy: Record<Recommendation, {
  eyebrow: string;
  title: string;
  name: string;
  price: string;
  features: string[];
  art: string;
  cta: string;
}> = {
  basic: {
    eyebrow: "Можно начать без оплаты",
    title: "Начнем с бесплатного",
    name: "Free",
    price: "0 ₽",
    features: ["1 питомец", "До 5 напоминаний", "Базовый ветпаспорт", "Календарь ухода"],
    art: screen09,
    cta: "Начать бесплатно",
  },
  premium: {
    eyebrow: "По вашим ответам",
    title: "Под ваши задачи — Premium",
    name: "Premium",
    price: "199 ₽/месяц",
    features: ["До 2 питомцев", "Безлимитные напоминания", "Дневник здоровья", "Расширенный ветпаспорт"],
    art: screen08,
    cta: "Выбрать за 199 ₽/мес",
  },
  family: {
    eyebrow: "Для трех питомцев и больше",
    title: "Вся компания — под присмотром",
    name: "Family",
    price: "349 ₽/месяц",
    features: ["Любое количество питомцев", "Безлимитные напоминания", "Дневник здоровья", "Ветпаспорт и PDF"],
    art: screen10,
    cta: "Выбрать за 349 ₽/мес",
  },
  breeder: {
    eyebrow: "Специальные условия",
    title: "Из лап в заботливые руки",
    name: "Для заводчиков",
    price: "По запросу",
    features: ["Все возможности Family", "Передача питомца по ссылке", "Сохранение истории и напоминаний", "Неограниченное число животных"],
    art: screen11,
    cta: "Узнать условия",
  },
};

const reminderTypes: Array<{ value: EventType; label: string; title: string }> = [
  { value: "vet_visit", label: "Ветвизит", title: "Ветвизит" },
  { value: "vaccine", label: "Вакцинация", title: "Вакцинация" },
  { value: "flea_treatment", label: "Обработка от паразитов", title: "Обработка от паразитов" },
  { value: "grooming", label: "Груминг", title: "Груминг" },
];

function tomorrowKey() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function petLimit() {
  const plan = getEffectivePlan();
  if (plan === "family" || plan === "breeder") return Number.POSITIVE_INFINITY;
  return plan === "premium" ? 2 : 1;
}

const maxPhotoDataUrlLength = 1_800_000;
const maxPhotoSide = 900;

function readImageAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Не удалось прочитать фотографию"));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Фото не удалось прочитать. Выберите JPG, PNG или WebP."));
    image.src = dataUrl;
  });
}

async function readPhoto(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Выберите изображение JPG, PNG или WebP");
  }

  const original = await readImageAsDataUrl(file);
  const isHeicLike = file.type === "image/heic" || file.type === "image/heif";
  if (original.length <= maxPhotoDataUrlLength && !isHeicLike) return original;

  const image = await loadImage(original);
  const scale = Math.min(1, maxPhotoSide / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Не удалось подготовить фото");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  for (const quality of [0.82, 0.72, 0.62, 0.52]) {
    const compressed = canvas.toDataURL("image/jpeg", quality);
    if (compressed.length <= maxPhotoDataUrlLength) return compressed;
  }
  throw new Error("Фото слишком большое. Попробуйте выбрать другое фото или скриншот.");
}

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();
  const isReplay = searchParams.get("replay") === "1";
  const existingPetsQuery = useQuery({
    queryKey: ["pets"],
    queryFn: getPets,
    enabled: isReplay,
  });
  const [step, setStep] = useState(0);
  const [petCount, setPetCount] = useState(1);
  const [isBreeder, setIsBreeder] = useState(false);
  const [petIndex, setPetIndex] = useState(0);
  const [pets, setPets] = useState<DraftPet[]>([emptyPet()]);
  const [priorities, setPriorities] = useState<Priority[]>(["care"]);
  const [createdPets, setCreatedPets] = useState<Pet[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showPlans, setShowPlans] = useState(false);
  const [reminderType, setReminderType] = useState<EventType>("vet_visit");
  const [reminderDate, setReminderDate] = useState(tomorrowKey);
  const [reminderTime, setReminderTime] = useState("10:00");
  const [savedReminder, setSavedReminder] = useState<{ title: string; date: string } | null>(null);

  useEffect(() => {
    if (!isReplay || !existingPetsQuery.data?.length) return;

    const existingPets = existingPetsQuery.data;
    setPetCount(existingPets.length);
    setPets(existingPets.map((pet) => ({
      name: pet.name,
      species: pet.species === "dog" ? "dog" : "cat",
      birthdate: pet.birthdate ?? "",
      photo_url: pet.photo_url ?? "",
    })));
    setCreatedPets(existingPets);
  }, [existingPetsQuery.data, isReplay]);

  const recommendation = useMemo<Recommendation>(() => {
    if (isBreeder) return "breeder";
    if (petCount >= 3) return "family";
    if (priorities.includes("health") || priorities.includes("report")) return "premium";
    return "basic";
  }, [isBreeder, petCount, priorities]);
  const plan = planCopy[recommendation];

  function goTo(next: number) {
    setStep(next);
    trackPageView(`/onboarding?step=${next + 1}`, { screen: "onboarding", step: next + 1 });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function completeOnboarding(source: string) {
    if (!isReplay) localStorage.setItem(completionKey, "true");
    trackEvent(isReplay ? "onboarding_replay_completed" : "onboarding_completed", {
      source,
      recommendation,
    });
    navigate(isReplay ? "/profile" : "/", { replace: true });
  }

  function setCount(next: number) {
    const value = Math.min(10, Math.max(1, next));
    setPetCount(value);
    setPets((current) => Array.from({ length: value }, (_, index) => current[index] ?? emptyPet()));
    setPetIndex((current) => Math.min(current, value - 1));
  }

  function updatePet(index: number, patch: Partial<DraftPet>) {
    setPets((current) => current.map((pet, petPosition) => (
      petPosition === index ? { ...pet, ...patch } : pet
    )));
  }

  function nextPet() {
    if (!pets[petIndex].name.trim()) {
      showToast("Введите имя питомца", "error");
      return;
    }
    if (petIndex < petCount - 1) {
      setPetIndex((current) => current + 1);
      return;
    }
    goTo(3);
  }

  async function handlePhoto(event: ChangeEvent<HTMLInputElement>, index: number) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      updatePet(index, { photo_url: await readPhoto(file) });
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Не удалось загрузить фото", "error");
    } finally {
      event.target.value = "";
    }
  }

  async function savePets() {
    if (isReplay) {
      setCreatedPets(existingPetsQuery.data ?? []);
      goTo(4);
      return;
    }

    if (createdPets.length > 0) {
      goTo(4);
      return;
    }
    setIsSaving(true);
    try {
      const allowed = Math.min(petLimit(), pets.length);
      const saved: Pet[] = [];
      for (const pet of pets.slice(0, allowed)) {
        saved.push(await createPet({
          name: pet.name.trim(),
          species: pet.species,
          sex: "unknown",
          birthdate: pet.birthdate || null,
          photo_url: pet.photo_url || null,
        }));
      }
      setCreatedPets(saved);
      if (saved.length < pets.length) {
        showToast(`Сейчас сохранено ${saved.length}. Остальных можно добавить после подключения подходящего тарифа.`, "info");
      }
      trackEvent("onboarding_pets_created", { requested: pets.length, created: saved.length });
      goTo(4);
    } catch (error) {
      showToast(getApiErrorMessage(error, "Не удалось сохранить питомца"), "error");
    } finally {
      setIsSaving(false);
    }
  }

  function togglePriority(priority: Priority) {
    setPriorities((current) => current.includes(priority)
      ? current.filter((item) => item !== priority)
      : [...current, priority]);
  }

  function choosePlan() {
    trackEvent("onboarding_plan_selected", { plan: recommendation });
    if (!isReplay && recommendation !== "basic") {
      const user = readCurrentUser();
      openPlatformSupport(`Здравствуйте! Хочу оформить тариф ${plan.name} после онбординга.`, user?.platform);
    }
    goTo(7);
  }

  async function saveReminder() {
    const pet = createdPets[0];
    if (!pet) {
      showToast("Сначала сохраните питомца", "error");
      goTo(2);
      return;
    }
    const reminder = reminderTypes.find((item) => item.value === reminderType) ?? reminderTypes[0];
    const formatted = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" })
      .format(new Date(`${reminderDate}T${reminderTime}:00`));

    if (isReplay) {
      setSavedReminder({ title: reminder.title, date: `${formatted}, ${reminderTime}` });
      trackEvent("onboarding_replay_reminder_previewed", { type: reminder.value });
      goTo(8);
      return;
    }

    setIsSaving(true);
    try {
      await createEvent({
        pet_id: pet.id,
        type: reminder.value,
        title: reminder.title,
        scheduled_at: zonedDateTimeToUtcIso(reminderDate, reminderTime),
      });
      setSavedReminder({ title: reminder.title, date: `${formatted}, ${reminderTime}` });
      trackEvent("onboarding_reminder_created", { type: reminder.value });
      goTo(8);
    } catch (error) {
      showToast(getApiErrorMessage(error, "Не удалось создать напоминание"), "error");
    } finally {
      setIsSaving(false);
    }
  }

  function back() {
    if (step === 2 && petIndex > 0) {
      setPetIndex((current) => current - 1);
      return;
    }
    goTo(Math.max(0, step - 1));
  }

  const firstPetName = pets[0]?.name.trim() || "питомца";

  return (
    <main className="P-Onboarding">
      <div className="P-Onboarding__screen">
        <header className={`P-Onboarding__topbar ${step === 0 ? "P-Onboarding__topbar--welcome" : ""}`}>
          {step > 0 && step < 8 ? (
            <button className="P-Onboarding__iconButton" type="button" onClick={back} aria-label="Назад">
              <ArrowLeft size={22} />
            </button>
          ) : <span className="P-Onboarding__topbarSpace" />}
          <span className="P-Onboarding__brand">SmartPet</span>
          {step < 8 ? (
            <button className="P-Onboarding__iconButton" type="button" onClick={() => completeOnboarding("close")} aria-label="Закрыть онбординг">
              <X size={22} />
            </button>
          ) : <span className="P-Onboarding__topbarSpace" />}
        </header>

        {isReplay ? (
          <div className="P-Onboarding__replayNotice">Повторный просмотр · данные не изменятся</div>
        ) : null}

        <section className="P-Onboarding__content">
          {step === 0 ? (
            <>
              <div className="P-Onboarding__heading P-Onboarding__heading--welcome">
                <p className="P-Onboarding__eyebrow">СмартПет</p>
                <h1>Заботу беру на лапы</h1>
                <p>Напоминания, ветпаспорт и дневник — рядом.</p>
              </div>
              <div className="P-Onboarding__art P-Onboarding__art--welcome">
                <img src={screen01} alt="Кот Вася знакомится с владельцем" />
              </div>
            </>
          ) : null}

          {step === 1 ? (
            <>
              <div className="P-Onboarding__heading">
                <h1>Сколько у вас питомцев?</h1>
                <p>Добавим каждого по очереди.</p>
              </div>
              <div className="P-Onboarding__art P-Onboarding__art--count"><img src={screen02} alt="Кот рядом с мисками" /></div>
              <div className="P-Onboarding__counter" aria-label="Количество питомцев">
                <button type="button" onClick={() => setCount(petCount - 1)} disabled={petCount <= 1} aria-label="Уменьшить"><Minus /></button>
                <strong>{petCount}</strong>
                <button type="button" onClick={() => setCount(petCount + 1)} disabled={petCount >= 10} aria-label="Увеличить"><Plus /></button>
              </div>
              <button className={`P-Onboarding__textButton ${isBreeder ? "is-active" : ""}`} type="button" onClick={() => setIsBreeder((value) => !value)}>
                <PawPrint size={18} /> Я заводчик
              </button>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <div className="P-Onboarding__heading P-Onboarding__heading--compact">
                <h1>Расскажите о питомце</h1>
                <p>Питомец {petIndex + 1} из {petCount}</p>
              </div>
              <div className="P-Onboarding__progress" aria-hidden="true">
                {pets.map((_, index) => <span key={index} className={index <= petIndex ? "is-active" : ""} />)}
              </div>
              <div className="P-Onboarding__art P-Onboarding__art--pet"><img src={pets[petIndex].species === "dog" ? screen04 : screen03} alt="Питомец с адресником" /></div>
              <div className="P-Onboarding__formCard">
                <fieldset>
                  <legend>Кто это?</legend>
                  <div className="P-Onboarding__segments">
                    <button className={pets[petIndex].species === "cat" ? "is-active" : ""} type="button" onClick={() => updatePet(petIndex, { species: "cat" })}>Кошка</button>
                    <button className={pets[petIndex].species === "dog" ? "is-active" : ""} type="button" onClick={() => updatePet(petIndex, { species: "dog" })}>Собака</button>
                  </div>
                </fieldset>
                <label className="P-Onboarding__field"><span>Имя питомца</span><input value={pets[petIndex].name} onChange={(event) => updatePet(petIndex, { name: event.target.value })} placeholder="Например, Буся" autoFocus /></label>
                <label className="P-Onboarding__field"><span>Дата рождения</span><input type="date" value={pets[petIndex].birthdate} onChange={(event) => updatePet(petIndex, { birthdate: event.target.value })} /></label>
                <p className="P-Onboarding__formHint">Породу, окрас и данные о здоровье можно добавить позже.</p>
              </div>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <div className="P-Onboarding__heading"><h1>Добавим фотографии?</h1><p>Так будет проще узнавать питомцев.</p></div>
              <div className="P-Onboarding__art P-Onboarding__art--photo"><img src={screen05} alt="Кот с камерой" /></div>
              <div className="P-Onboarding__photoList">
                {pets.map((pet, index) => (
                  <div className="P-Onboarding__photoRow" key={`${pet.name}-${index}`}>
                    <div className="P-Onboarding__avatar">{pet.photo_url ? <img src={pet.photo_url} alt="" /> : pet.species === "dog" ? "🐶" : "🐱"}</div>
                    <div><strong>{pet.name}</strong><span>{pet.species === "dog" ? "Собака" : "Кошка"}</span></div>
                    <label className="P-Onboarding__cameraButton"><Camera size={18} /><span>{pet.photo_url ? "Заменить" : "Добавить"}</span><input type="file" accept="image/*" onChange={(event) => void handlePhoto(event, index)} /></label>
                  </div>
                ))}
              </div>
              <p className="P-Onboarding__centerHint">Фото можно добавить и позже в ветпаспорте.</p>
            </>
          ) : null}

          {step === 4 ? (
            <>
              <div className="P-Onboarding__heading"><h1>С чем помочь в первую очередь?</h1><p>Можно выбрать несколько вариантов.</p></div>
              <div className="P-Onboarding__art P-Onboarding__art--priorities"><img src={screen06} alt="Кот с календарем, дневником и документами" /></div>
              <div className="P-Onboarding__choices">
                {([
                  ["care", featureReminder, "Не забывать об уходе"],
                  ["health", featureDiary, "Вести дневник здоровья"],
                  ["report", featurePassport, "Собирать отчет для ветеринара"],
                ] as const).map(([value, icon, label]) => (
                  <button type="button" className={priorities.includes(value) ? "is-active" : ""} onClick={() => togglePriority(value)} key={value}>
                    <img className="P-Onboarding__priorityIcon" src={icon} alt="" /><span>{label}</span><span className="P-Onboarding__check">{priorities.includes(value) ? <Check size={16} /> : null}</span>
                  </button>
                ))}
              </div>
            </>
          ) : null}

          {step === 5 ? (
            <>
              <div className="P-Onboarding__heading"><p className="P-Onboarding__eyebrow">Ваш сценарий</p><h1>Меньше «кажется». Больше наблюдений.</h1><p>Вес, аппетит и самочувствие — в одном дневнике.</p></div>
              <div className="P-Onboarding__art P-Onboarding__art--scenario"><img src={screen07} alt="Кот ведет дневник здоровья" /></div>
              <div className="P-Onboarding__exampleCard"><div className="P-Onboarding__exampleIcon"><HeartPulse size={22} /></div><div><strong>Дневник здоровья</strong><span>Вес · аппетит · активность · заметки</span></div><Check size={20} /></div>
            </>
          ) : null}

          {step === 6 ? (
            <>
              <div className="P-Onboarding__heading"><p className="P-Onboarding__eyebrow">{plan.eyebrow}</p><h1>{plan.title}</h1></div>
              <div className="P-Onboarding__art P-Onboarding__art--plan"><img src={plan.art} alt="Иллюстрация рекомендованного тарифа" /></div>
              <div className="P-Onboarding__planCard">
                <div className="P-Onboarding__planTop"><div><strong>{plan.name}</strong><span>{plan.price}</span></div><span className="P-Onboarding__planBadge">Рекомендуем</span></div>
                <ul>{plan.features.map((feature) => <li key={feature}><Check size={16} />{feature}</li>)}</ul>
              </div>
              {showPlans ? (
                <div className="P-Onboarding__allPlans">
                  {Object.entries(planCopy).map(([id, item]) => <div key={id}><strong>{item.name}</strong><span>{item.price}</span></div>)}
                </div>
              ) : null}
            </>
          ) : null}

          {step === 7 ? (
            <>
              <div className="P-Onboarding__heading"><h1>Первое дело — в календарь</h1><p>Что напомнить для {firstPetName}?</p></div>
              <div className="P-Onboarding__art P-Onboarding__art--reminder"><img src={screen12} alt="Кот с часами и календарем" /></div>
              <div className="P-Onboarding__reminderCard">
                <label className="P-Onboarding__field"><span>Тип задачи</span><div className="P-Onboarding__select"><select value={reminderType} onChange={(event) => setReminderType(event.target.value as EventType)}>{reminderTypes.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select><ChevronDown size={18} /></div></label>
                <div className="P-Onboarding__fieldRow"><label className="P-Onboarding__field"><span>Дата</span><input type="date" value={reminderDate} onChange={(event) => setReminderDate(event.target.value)} /></label><label className="P-Onboarding__field"><span>Время</span><input type="time" value={reminderTime} onChange={(event) => setReminderTime(event.target.value)} /></label></div>
                <div className="P-Onboarding__petChip"><span>{pets[0].species === "dog" ? "🐶" : "🐱"}</span><div><strong>{firstPetName}</strong><small>Получит напоминание</small></div><Check size={18} /></div>
              </div>
            </>
          ) : null}

          {step === 8 ? (
            <>
              <div className="P-Onboarding__heading"><h1>Теперь можно выдохнуть</h1><p>Первое напоминание уже в календаре.</p></div>
              <div className="P-Onboarding__art P-Onboarding__art--done"><img src={screen13} alt="Довольный кот отдыхает в гамаке" /></div>
              <div className="P-Onboarding__doneCard"><CalendarDays size={22} /><div><strong>{firstPetName} · {savedReminder?.title ?? "Ветвизит"}</strong><span>{savedReminder?.date ?? "Добавлено в календарь"}</span></div><Check size={20} /></div>
            </>
          ) : null}
        </section>

        <footer className="P-Onboarding__footer">
          {step === 0 ? <><button className="P-Onboarding__primary" type="button" onClick={() => { trackButtonClick(isReplay ? "onboarding_replay_start" : "onboarding_start"); goTo(1); }}>{isReplay ? "Пройти ещё раз" : "Настроить под меня"}</button><button className="P-Onboarding__link" type="button" onClick={() => completeOnboarding("skip")}>{isReplay ? "Вернуться в профиль" : "Сначала посмотрю"}</button></> : null}
          {step === 1 ? <button className="P-Onboarding__primary" type="button" onClick={() => goTo(2)}>Продолжить</button> : null}
          {step === 2 ? <button className="P-Onboarding__primary" type="button" onClick={nextPet}>{petIndex < petCount - 1 ? "Следующий питомец" : "Продолжить"}</button> : null}
          {step === 3 ? <button className="P-Onboarding__primary" type="button" onClick={() => void savePets()} disabled={isSaving || (isReplay && existingPetsQuery.isLoading)}>{isSaving ? "Сохраняю..." : isReplay ? "Продолжить просмотр" : pets.some((pet) => pet.photo_url) ? "Продолжить" : "Продолжить без фото"}</button> : null}
          {step === 4 ? <button className="P-Onboarding__primary" type="button" onClick={() => goTo(5)}>Продолжить</button> : null}
          {step === 5 ? <button className="P-Onboarding__primary" type="button" onClick={() => goTo(6)}>Подобрать тариф</button> : null}
          {step === 6 ? <><button className="P-Onboarding__secondary" type="button" onClick={() => setShowPlans((value) => !value)}>{showPlans ? "Скрыть тарифы" : "Посмотреть все тарифы"}</button><button className="P-Onboarding__primary" type="button" onClick={choosePlan}>{plan.cta}</button>{recommendation !== "basic" ? <button className="P-Onboarding__link" type="button" onClick={() => goTo(7)}>Продолжить бесплатно</button> : null}</> : null}
          {step === 7 ? <><button className="P-Onboarding__primary" type="button" onClick={() => void saveReminder()} disabled={isSaving}>{isSaving ? "Создаю..." : isReplay ? "Посмотреть результат" : "Создать напоминание"}</button><button className="P-Onboarding__link" type="button" onClick={() => { trackEvent(isReplay ? "onboarding_replay_reminder_skipped" : "onboarding_reminder_skipped"); setSavedReminder(null); goTo(8); }}>{isReplay ? "Пропустить экран" : "Добавлю позже"}</button></> : null}
          {step === 8 ? <button className="P-Onboarding__primary" type="button" onClick={() => completeOnboarding("finished")}>{isReplay ? "Вернуться в профиль" : "Главный экран"}</button> : null}
        </footer>
      </div>
    </main>
  );
}
