import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AppLayout from "../widgets/layout/AppLayout";
import {
  completeEvent,
  createEvent,
  type EventType,
} from "../entities/event/api";
import { getPets } from "../entities/pet/api";
import { pickActivePet, syncActivePet } from "../shared/lib/activePet";
import arrowIcon from "../shared/ui/icons/arrow-icon.svg";
import "./procedure-page.css";

type ProcedureRouteType =
  | "fleas"
  | "worms"
  | "rabies"
  | "infection"
  | "vet"
  | "custom";

type ProcedureConfig = {
  title: string;
  defaultTitle: string;
  notesHint: string;
  eventType: EventType;
};

const procedureConfig: Record<ProcedureRouteType, ProcedureConfig> = {
  fleas: {
    title: "РћР±СЂР°Р±РѕС‚РєР° РѕС‚ Р±Р»РѕС…",
    defaultTitle: "РћР±СЂР°Р±РѕС‚РєР° РѕС‚ Р±Р»РѕС… Рё РєР»РµС‰РµР№",
    notesHint: "РќР°РїСЂРёРјРµСЂ, РїСЂРµРїР°СЂР°С‚ Рё СЂРµР°РєС†РёСЏ РїРёС‚РѕРјС†Р°",
    eventType: "flea_treatment",
  },
  worms: {
    title: "РћР±СЂР°Р±РѕС‚РєР° РѕС‚ РіР»РёСЃС‚РѕРІ",
    defaultTitle: "РџСЂРѕС„РёР»Р°РєС‚РёРєР° РѕС‚ РіР»РёСЃС‚РѕРІ",
    notesHint: "РќР°РїСЂРёРјРµСЂ, РЅР°Р·РІР°РЅРёРµ РїСЂРµРїР°СЂР°С‚Р° Рё РґРѕР·РёСЂРѕРІРєР°",
    eventType: "other",
  },
  rabies: {
    title: "Р’Р°РєС†РёРЅР°С†РёСЏ РѕС‚ Р±РµС€РµРЅСЃС‚РІР°",
    defaultTitle: "Р’Р°РєС†РёРЅР°С†РёСЏ РѕС‚ Р±РµС€РµРЅСЃС‚РІР°",
    notesHint: "РќР°РїСЂРёРјРµСЂ, РЅР°Р·РІР°РЅРёРµ РІР°РєС†РёРЅС‹ Рё СЃРµСЂРёСЏ",
    eventType: "vaccine",
  },
  infection: {
    title: "Р’Р°РєС†РёРЅР°С†РёСЏ РѕС‚ РёРЅС„РµРєС†РёРё",
    defaultTitle: "РљРѕРјРїР»РµРєСЃРЅР°СЏ РІР°РєС†РёРЅР°С†РёСЏ",
    notesHint: "РќР°РїСЂРёРјРµСЂ, РєР°РєРѕР№ РєРѕРјРїР»РµРєСЃ РїРѕСЃС‚Р°РІРёР»Рё",
    eventType: "vaccine",
  },
  vet: {
    title: "РџСЂРёРµРј Сѓ РІРµС‚РµСЂРёРЅР°СЂР°",
    defaultTitle: "РџСЂРёРµРј Сѓ РІРµС‚РµСЂРёРЅР°СЂР°",
    notesHint: "РќР°РїСЂРёРјРµСЂ, Р¶Р°Р»РѕР±С‹, РЅР°Р·РЅР°С‡РµРЅРёСЏ Рё СЂРµРєРѕРјРµРЅРґР°С†РёРё",
    eventType: "vet_visit",
  },
  custom: {
    title: "Р”СЂСѓРіРѕРµ СЃРѕР±С‹С‚РёРµ",
    defaultTitle: "РџСЂРѕС†РµРґСѓСЂР° РґР»СЏ РїРёС‚РѕРјС†Р°",
    notesHint: "РљРѕСЂРѕС‚РєРѕ РѕРїРёС€Рё, С‡С‚Рѕ СЃРґРµР»Р°Р»Рё",
    eventType: "other",
  },
};

function getSafeType(value: string | undefined): ProcedureRouteType {
  if (
    value === "fleas" ||
    value === "worms" ||
    value === "rabies" ||
    value === "infection" ||
    value === "vet" ||
    value === "custom"
  ) {
    return value;
  }

  return "custom";
}

function toDateTimeString(date: string) {
  return `${date}T12:00:00`;
}

function buildNotes(doneDate: string, notes: string, nextDate: string) {
  const chunks = [`Р’С‹РїРѕР»РЅРµРЅРѕ: ${doneDate}`];

  if (nextDate) {
    chunks.push(`РЎР»РµРґСѓСЋС‰РµРµ РЅР°РїРѕРјРёРЅР°РЅРёРµ: ${nextDate}`);
  }

  if (notes.trim()) {
    chunks.push(notes.trim());
  }

  return chunks.join("\n");
}

