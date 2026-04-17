import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AppLayout from "../widgets/layout/AppLayout";
import {
  createPet,
  deletePet,
  getPets,
  updatePet,
  type CreatePetPayload,
  type Pet,
} from "../entities/pet/api";
import {
  buildPassportPath,
  clearActivePetId,
  ensureActivePet,
  getActivePetId,
  pickActivePet,
  setActivePetId,
} from "../shared/lib/activePet";
import { useToast } from "../shared/ui/useToast";
import "./passport-edit-page-live.css";

type PassportFormState = {
  name: string;
  species: Pet["species"];
  sex: Pet["sex"];
  birthdate: string;
  weight_kg: string;
  photo_url: string;
  species_label: string;
  breed: string;
  color: string;
  is_neutered: boolean;
  is_vaccinated: boolean;
  vaccination_date: string;
  has_parasite_treatment: boolean;
  flea_treatment_date: string;
  worm_treatment_date: string;
  flea_treatment_product: string;
  worm_treatment_product: string;
  has_chronic_conditions: boolean;
  chronic_conditions_notes: string;
  had_surgeries: boolean;
  surgeries_notes: string;
  has_microchip: boolean;
  microchip_number: string;
};

type HealthFeatureOption = {
  category: string;
  items: Array<{
    id: string;
    label: string;
    description?: string;
  }>;
};

const healthFeatureOptions: HealthFeatureOption[] = [
  {
    category: "Мочевыделительная система",
    items: [
      {
        id: "urinary-urolithiasis",
        label: "МКБ (Мочекаменная болезнь)",
        description: "если были кристаллы в моче или операция",
      },
      {
        id: "urinary-cystitis",
        label: "Цистит (идиопатический или бактериальный)",
        description: "частые походы в лоток, кровь в моче",
      },
      {
        id: "urinary-ckd",
        label: "ХПН (Хроническая почечная недостаточность)",
      },
    ],
  },
  {
    category: "Пищеварительная система",
    items: [
      {
        id: "digestive-pancreatitis",
        label: "Панкреатит (воспаление поджелудочной)",
      },
      {
        id: "digestive-gastritis-colitis",
        label: "Хронический гастрит / колит",
        description: "чувствительный желудок, рвота, диарея",
      },
      {
        id: "digestive-sensitive",
        label: "Чувствительное пищеварение",
        description: "чувствительный желудок, нестабильный стул",
      },
      {
        id: "digestive-constipation",
        label: "Запоры / Мегаколон",
      },
    ],
  },
  {
    category: "Сердечно-сосудистая система",
    items: [
      {
        id: "cardio-hcm",
        label: "ГКМП (Гипертрофическая кардиомиопатия)",
      },
      {
        id: "cardio-hypertension",
        label: "Артериальная гипертензия",
        description: "повышенное давление — часто следствие почек",
      },
    ],
  },
  {
    category: "Дыхательная система",
    items: [
      {
        id: "respiratory-asthma",
        label: "Астма",
        description: "аллергическая, кашель, хрипы",
      },
      {
        id: "respiratory-rhinitis",
        label: "Хронический ринит",
        description: "вечно «заложенный» нос, чихание",
      },
    ],
  },
  {
    category: "Эндокринная система",
    items: [
      {
        id: "endocrine-diabetes",
        label: "Сахарный диабет",
      },
      {
        id: "endocrine-hyperthyroidism",
        label: "Гипертиреоз",
        description: "повышенная функция щитовидной железы, худеют, но много едят",
      },
    ],
  },
  {
    category: "Стоматология",
    items: [
      {
        id: "dental-stomatitis",
        label: "Стоматит",
        description: "хроническое воспаление дёсен",
      },
      {
        id: "dental-tartar",
        label: "Зубной камень",
        description: "склонность к образованию налёта",
      },
      {
        id: "dental-resorption",
        label: "Резорбция зубов",
        description: "зуб разрушается изнутри, сильная боль",
      },
    ],
  },
  {
    category: "Опорно-двигательная система",
    items: [
      {
        id: "mobility-arthritis",
        label: "Артрит / Остеоартроз",
        description: "проблемы с суставами",
      },
      {
        id: "mobility-dysplasia",
        label: "Дисплазия тазобедренного сустава",
        description: "чаще у мейн-кунов и британцев",
      },
    ],
  },
  {
    category: "Органы чувств",
    items: [
      {
        id: "senses-eye",
        label: "Хронический конъюнктивит / Кератит",
        description: "проблемы с глазами",
      },
      {
        id: "senses-deafness",
        label: "Глухота",
        description: "особенно для белых кошек",
      },
      {
        id: "senses-blindness",
        label: "Слепота",
      },
    ],
  },
  {
    category: "Неврология",
    items: [
      {
        id: "neuro-vestibular",
        label: "Синдром вестибулярного аппарата",
        description: "нарушение координации",
      },
      {
        id: "neuro-epilepsy",
        label: "Эпилепсия",
      },
    ],
  },
  {
    category: "Аллергии и кожа",
    items: [
      {
        id: "allergy-dermatitis",
        label: "Атопический дерматит",
        description: "аллергия на пыль, пыльцу",
      },
      {
        id: "allergy-food",
        label: "Пищевая аллергия",
      },
      {
        id: "allergy-fleas",
        label: "Аллергия на укусы блох (BPH)",
      },
    ],
  },
  {
    category: "Вирусные носители",
    items: [
      {
        id: "virus-fiv",
        label: "Вирусный иммунодефицит кошек (ВИК, FIV)",
        description: "аллергия на пыль, пыльцу",
      },
      {
        id: "virus-felv",
        label: "Вирусная лейкемия кошек (ВЛК, FeLV)",
      },
      {
        id: "virus-herpes",
        label: "Герпесвирусная инфекция",
        description: "пожизненное носительство, высыпания при стрессе",
      },
      {
        id: "virus-calicivirus",
        label: "Калицивироз",
      },
    ],
  },
];

