import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AppLayout from "../widgets/layout/AppLayout";
import {
  createPet,
  getPets,
  updatePet,
  type CreatePetPayload,
  type Pet,
} from "../entities/pet/api";
import { pickActivePet, setActivePetId, syncActivePet } from "../shared/lib/activePet";
import "./passport-edit-page-live.css";

type PassportFormState = {
  name: string;
  species: Pet["species"];
  sex: Pet["sex"];
  birthdate: string;
  weight_kg: string;
  photo_url: string;
};

const initialFormState: PassportFormState = {
  name: "",
  species: "cat",
  sex: "unknown",
  birthdate: "",
  weight_kg: "",
  photo_url: "",
};

const procedureLinks = [
  { label: "Блохи", to: "/procedure/fleas" },
  { label: "Глисты", to: "/procedure/worms" },
  { label: "Вакцина", to: "/procedure/rabies" },
  { label: "Инфекция", to: "/procedure/infection" },
  { label: "Ветврач", to: "/procedure/vet" },
  { label: "Другое", to: "/procedure/custom" },
];

function mapPetToForm(pet: Pet | null): PassportFormState {
  if (!pet) return initialFormState;

  return {
    name: pet.name,
    species: pet.species,
    sex: pet.sex,
    birthdate: pet.birthdate ?? "",
    weight_kg: pet.weight_kg ?? "",
    photo_url: pet.photo_url ?? "",
  };
}

function buildPayload(form: PassportFormState): CreatePetPayload {
  return {
    name: form.name.trim(),
    species: form.species,
    sex: form.sex,
    birthdate: form.birthdate || null,
    weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
    photo_url: form.photo_url.trim() || null,
  };
}

export default function PassportEditPageLive() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const petsQuery = useQuery({
    queryKey: ["pets"],
    queryFn: getPets,
  });

  const pet = useMemo(() => pickActivePet(petsQuery.data ?? []), [petsQuery.data]);
  const [form, setForm] = useState<PassportFormState>(initialFormState);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    syncActivePet(pet);
    setForm(mapPetToForm(pet));
  }, [pet]);

  const hasExistingPet = useMemo(() => Boolean(pet?.id), [pet?.id]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = buildPayload(form);

      if (!payload.name) {
        throw new Error("Укажи имя питомца");
      }

      if (hasExistingPet && pet) {
        return updatePet(pet.id, payload);
      }

      return createPet(payload);
    },
    onSuccess: async (savedPet) => {
      setActivePetId(savedPet.id);
      await queryClient.invalidateQueries();
      navigate("/passport");
    },
    onError: (error: Error) => {
      setErrorText(error.message || "Не удалось сохранить питомца");
    },
  });

  function updateField<Key extends keyof PassportFormState>(
    key: Key,
    value: PassportFormState[Key],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
    if (errorText) setErrorText("");
  }

  return (
    <AppLayout>
      <div className="P-PassportEditLive">
        <header className="P-PassportEditLive__header">
          <div>
            <p className="P-PassportEditLive__eyebrow">Реальное сохранение</p>
            <h1 className="P-PassportEditLive__title">
              {hasExistingPet ? "Редактирование питомца" : "Новый питомец"}
            </h1>
          </div>

          <Link className="P-PassportEditLive__ghostAction" to="/passport">
            Назад
          </Link>
        </header>

        <section className="P-PassportEditLive__card">
          <div className="P-PassportEditLive__grid">
            <label className="P-PassportEditLive__field">
              <span>Имя</span>
              <input
                type="text"
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                placeholder="Например, Вася"
              />
            </label>

            <label className="P-PassportEditLive__field">
              <span>Тип питомца</span>
              <select
                value={form.species}
                onChange={(event) =>
                  updateField("species", event.target.value as Pet["species"])
                }
              >
                <option value="cat">Кошка</option>
                <option value="dog">Собака</option>
                <option value="other">Другой питомец</option>
              </select>
            </label>

            <label className="P-PassportEditLive__field">
              <span>Пол</span>
              <select
                value={form.sex}
                onChange={(event) =>
                  updateField("sex", event.target.value as Pet["sex"])
                }
              >
                <option value="unknown">Не указан</option>
                <option value="male">Мальчик</option>
                <option value="female">Девочка</option>
              </select>
            </label>

            <label className="P-PassportEditLive__field">
              <span>Дата рождения</span>
              <input
                type="date"
                value={form.birthdate}
                onChange={(event) => updateField("birthdate", event.target.value)}
              />
            </label>

            <label className="P-PassportEditLive__field">
              <span>Вес, кг</span>
              <input
                type="number"
                min="0"
                step="0.1"
                value={form.weight_kg}
                onChange={(event) => updateField("weight_kg", event.target.value)}
                placeholder="4.2"
              />
            </label>

            <label className="P-PassportEditLive__field">
              <span>Фото URL</span>
              <input
                type="url"
                value={form.photo_url}
                onChange={(event) => updateField("photo_url", event.target.value)}
                placeholder="https://..."
              />
            </label>
          </div>

          <p className="P-PassportEditLive__hint">
            Базовые поля сохраняются прямо в `pets`. Медицинские записи и процедуры
            пока ведем через `events`, чтобы staging уже работал на реальном API.
          </p>
        </section>

        <section className="P-PassportEditLive__card">
          <div className="P-PassportEditLive__sectionTop">
            <h2 className="P-PassportEditLive__sectionTitle">Быстрые процедуры</h2>
            <span className="P-PassportEditLive__counter">через events</span>
          </div>

          <div className="P-PassportEditLive__actionRow">
            {procedureLinks.map((item) => (
              <Link key={item.to} className="P-PassportEditLive__actionChip" to={item.to}>
                {item.label}
              </Link>
            ))}
          </div>
        </section>

        {errorText ? <div className="P-PassportEditLive__error">{errorText}</div> : null}

        <button
          type="button"
          className="P-PassportEditLive__saveButton"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || petsQuery.isLoading}
        >
          {saveMutation.isPending ? "Сохраняю..." : "Сохранить"}
        </button>
      </div>
    </AppLayout>
  );
}
