import type { EventItem } from "@/entities/event/api";
import type { Pet } from "@/entities/pet/api";
import { trackEvent } from "@/shared/analytics/metrica";
import { formatHealthFeatureNotes } from "@/shared/lib/healthFeatures";

type PdfContent =
  | { text: string | string[]; [key: string]: unknown }
  | { image: string; [key: string]: unknown }
  | { columns: unknown[]; [key: string]: unknown }
  | { stack: unknown[]; [key: string]: unknown }
  | { canvas: unknown[]; [key: string]: unknown };

type PdfDocumentDefinition = {
  pageSize: string;
  pageMargins: [number, number, number, number];
  content: PdfContent[];
  defaultStyle?: Record<string, unknown>;
  styles?: Record<string, Record<string, unknown>>;
};

type NavigatorWithShare = Navigator & {
  canShare?: (data?: ShareData) => boolean;
  share?: (data?: ShareData) => Promise<void>;
};

const PDF_FILE_PREFIX = "smartpet-vetpassport";

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

function sanitizeFileNamePart(value: string) {
  return value.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "");
}

function toDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Не удалось прочитать изображение"));
    };

    reader.onerror = () => reject(new Error("Не удалось подготовить фото для PDF"));
    reader.readAsDataURL(blob);
  });
}

async function getPhotoDataUrl(photoUrl: string | null) {
  if (!photoUrl) return null;

  try {
    const response = await fetch(photoUrl);
    if (!response.ok) return null;

    const blob = await response.blob();
    if (!blob.type.startsWith("image/")) return null;

    return await toDataUrl(blob);
  } catch {
    return null;
  }
}

function buildInfoRow(label: string, value: string) {
  return {
    columns: [
      { text: label, color: "#7c7190", width: "*" },
      { text: value, bold: true, alignment: "right", width: "auto" },
    ],
    columnGap: 16,
    margin: [0, 0, 0, 10] as [number, number, number, number],
  };
}

function buildSectionCard(title: string, rows: PdfContent[]) {
  return {
    stack: [
      { text: title, style: "sectionTitle", margin: [0, 0, 0, 14] as [number, number, number, number] },
      ...rows,
    ],
    style: "card",
  };
}

function buildEventsCard(events: EventItem[]) {
  if (events.length === 0) {
    return buildSectionCard("История процедур и лекарств", [
      { text: "Пока нет добавленных событий.", color: "#7c7190" },
    ]);
  }

  const eventBlocks = events.flatMap((event, index) => {
    const block: PdfContent[] = [
      {
        columns: [
          { text: event.title, bold: true, fontSize: 14, width: "*" },
          {
            text: event.is_done ? "Выполнено" : "Запланировано",
            color: "#7c7190",
            alignment: "right",
            width: "auto",
          },
        ],
        columnGap: 12,
      },
      { text: `Тип: ${formatEventType(event.type)}`, margin: [0, 6, 0, 0] as [number, number, number, number] },
      { text: `Дата: ${formatDate(event.scheduled_at)}`, margin: [0, 3, 0, 0] as [number, number, number, number] },
    ];

    if (event.notes) {
      block.push({
        text: `Комментарий: ${event.notes}`,
        margin: [0, 3, 0, 0] as [number, number, number, number],
      });
    }

    if (index < events.length - 1) {
      block.push({
        canvas: [
          {
            type: "line",
            x1: 0,
            y1: 8,
            x2: 480,
            y2: 8,
            lineWidth: 1,
            lineColor: "#ebe1f5",
          },
        ],
        margin: [0, 12, 0, 12] as [number, number, number, number],
      });
    }

    return block;
  });

  return buildSectionCard("История процедур и лекарств", eventBlocks);
}

