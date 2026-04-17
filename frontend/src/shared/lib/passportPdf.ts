import type { EventItem } from "@/entities/event/api";
import type { Pet } from "@/entities/pet/api";
import { formatHealthFeatureNotes } from "@/shared/lib/healthFeatures";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Нет";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Нет";

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
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

function formatWeight(weight: string | null) {
  if (!weight) return "Нет";
  return `${String(weight).replace(".", ",")} кг`;
}

function formatEventType(type: EventItem["type"]) {
  if (type === "vaccine") return "Вакцинация";
  if (type === "flea_treatment") return "Обработка от паразитов";
  if (type === "vet_visit") return "Прием у ветеринара";
  if (type === "grooming") return "Груминг";
  return "Другое";
}

function infoRow(label: string, value: string) {
  return `
    <div class="row">
      <span class="label">${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `;
}

function buildPassportHtml(pet: Pet, events: EventItem[]) {
  const sortedEvents = [...events].sort(
    (left, right) =>
      new Date(right.scheduled_at).getTime() - new Date(left.scheduled_at).getTime(),
  );

  const vaccineEvent = sortedEvents.find((event) => event.type === "vaccine");
  const healthFeatures = formatHealthFeatureNotes(pet.chronic_conditions_notes);

  const medicalRows = [
    infoRow("Вес", formatWeight(pet.weight_kg)),
    infoRow(
      pet.sex === "female" ? "Стерилизована" : "Кастрирован",
      pet.is_neutered ? "Да" : "Нет",
    ),
    infoRow(
      "Вакцинация",
      pet.vaccination_date ? formatDate(pet.vaccination_date) : "Нет данных",
    ),
    infoRow("Препарат вакцинации", vaccineEvent?.notes || "Не указан"),
    infoRow(
      "Обработка от паразитов",
      pet.has_parasite_treatment
        ? [pet.flea_treatment_date, pet.worm_treatment_date]
            .filter(Boolean)
            .map(formatDate)
            .join(", ") || "Есть"
        : "Нет",
    ),
    infoRow(
      "Средства от паразитов",
      [pet.flea_treatment_product, pet.worm_treatment_product]
        .filter(Boolean)
        .join(", ") || "Не указаны",
    ),
    infoRow(
      "Особенности здоровья",
      pet.has_chronic_conditions ? healthFeatures.join(", ") || "Есть" : "Нет",
    ),
    infoRow("Операции", pet.had_surgeries ? pet.surgeries_notes || "Были" : "Нет"),
    infoRow("Микрочип", pet.has_microchip ? pet.microchip_number || "Есть" : "Нет"),
  ].join("");

  const eventRows =
    sortedEvents.length > 0
      ? sortedEvents
          .map(
            (event) => `
              <article class="event">
                <div class="event-top">
                  <h3>${escapeHtml(event.title)}</h3>
                  <span>${escapeHtml(event.is_done ? "Выполнено" : "Запланировано")}</span>
                </div>
                <p><strong>Тип:</strong> ${escapeHtml(formatEventType(event.type))}</p>
                <p><strong>Дата:</strong> ${escapeHtml(formatDate(event.scheduled_at))}</p>
                ${event.notes ? `<p><strong>Комментарий:</strong> ${escapeHtml(event.notes)}</p>` : ""}
              </article>
            `,
          )
          .join("")
      : `<p class="empty">Пока нет добавленных событий.</p>`;

  return `
    <!doctype html>
    <html lang="ru">
      <head>
        <meta charset="utf-8" />
        <title>Ветпаспорт — ${escapeHtml(pet.name)}</title>
        <style>
          :root {
            color-scheme: light;
          }
          body {
            margin: 0;
            font-family: Inter, Arial, sans-serif;
            background: #f3ebfc;
            color: #291f3a;
          }
          .page {
            max-width: 840px;
            margin: 0 auto;
            padding: 32px 28px 48px;
          }
          .hero,
          .card {
            background: #fff;
            border-radius: 24px;
            padding: 20px;
            box-shadow: 0 10px 28px rgba(41, 31, 58, 0.08);
          }
          .hero {
            display: grid;
            grid-template-columns: 120px minmax(0, 1fr);
            gap: 18px;
            align-items: center;
          }
          .photo {
            width: 120px;
            height: 120px;
            border-radius: 24px;
            object-fit: cover;
            background: #d9bef6;
            display: grid;
            place-items: center;
            font-size: 42px;
          }
          .stack {
            display: grid;
            gap: 18px;
            margin-top: 18px;
          }
          .brand {
            margin-top: 18px;
            text-align: right;
            color: #8e79aa;
            font-size: 12px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }
          .eyebrow {
            margin: 0 0 6px;
            font-size: 12px;
            color: #6f6b7f;
            text-transform: uppercase;
            letter-spacing: 0.08em;
          }
          h1, h2, h3, p {
            margin: 0;
          }
          h1 {
            font-size: 30px;
            line-height: 1.1;
          }
          h2 {
            font-size: 20px;
            line-height: 1.15;
            margin-bottom: 14px;
          }
          .meta {
            margin-top: 6px;
            color: #6f6b7f;
            font-size: 15px;
          }
          .row {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            gap: 16px;
            padding: 10px 0;
            border-bottom: 1px solid rgba(111, 107, 127, 0.16);
            align-items: start;
          }
          .row:last-child {
            border-bottom: none;
            padding-bottom: 0;
          }
          .label {
            color: #6f6b7f;
          }
          .event {
            border: 1px solid rgba(217, 190, 246, 0.72);
            border-radius: 18px;
            padding: 14px 16px;
            display: grid;
            gap: 8px;
            margin-bottom: 12px;
          }
          .event:last-child {
            margin-bottom: 0;
          }
          .event-top {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            align-items: start;
          }
          .event-top span {
            color: #6f6b7f;
            font-size: 13px;
            white-space: nowrap;
          }
          .empty {
            color: #6f6b7f;
          }
          @media print {
            body {
              background: #fff;
            }
            .page {
              max-width: none;
              padding: 0;
            }
            .hero,
            .card {
              box-shadow: none;
              border: 1px solid rgba(111, 107, 127, 0.14);
              break-inside: avoid;
            }
          }
        </style>
      </head>
      <body>
        <main class="page">
          <section class="hero">
            ${
              pet.photo_url
                ? `<img class="photo" src="${escapeHtml(pet.photo_url)}" alt="${escapeHtml(pet.name)}" />`
                : `<div class="photo">${escapeHtml(pet.name.slice(0, 1).toUpperCase())}</div>`
            }
            <div>
              <p class="eyebrow">Ветпаспорт</p>
              <h1>${escapeHtml(pet.name)}</h1>
              <p class="meta">${escapeHtml(formatSpecies(pet))} • ${escapeHtml(formatSex(pet.sex))}</p>
            </div>
          </section>

          <div class="stack">
            <section class="card">
              <h2>Данные питомца</h2>
              ${infoRow("Питомец", formatSpecies(pet))}
              ${infoRow("Пол", formatSex(pet.sex))}
              ${infoRow("Порода", pet.breed || "Не указано")}
              ${infoRow("Окрас", pet.color || "Не указано")}
              ${infoRow("Дата рождения", formatDate(pet.birthdate))}
            </section>

            <section class="card">
              <h2>Медицинская информация</h2>
              ${medicalRows}
            </section>

            <section class="card">
              <h2>История процедур и лекарств</h2>
              ${eventRows}
            </section>
          </div>

          <p class="brand">SmartPet</p>
        </main>
      </body>
    </html>
  `;
}

export function openPassportPdf(pet: Pet, events: EventItem[]) {
  const html = buildPassportHtml(pet, events);
  const iframe = document.createElement("iframe");

  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.setAttribute("aria-hidden", "true");

  document.body.appendChild(iframe);

  const frameWindow = iframe.contentWindow;
  if (!frameWindow) {
    iframe.remove();
    throw new Error("Не удалось подготовить PDF-экспорт");
  }

  frameWindow.document.open();
  frameWindow.document.write(html);
  frameWindow.document.close();

  const cleanup = () => {
    window.setTimeout(() => {
      iframe.remove();
    }, 1000);
  };

  iframe.onload = () => {
    frameWindow.focus();
    frameWindow.print();
    cleanup();
  };

  window.setTimeout(() => {
    try {
      frameWindow.focus();
      frameWindow.print();
    } finally {
      cleanup();
    }
  }, 250);
}