export default function ProcedurePageLive() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const params = useParams();
  const safeType = getSafeType(params.type);
  const config = procedureConfig[safeType];

  const petsQuery = useQuery({
    queryKey: ["pets"],
    queryFn: getPets,
  });

  const pet = useMemo(() => pickActivePet(petsQuery.data ?? []), [petsQuery.data]);
  const today = new Date().toISOString().slice(0, 10);
  const [title, setTitle] = useState(config.defaultTitle);
  const [doneDate, setDoneDate] = useState(today);
  const [nextDate, setNextDate] = useState("");
  const [notes, setNotes] = useState("");
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    syncActivePet(pet);
  }, [pet]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!pet?.id) {
        throw new Error("РЎРЅР°С‡Р°Р»Р° СЃРѕР·РґР°Р№ РїРёС‚РѕРјС†Р° РІ РїР°СЃРїРѕСЂС‚Рµ");
      }

      if (!title.trim()) {
        throw new Error("Р”РѕР±Р°РІСЊ РЅР°Р·РІР°РЅРёРµ РїСЂРѕС†РµРґСѓСЂС‹");
      }

      if (!doneDate) {
        throw new Error("РЈРєР°Р¶Рё РґР°С‚Сѓ РІС‹РїРѕР»РЅРµРЅРёСЏ");
      }

      const completedEvent = await createEvent({
        pet_id: pet.id,
        type: config.eventType,
        title: title.trim(),
        scheduled_at: toDateTimeString(doneDate),
        notes: buildNotes(doneDate, notes, nextDate),
      });

      await completeEvent(completedEvent.id);

      if (nextDate) {
        await createEvent({
          pet_id: pet.id,
          type: config.eventType,
          title: `${title.trim()} - РїРѕРІС‚РѕСЂ`,
          scheduled_at: toDateTimeString(nextDate),
          notes: notes.trim() || null,
        });
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      navigate("/passport");
    },
    onError: (error: Error) => {
      setErrorText(error.message || "РќРµ СѓРґР°Р»РѕСЃСЊ СЃРѕС…СЂР°РЅРёС‚СЊ РїСЂРѕС†РµРґСѓСЂСѓ");
    },
  });

  return (
    <AppLayout>
      <div className="P-ProcedurePage">
        <header className="O-ProcedureHeader">
          <button type="button" className="O-ProcedureHeader__back" onClick={() => navigate("/passport")} aria-label="Назад"><img src={arrowIcon} alt="Назад" className="A-IconImage A-IconImage--md" /></button>

          <h1 className="O-ProcedureHeader__title">{config.title}</h1>
        </header>

        {!pet && !petsQuery.isLoading ? (
          <section className="O-ProcedureCard">
            <p className="P-ProcedurePage__error">
              РЎРЅР°С‡Р°Р»Р° СЃРѕР·РґР°Р№ РїРёС‚РѕРјС†Р°, С‡С‚РѕР±С‹ РїСЂРёРІСЏР·Р°С‚СЊ Рє РЅРµРјСѓ РїСЂРѕС†РµРґСѓСЂСѓ.
            </p>
            <Link className="A-ProcedureSaveButton" to="/passport/edit">
              РћС‚РєСЂС‹С‚СЊ РїР°СЃРїРѕСЂС‚
            </Link>
          </section>
        ) : (
          <section className="O-ProcedureCard">
            <label className="O-ProcedureField O-ProcedureField--accent">
              <span className="O-ProcedureField__label">Р”Р°С‚Р° РІС‹РїРѕР»РЅРµРЅРёСЏ</span>
              <input
                className="O-ProcedureField__input"
                type="date"
                value={doneDate}
                onChange={(event) => {
                  setDoneDate(event.target.value);
                  if (errorText) setErrorText("");
                }}
              />
            </label>

            <label className="O-ProcedureField">
              <span className="O-ProcedureField__label">РќР°Р·РІР°РЅРёРµ РїСЂРѕС†РµРґСѓСЂС‹</span>
              <input
                className="O-ProcedureField__input O-ProcedureField__input--single"
                type="text"
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                  if (errorText) setErrorText("");
                }}
                placeholder={config.defaultTitle}
              />
            </label>

            <label className="O-ProcedureField">
              <span className="O-ProcedureField__label">РЎР»РµРґСѓСЋС‰РµРµ РЅР°РїРѕРјРёРЅР°РЅРёРµ</span>
              <input
                className="O-ProcedureField__input"
                type="date"
                value={nextDate}
                onChange={(event) => setNextDate(event.target.value)}
              />
            </label>

            <label className="O-ProcedureField">
              <span className="O-ProcedureField__label">РљРѕРјРјРµРЅС‚Р°СЂРёР№</span>
              <input
                className="O-ProcedureField__input O-ProcedureField__input--single"
                type="text"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder={config.notesHint}
              />
            </label>

            {pet ? (
              <div className="P-ProcedurePage__error">
                РЎРѕС…СЂР°РЅСЏСЋ Р·Р°РїРёСЃСЊ РґР»СЏ РїРёС‚РѕРјС†Р°: {pet.name}
              </div>
            ) : null}

            {errorText ? <div className="P-ProcedurePage__error">{errorText}</div> : null}

            <button
              type="button"
              className="A-ProcedureSaveButton"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || petsQuery.isLoading}
            >
              {saveMutation.isPending ? "РЎРѕС…СЂР°РЅСЏСЋ..." : "РЎРѕС…СЂР°РЅРёС‚СЊ"}
            </button>
          </section>
        )}
      </div>
    </AppLayout>
  );
}