const initialFormState: PassportFormState = {
  name: "",
  species: "cat",
  sex: "male",
  birthdate: "",
  weight_kg: "",
  photo_url: "",
  species_label: "",
  breed: "",
  color: "",
  is_neutered: false,
  is_vaccinated: false,
  vaccination_date: "",
  has_parasite_treatment: false,
  flea_treatment_date: "",
  worm_treatment_date: "",
  flea_treatment_product: "",
  worm_treatment_product: "",
  has_chronic_conditions: false,
  chronic_conditions_notes: "",
  had_surgeries: false,
  surgeries_notes: "",
  has_microchip: false,
  microchip_number: "",
};

const healthFeatureLabels = new Map(
  healthFeatureOptions.flatMap((group) =>
    group.items.map((item) => [item.id, item.label] as const),
  ),
);

function parseHealthFeatures(value: string | null | undefined) {
  if (!value) return [];

  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function serializeHealthFeatures(items: string[]) {
  return items.join("\n");
}

function getHealthFeatureLabel(value: string) {
  return healthFeatureLabels.get(value) ?? value;
}

function mapPetToForm(pet: Pet | null): PassportFormState {
  if (!pet) return initialFormState;

  return {
    name: pet.name,
    species: pet.species,
    sex: pet.sex,
    birthdate: pet.birthdate ?? "",
    weight_kg: pet.weight_kg ?? "",
    photo_url: pet.photo_url ?? "",
    species_label: pet.species_label ?? "",
    breed: pet.breed ?? "",
    color: pet.color ?? "",
    is_neutered: pet.is_neutered,
    is_vaccinated: pet.is_vaccinated,
    vaccination_date: pet.vaccination_date ?? "",
    has_parasite_treatment: pet.has_parasite_treatment,
    flea_treatment_date: pet.flea_treatment_date ?? "",
    worm_treatment_date: pet.worm_treatment_date ?? "",
    flea_treatment_product: pet.flea_treatment_product ?? "",
    worm_treatment_product: pet.worm_treatment_product ?? "",
    has_chronic_conditions: pet.has_chronic_conditions,
    chronic_conditions_notes: pet.chronic_conditions_notes ?? "",
    had_surgeries: pet.had_surgeries,
    surgeries_notes: pet.surgeries_notes ?? "",
    has_microchip: pet.has_microchip,
    microchip_number: pet.microchip_number ?? "",
  };
}

function buildPayload(form: PassportFormState): CreatePetPayload {
  return {
    name: form.name.trim(),
    species: form.species,
    sex: form.sex,
    birthdate: form.birthdate || null,
    weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
    photo_url: form.photo_url || null,
    species_label:
      form.species === "other" && form.species_label.trim()
        ? form.species_label.trim()
        : null,
    breed: form.breed.trim() || null,
    color: form.color.trim() || null,
    is_neutered: form.is_neutered,
    is_vaccinated: form.is_vaccinated,
    vaccination_date: form.is_vaccinated && form.vaccination_date ? form.vaccination_date : null,
    has_parasite_treatment: form.has_parasite_treatment,
    flea_treatment_date:
      form.has_parasite_treatment && form.flea_treatment_date ? form.flea_treatment_date : null,
    worm_treatment_date:
      form.has_parasite_treatment && form.worm_treatment_date ? form.worm_treatment_date : null,
    flea_treatment_product:
      form.has_parasite_treatment && form.flea_treatment_product.trim()
        ? form.flea_treatment_product.trim()
        : null,
    worm_treatment_product:
      form.has_parasite_treatment && form.worm_treatment_product.trim()
        ? form.worm_treatment_product.trim()
        : null,
    has_chronic_conditions: form.has_chronic_conditions,
    chronic_conditions_notes:
      form.has_chronic_conditions && form.chronic_conditions_notes.trim()
        ? form.chronic_conditions_notes.trim()
        : null,
    had_surgeries: form.had_surgeries,
    surgeries_notes:
      form.had_surgeries && form.surgeries_notes.trim()
        ? form.surgeries_notes.trim()
        : null,
    has_microchip: form.has_microchip,
    microchip_number:
      form.has_microchip && form.microchip_number.trim() ? form.microchip_number.trim() : null,
  };
}

function readImageAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Не удалось загрузить фото с устройства"));
    reader.readAsDataURL(file);
  });
}