function buildDocumentDefinition(pet: Pet, events: EventItem[], photoDataUrl: string | null): PdfDocumentDefinition {
  const sortedEvents = [...events].sort(
    (left, right) =>
      new Date(right.scheduled_at).getTime() - new Date(left.scheduled_at).getTime(),
  );

  const vaccineEvent = sortedEvents.find((event) => event.type === "vaccine");
  const healthFeatures = formatHealthFeatureNotes(pet.chronic_conditions_notes);
  const photoBlock = photoDataUrl
    ? {
        image: photoDataUrl,
        width: 92,
        height: 92,
        fit: [92, 92],
        margin: [0, 0, 16, 0] as [number, number, number, number],
      }
    : {
        stack: [
          {
            text: pet.name.slice(0, 1).toUpperCase(),
            style: "heroInitial",
          },
        ],
        width: 92,
        height: 92,
        fillColor: "#d9bef6",
        margin: [0, 0, 16, 0] as [number, number, number, number],
      };

  return {
    pageSize: "A4",
    pageMargins: [28, 28, 28, 32],
    defaultStyle: {
      font: "Roboto",
      fontSize: 11,
      color: "#2b2240",
      lineHeight: 1.25,
    },
    styles: {
      card: {
        fillColor: "#ffffff",
        margin: [0, 0, 0, 16],
      },
      eyebrow: {
        fontSize: 10,
        color: "#7c7190",
      },
      heroName: {
        fontSize: 24,
        bold: true,
      },
      heroMeta: {
        fontSize: 13,
        color: "#7c7190",
      },
      heroInitial: {
        fontSize: 34,
        bold: true,
        alignment: "center",
        margin: [0, 28, 0, 0],
      },
      sectionTitle: {
        fontSize: 17,
        bold: true,
      },
      brand: {
        fontSize: 11,
        color: "#7c7190",
        alignment: "right",
      },
    },
    content: [
      {
        stack: [
          {
            columns: [
              photoBlock,
              {
                width: "*",
                stack: [
                  { text: "Ветпаспорт", style: "eyebrow", margin: [0, 6, 0, 6] as [number, number, number, number] },
                  { text: pet.name, style: "heroName" },
                  { text: `${formatSpecies(pet)} • ${formatSex(pet.sex)}`, style: "heroMeta", margin: [0, 6, 0, 0] as [number, number, number, number] },
                ],
              },
            ],
          },
        ],
        style: "card",
      },
      buildSectionCard("Данные питомца", [
        buildInfoRow("Питомец", formatSpecies(pet)),
        buildInfoRow("Пол", formatSex(pet.sex)),
        buildInfoRow("Порода", pet.breed || "Не указано"),
        buildInfoRow("Окрас", pet.color || "Не указано"),
        buildInfoRow("Дата рождения", formatDate(pet.birthdate)),
      ]),
      buildSectionCard("Медицинская информация", [
        buildInfoRow("Вес", formatWeight(pet.weight_kg)),
        buildInfoRow(
          pet.sex === "female" ? "Стерилизована" : "Кастрирован",
          pet.is_neutered ? "Да" : "Нет",
        ),
        buildInfoRow(
          "Вакцинация",
          pet.vaccination_date ? formatDate(pet.vaccination_date) : "Нет данных",
        ),
        buildInfoRow("Препарат вакцинации", vaccineEvent?.notes || "Не указан"),
        buildInfoRow(
          "Обработка от паразитов",
          pet.has_parasite_treatment
            ? [pet.flea_treatment_date, pet.worm_treatment_date]
                .filter(Boolean)
                .map(formatDate)
                .join(", ") || "Есть"
            : "Нет",
        ),
        buildInfoRow(
          "Средства от паразитов",
          [pet.flea_treatment_product, pet.worm_treatment_product]
            .filter(Boolean)
            .join(", ") || "Не указаны",
        ),
        buildInfoRow(
          "Особенности здоровья",
          pet.has_chronic_conditions ? healthFeatures.join(", ") || "Есть" : "Нет",
        ),
        buildInfoRow("Операции", pet.had_surgeries ? pet.surgeries_notes || "Были" : "Нет"),
        buildInfoRow("Микрочип", pet.has_microchip ? pet.microchip_number || "Есть" : "Нет"),
      ]),
      buildEventsCard(sortedEvents),
      {
        text: "SmartPet",
        style: "brand",
      },
    ],
  };
}

async function loadPdfMake() {
  const [pdfMakeModule, pdfFontsModule] = await Promise.all([
    import("pdfmake/build/pdfmake"),
    import("pdfmake/build/vfs_fonts"),
  ]);

  const pdfMake = (pdfMakeModule as { default?: Record<string, unknown> }).default ?? pdfMakeModule;
  const vfs = (pdfFontsModule as { default?: Record<string, unknown> }).default ?? pdfFontsModule;
  const scopedPdfMake = pdfMake as Record<string, unknown> & {
    addVirtualFileSystem?: (virtualFs: unknown) => void;
    vfs?: unknown;
    createPdf: (docDefinition: PdfDocumentDefinition) => {
      getBlob: (callback: (blob: Blob) => void) => void;
      download: (fileName: string) => void;
    };
  };

  if (typeof scopedPdfMake.addVirtualFileSystem === "function") {
    scopedPdfMake.addVirtualFileSystem(vfs);
  } else {
    scopedPdfMake.vfs = vfs;
  }

  return scopedPdfMake;
}

function getPdfBlob(
  pdfMake: Awaited<ReturnType<typeof loadPdfMake>>,
  docDefinition: PdfDocumentDefinition,
) {
  return new Promise<Blob>((resolve, reject) => {
    try {
      pdfMake.createPdf(docDefinition).getBlob((blob) => resolve(blob));
    } catch (error) {
      reject(error);
    }
  });
}

async function trySharePdf(fileName: string, blob: Blob) {
  const nav = navigator as NavigatorWithShare;
  if (typeof nav.share !== "function" || typeof File === "undefined") {
    return false;
  }

  const file = new File([blob], fileName, { type: "application/pdf" });
  const shareData: ShareData = {
    files: [file],
    title: "Ветпаспорт SmartPet",
  };

  if (typeof nav.canShare === "function" && !nav.canShare(shareData)) {
    return false;
  }

  await nav.share(shareData);
  return true;
}

function downloadPdf(fileName: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function openPassportPdf(pet: Pet, events: EventItem[]) {
  const [pdfMake, photoDataUrl] = await Promise.all([
    loadPdfMake(),
    getPhotoDataUrl(pet.photo_url),
  ]);
  const docDefinition = buildDocumentDefinition(pet, events, photoDataUrl);
  const blob = await getPdfBlob(pdfMake, docDefinition);
  const safeName = sanitizeFileNamePart(pet.name) || "pet";
  const fileName = `${PDF_FILE_PREFIX}-${safeName}.pdf`;

  try {
    const shared = await trySharePdf(fileName, blob);
    if (!shared) {
      downloadPdf(fileName, blob);
    }
  } catch {
    downloadPdf(fileName, blob);
  }

  trackEvent("passport_pdf_exported", {
    pet_id: pet.id,
    events_count: events.length,
  });
}