function ToggleField({
  label,
  checked,
  onChange,
  tone = "default",
  helper,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  tone?: "default" | "warning";
  helper?: string;
}) {
  return (
    <div className={`P-PassportEditLive__toggleCard ${tone === "warning" ? "is-warning" : ""}`}>
      <div className="P-PassportEditLive__toggleMain">
        <span>{label}</span>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          className={`P-PassportEditLive__switch ${checked ? "is-on" : ""}`}
          onClick={() => onChange(!checked)}
        >
          <span className="P-PassportEditLive__switchThumb" />
        </button>
      </div>
      {helper ? <p className="P-PassportEditLive__toggleHint">{helper}</p> : null}
    </div>
  );
}

function HealthFeaturesModal({
  open,
  selectedItems,
  onToggleItem,
  onClose,
  onSave,
}: {
  open: boolean;
  selectedItems: string[];
  onToggleItem: (item: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  if (!open) return null;

  return (
    <div className="P-PassportEditLive__modalOverlay" onClick={onClose}>
      <div
        className="P-PassportEditLive__modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="P-PassportEditLive__modalHeader">
          <div>
            <h3 className="P-PassportEditLive__modalTitle">Особенности здоровья</h3>
            <p className="P-PassportEditLive__modalHint">
              Отметь все важное, чтобы потом быстрее ориентироваться в карточке.
            </p>
          </div>

          <button
            type="button"
            className="P-PassportEditLive__modalClose"
            onClick={onClose}
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>

        <div className="P-PassportEditLive__modalBody">
          {healthFeatureOptions.map((group) => (
            <section key={group.category} className="P-PassportEditLive__modalSection">
              <h4 className="P-PassportEditLive__modalSectionTitle">{group.category}</h4>
              <div className="P-PassportEditLive__modalOptions">
                {group.items.map((item) => (
                  <label key={item.id} className="P-PassportEditLive__modalOption">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.id)}
                      onChange={() => onToggleItem(item.id)}
                    />
                    <span className="P-PassportEditLive__modalOptionCopy">
                      <span className="P-PassportEditLive__modalOptionTitle">{item.label}</span>
                      {item.description ? (
                        <span className="P-PassportEditLive__modalOptionDescription">
                          {item.description}
                        </span>
                      ) : null}
                    </span>
                  </label>
                ))}
              </div>
            </section>
          ))}
        </div>

        <button
          type="button"
          className="P-PassportEditLive__modalSave"
          onClick={onSave}
        >
          Сохранить
        </button>
      </div>
    </div>
  );
}

export default function PassportPetEditPage() {
  const params = useParams();
  const routePetId = params.petId;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const petsQuery = useQuery({
    queryKey: ["pets"],
    queryFn: getPets,
  });

  const pet = useMemo(
    () =>
      routePetId
        ? (petsQuery.data ?? []).find((item) => item.id === routePetId) ?? null
        : null,
    [petsQuery.data, routePetId],
  );
  const [form, setForm] = useState<PassportFormState>(initialFormState);
  const [errorText, setErrorText] = useState("");
  const [isReadingPhoto, setIsReadingPhoto] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [isHealthModalOpen, setIsHealthModalOpen] = useState(false);
  const [healthFeaturesDraft, setHealthFeaturesDraft] = useState<string[]>([]);

  useEffect(() => {
    if (routePetId) {
      ensureActivePet(pet);
    }

    setForm(mapPetToForm(pet));
    setHealthFeaturesDraft(parseHealthFeatures(pet?.chronic_conditions_notes));
  }, [pet, routePetId]);

  const hasExistingPet = useMemo(() => Boolean(pet?.id), [pet?.id]);
  const backPath = pet ? buildPassportPath(pet.id) : "/";
  const healthFeaturesSummary = useMemo(
    () => parseHealthFeatures(form.chronic_conditions_notes),
    [form.chronic_conditions_notes],
  );
  const showVaccinationWarning = showValidation && form.is_vaccinated && !form.vaccination_date;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = buildPayload(form);

      if (!payload.name) {
        throw new Error("Укажи имя питомца");
      }

      if (payload.species === "other" && !payload.species_label) {
        throw new Error("Напиши, какой это питомец");
      }

      if (hasExistingPet && pet) {
        return updatePet(pet.id, payload);
      }

      return createPet(payload);
    },
    onSuccess: async (savedPet) => {
      const hadPetsBeforeCreate = (petsQuery.data ?? []).length > 0;

      queryClient.setQueryData<Pet[]>(["pets"], (current) => {
        const list = current ?? [];
        const existingIndex = list.findIndex((item) => item.id === savedPet.id);

        if (existingIndex >= 0) {
          const next = [...list];
          next[existingIndex] = savedPet;
          return next;
        }

        return [savedPet, ...list];
      });
      queryClient.setQueryData<Pet>(["pet", savedPet.id], savedPet);

      if (hasExistingPet || !hadPetsBeforeCreate || !getActivePetId()) {
        setActivePetId(savedPet.id);
      }

      await queryClient.invalidateQueries();
      showToast(hasExistingPet ? "Ветпаспорт сохранен" : "Питомец добавлен", "success");
      navigate(buildPassportPath(savedPet.id));
    },
    onError: (error: Error) => {
      const message = error.message || "Не удалось сохранить питомца";
      setErrorText(message);
      showToast(message, "error");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!pet?.id) {
        throw new Error("Питомец для удаления не найден");
      }

      return deletePet(pet.id);
    },
    onSuccess: async () => {
      const remainingPets = (petsQuery.data ?? []).filter((item) => item.id !== pet?.id);
      const nextActivePet = pickActivePet(remainingPets);

      if (nextActivePet) {
        setActivePetId(nextActivePet.id);
      } else {
        clearActivePetId();
      }

      await queryClient.invalidateQueries();
      showToast("Питомец удален", "success");

      if (nextActivePet) {
        navigate(buildPassportPath(nextActivePet.id));
      } else {
        navigate("/");
      }
    },
    onError: (error: Error) => {
      const message = error.message || "Не удалось удалить питомца";
      setErrorText(message);
      showToast(message, "error");
    },
  });

  function updateField<Key extends keyof PassportFormState>(
    key: Key,
    value: PassportFormState[Key],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
    if (errorText) setErrorText("");
  }

  function updateSpecies(species: Pet["species"]) {
    setForm((current) => ({
      ...current,
      species,
      species_label: species === "other" ? current.species_label : "",
    }));
    if (errorText) setErrorText("");
  }

  function toggleHealthFeature(item: string) {
    setHealthFeaturesDraft((current) =>
      current.includes(item)
        ? current.filter((entry) => entry !== item)
        : [...current, item],
    );
  }

  function applyHealthFeatures() {
    updateField("chronic_conditions_notes", serializeHealthFeatures(healthFeaturesDraft));
    setIsHealthModalOpen(false);
  }

  async function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsReadingPhoto(true);
    try {
      const photoUrl = await readImageAsDataUrl(file);
      updateField("photo_url", photoUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось загрузить фото";
      setErrorText(message);
      showToast(message, "error");
    } finally {
      setIsReadingPhoto(false);
      event.target.value = "";
    }
  }

  function handleDeletePet() {
    if (!pet) return;

    const shouldDelete = window.confirm(
      `Удалить питомца "${pet.name}"? Это действие нельзя отменить.`,
    );

    if (!shouldDelete) return;

    setErrorText("");
    deleteMutation.mutate();
  }

  function handleSave() {
    setShowValidation(true);

    if (form.is_vaccinated && !form.vaccination_date) {
      const message = "Для вакцинации нужно заполнить дату перед сохранением";
      setErrorText(message);
      showToast(message, "error");
      return;
    }

    saveMutation.mutate();
  }

  if (routePetId && petsQuery.isLoading) {
    return (
      <AppLayout>
        <div className="P-PassportEditLive">
          <section className="P-PassportEditLive__card">
            <h1 className="P-PassportEditLive__title">Загружаю питомца...</h1>
          </section>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="P-PassportEditLive">
        <header className="P-PassportEditLive__header">
          <div>
            <p className="P-PassportEditLive__eyebrow">Ветпаспорт</p>
            <h1 className="P-PassportEditLive__title">
              {hasExistingPet ? "Редактирование данных" : "Новый питомец"}
            </h1>
          </div>

          <Link className="P-PassportEditLive__ghostAction" to={backPath}>
            Назад
          </Link>
        </header>

        <section className="P-PassportEditLive__photoCard">
          <label className="P-PassportEditLive__photoDropzone">
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
            />
            {form.photo_url ? (
              <img
                className="P-PassportEditLive__photoPreview"
                src={form.photo_url}
                alt={form.name || "Фото питомца"}
              />
            ) : (
              <span>{isReadingPhoto ? "Загружаю фото..." : "Добавить фото"}</span>
            )}
          </label>

          {form.photo_url ? (
            <button
              type="button"
              className="P-PassportEditLive__ghostAction"
              onClick={() => updateField("photo_url", "")}
            >
              Удалить фото
            </button>
          ) : null}
        </section>

        <section className="P-PassportEditLive__section">
          <h2 className="P-PassportEditLive__sectionLabel">Личная информация</h2>

          <label className="P-PassportEditLive__field P-PassportEditLive__field--pill">
            <span>Имя</span>
            <input
              type="text"
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              placeholder="Имя"
            />
          </label>

          <div className="P-PassportEditLive__choiceCard">
            <label className="P-PassportEditLive__choiceRow">
              <input
                type="radio"
                name="species"
                checked={form.species === "cat"}
                onChange={() => updateSpecies("cat")}
              />
              <span>Кошка</span>
            </label>
            <label className="P-PassportEditLive__choiceRow">
              <input
                type="radio"
                name="species"
                checked={form.species === "dog"}
                onChange={() => updateSpecies("dog")}
              />
              <span>Собака</span>
            </label>
            <label className="P-PassportEditLive__choiceRow">
              <input
                type="radio"
                name="species"
                checked={form.species === "other"}
                onChange={() => updateSpecies("other")}
              />
              <span>Другой питомец</span>
            </label>
          </div>

          {form.species === "other" ? (
            <label className="P-PassportEditLive__field P-PassportEditLive__field--pill">
              <span>Какой питомец?</span>
              <input
                type="text"
                value={form.species_label}
                onChange={(event) => updateField("species_label", event.target.value)}
                placeholder="Например, кролик или хорек"
              />
            </label>
          ) : null}

          <div className="P-PassportEditLive__choiceCard">
            <label className="P-PassportEditLive__choiceRow">
              <input
                type="radio"
                name="sex"
                checked={form.sex === "female"}
                onChange={() => updateField("sex", "female")}
              />
              <span>Девочка</span>
            </label>
            <label className="P-PassportEditLive__choiceRow">
              <input
                type="radio"
                name="sex"
                checked={form.sex === "male"}
                onChange={() => updateField("sex", "male")}
              />
              <span>Мальчик</span>
            </label>
            <label className="P-PassportEditLive__choiceRow">
              <input
                type="radio"
                name="sex"
                checked={form.sex === "unknown"}
                onChange={() => updateField("sex", "unknown")}
              />
              <span>Не указано</span>
            </label>
          </div>

          <label className="P-PassportEditLive__field P-PassportEditLive__field--pill">
            <span>Порода</span>
            <input
              type="text"
              value={form.breed}
              onChange={(event) => updateField("breed", event.target.value)}
              placeholder="Порода"
            />
          </label>

          <label className="P-PassportEditLive__field P-PassportEditLive__field--pill">
            <span>Окрас</span>
            <input
              type="text"
              value={form.color}
              onChange={(event) => updateField("color", event.target.value)}
              placeholder="Окрас"
            />
          </label>

          <label className="P-PassportEditLive__field P-PassportEditLive__field--pill">
            <span>Дата рождения</span>
            <input
              type="date"
              value={form.birthdate}
              onChange={(event) => updateField("birthdate", event.target.value)}
            />
          </label>
        </section>

        <section className="P-PassportEditLive__section">
          <h2 className="P-PassportEditLive__sectionLabel">Медицинская информация</h2>

          <label className="P-PassportEditLive__field P-PassportEditLive__field--pill">
            <span>Вес</span>
            <input
              type="number"
              min="0"
              step="0.1"
              value={form.weight_kg}
              onChange={(event) => updateField("weight_kg", event.target.value)}
              placeholder="4.2"
            />
          </label>

          <ToggleField
            label="Кастрация"
            checked={form.is_neutered}
            onChange={(checked) => updateField("is_neutered", checked)}
          />

          <ToggleField
            label="Обработки от паразитов"
            checked={form.has_parasite_treatment}
            onChange={(checked) => updateField("has_parasite_treatment", checked)}
          />

          {form.has_parasite_treatment ? (
            <div className="P-PassportEditLive__stack">
              <label className="P-PassportEditLive__field P-PassportEditLive__field--pill">
                <span>Дата последней обработки</span>
                <input
                  type="date"
                  value={form.flea_treatment_date}
                  onChange={(event) => updateField("flea_treatment_date", event.target.value)}
                />
                <small>от блох и клещей</small>
              </label>

              <label className="P-PassportEditLive__field P-PassportEditLive__field--pill">
                <span>Дата последней обработки</span>
                <input
                  type="date"
                  value={form.worm_treatment_date}
                  onChange={(event) => updateField("worm_treatment_date", event.target.value)}
                />
                <small>от глистов</small>
              </label>

              <label className="P-PassportEditLive__field P-PassportEditLive__field--pill">
                <span>Препарат обработки</span>
                <input
                  type="text"
                  value={form.flea_treatment_product}
                  onChange={(event) => updateField("flea_treatment_product", event.target.value)}
                  placeholder="от блох и клещей"
                />
              </label>

              <label className="P-PassportEditLive__field P-PassportEditLive__field--pill">
                <span>Препарат обработки</span>
                <input
                  type="text"
                  value={form.worm_treatment_product}
                  onChange={(event) => updateField("worm_treatment_product", event.target.value)}
                  placeholder="от глистов"
                />
              </label>
            </div>
          ) : null}

          <ToggleField
            label="Вакцинация"
            checked={form.is_vaccinated}
            onChange={(checked) => updateField("is_vaccinated", checked)}
            tone={showVaccinationWarning ? "warning" : "default"}
            helper={
              showVaccinationWarning
                ? "кажется вы забыли заполнить дату вакцинации перед сохранением"
                : undefined
            }
          />

          {form.is_vaccinated ? (
            <label className="P-PassportEditLive__field P-PassportEditLive__field--pill">
              <span>Дата вакцинации</span>
              <input
                type="date"
                value={form.vaccination_date}
                onChange={(event) => updateField("vaccination_date", event.target.value)}
              />
            </label>
          ) : null}

          <ToggleField
            label="Особенности здоровья"
            checked={form.has_chronic_conditions}
            onChange={(checked) => {
              updateField("has_chronic_conditions", checked);

              if (checked) {
                setHealthFeaturesDraft(parseHealthFeatures(form.chronic_conditions_notes));
                setIsHealthModalOpen(true);
              } else {
                setHealthFeaturesDraft([]);
                updateField("chronic_conditions_notes", "");
              }
            }}
          />

          {form.has_chronic_conditions ? (
            <div className="P-PassportEditLive__selectedFeatures">
              <div className="P-PassportEditLive__selectedFeaturesTop">
                <span>Выбрано особенностей: {healthFeaturesSummary.length}</span>
                <button
                  type="button"
                  className="P-PassportEditLive__textAction"
                  onClick={() => {
                    setHealthFeaturesDraft(parseHealthFeatures(form.chronic_conditions_notes));
                    setIsHealthModalOpen(true);
                  }}
                >
                  Изменить
                </button>
              </div>

              {healthFeaturesSummary.length > 0 ? (
                <div className="P-PassportEditLive__featureChips">
                  {healthFeaturesSummary.map((item) => (
                    <span key={item} className="P-PassportEditLive__featureChip">
                      {getHealthFeatureLabel(item)}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="P-PassportEditLive__hint">
                  Пока ничего не выбрано. Открой список и отметь важные пункты.
                </p>
              )}
            </div>
          ) : null}

          <ToggleField
            label="Были ли операции?"
            checked={form.had_surgeries}
            onChange={(checked) => updateField("had_surgeries", checked)}
            helper={form.had_surgeries ? "Кроме стерилизации" : undefined}
          />

          {form.had_surgeries ? (
            <label className="P-PassportEditLive__field P-PassportEditLive__field--pill">
              <span>Комментарий</span>
              <input
                type="text"
                value={form.surgeries_notes}
                onChange={(event) => updateField("surgeries_notes", event.target.value)}
                placeholder="Например, удаление зуба или операция в 2023"
              />
            </label>
          ) : null}

          <ToggleField
            label="Есть ли микрочип?"
            checked={form.has_microchip}
            onChange={(checked) => updateField("has_microchip", checked)}
          />

          {form.has_microchip ? (
            <label className="P-PassportEditLive__field P-PassportEditLive__field--pill">
              <span>Номер микрочипа</span>
              <input
                type="text"
                value={form.microchip_number}
                onChange={(event) => updateField("microchip_number", event.target.value)}
                placeholder="Например, 643098100123456"
              />
            </label>
          ) : null}

          <p className="P-PassportEditLive__hint">
            Базовые поля сохраняются как раньше. Медицинскую информацию можно заполнить сразу или вернуться к ней позже.
          </p>
        </section>

        {pet ? (
          <section className="P-PassportEditLive__card P-PassportEditLive__card--danger">
            <div className="P-PassportEditLive__sectionTop">
              <h2 className="P-PassportEditLive__sectionTitle">Опасная зона</h2>
            </div>

            <p className="P-PassportEditLive__hint">
              Удаление уберет питомца и связанные с ним записи из текущего сценария.
            </p>

            <button
              type="button"
              className="P-PassportEditLive__deleteButton"
              onClick={handleDeletePet}
              disabled={deleteMutation.isPending || saveMutation.isPending}
            >
              {deleteMutation.isPending ? "Удаляю..." : "Удалить питомца"}
            </button>
          </section>
        ) : null}

        {errorText ? <div className="P-PassportEditLive__error">{errorText}</div> : null}

        <button
          type="button"
          className="P-PassportEditLive__saveButton"
          onClick={handleSave}
          disabled={
            saveMutation.isPending
            || deleteMutation.isPending
            || petsQuery.isLoading
            || isReadingPhoto
          }
        >
          {saveMutation.isPending ? "Сохраняю..." : "Сохранить"}
        </button>

        <HealthFeaturesModal
          open={isHealthModalOpen}
          selectedItems={healthFeaturesDraft}
          onToggleItem={toggleHealthFeature}
          onClose={() => setIsHealthModalOpen(false)}
          onSave={applyHealthFeatures}
        />
      </div>
    </AppLayout>
  );
}
