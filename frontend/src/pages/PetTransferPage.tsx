import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  acceptPetTransfer,
  buildPetTransferLinks,
  getPetTransfer,
} from "@/entities/petTransfer/api";
import { getApiErrorMessage } from "@/shared/api/errors";
import { trackButtonClick, trackEvent } from "@/shared/analytics/metrica";
import { useToast } from "@/shared/ui/useToast";
import AppLayout from "../widgets/layout/AppLayout";
import arrowIcon from "../shared/ui/icons/arrow-icon.svg";
import "./pet-transfer-page.css";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function formatSpecies(species: string) {
  if (species === "cat") return "Кошка";
  if (species === "dog") return "Собака";
  return "Питомец";
}

export default function PetTransferPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { token = "" } = useParams();

  const transferQuery = useQuery({
    queryKey: ["pet-transfer", token],
    queryFn: () => getPetTransfer(token),
    enabled: Boolean(token),
    retry: false,
  });

  const transfer = transferQuery.data ?? null;
  const expiresAt = useMemo(
    () => (transfer ? formatDate(transfer.expires_at) : ""),
    [transfer],
  );
  const transferLinks = useMemo(
    () => (transfer ? buildPetTransferLinks(transfer.token) : null),
    [transfer],
  );

  async function copyLink(value: string, label: string) {
    try {
      await navigator.clipboard?.writeText(value);
      showToast(`${label} скопирована`, "success");
    } catch {
      showToast("Не получилось скопировать ссылку", "error");
    }
  }

  const acceptMutation = useMutation({
    mutationFn: () => acceptPetTransfer(token),
    onSuccess: async (acceptedTransfer) => {
      await queryClient.invalidateQueries();
      trackEvent("pet_transfer_accepted", { pet_id: acceptedTransfer.pet_id });
      showToast("Питомец добавлен в ваш аккаунт", "success");
      navigate(`/passport/${acceptedTransfer.pet_id}`, { replace: true });
    },
    onError: (error) => {
      showToast(getApiErrorMessage(error, "Не удалось принять питомца"), "error");
    },
  });

  return (
    <AppLayout>
      <div className="P-PetTransfer">
        <header className="P-PetTransfer__header">
          <Link className="P-PetTransfer__back" to="/">
            <img src={arrowIcon} alt="Назад" className="A-IconImage A-IconImage--md" />
            <span>Передача питомца</span>
          </Link>
        </header>

        {transferQuery.isLoading ? (
          <section className="P-PetTransfer__card">
            <p className="P-PetTransfer__eyebrow">Загрузка</p>
            <h1>Проверяем приглашение</h1>
            <p>Сейчас откроем карточку питомца.</p>
          </section>
        ) : transferQuery.isError || !transfer ? (
          <section className="P-PetTransfer__card">
            <p className="P-PetTransfer__eyebrow">Ссылка недоступна</p>
            <h1>Не получилось открыть передачу</h1>
            <p>
              Возможно, ссылка уже была использована, отменена или срок ее действия истек.
            </p>
            <Link className="P-PetTransfer__primaryAction" to="/">
              На главный экран
            </Link>
          </section>
        ) : transfer.is_sender ? (
          <section className="P-PetTransfer__card">
            <p className="P-PetTransfer__eyebrow">Ссылка создана</p>
            <h1>{transfer.pet_name}</h1>
            <p>
              Вы открыли передачу из аккаунта отправителя. Чтобы передать питомца,
              отправьте ссылку новому владельцу, а принять ее он должен уже из своего
              аккаунта Telegram или VK.
            </p>
            <div className="P-PetTransfer__notice">
              После принятия питомец исчезнет из аккаунта заводчика и появится у нового
              владельца вместе с напоминаниями и историей здоровья. Ссылка действует до
              {" "}
              {expiresAt}.
            </div>

            {transferLinks ? (
              <div className="P-PetTransfer__actions">
                <button
                  type="button"
                  className="P-PetTransfer__secondaryAction"
                  onClick={() => {
                    trackButtonClick("pet_transfer_copy_telegram");
                    void copyLink(transferLinks.telegram, "Telegram-ссылка");
                  }}
                >
                  Скопировать Telegram-ссылку
                </button>
                <button
                  type="button"
                  className="P-PetTransfer__secondaryAction"
                  onClick={() => {
                    trackButtonClick("pet_transfer_copy_vk");
                    void copyLink(transferLinks.vk, "VK-ссылка");
                  }}
                >
                  Скопировать VK-ссылку
                </button>
                <button
                  type="button"
                  className="P-PetTransfer__secondaryAction"
                  onClick={() => {
                    trackButtonClick("pet_transfer_copy_web");
                    void copyLink(transferLinks.web, "Обычная ссылка");
                  }}
                >
                  Скопировать обычную ссылку
                </button>
              </div>
            ) : null}
          </section>
        ) : (
          <section className="P-PetTransfer__card">
            <p className="P-PetTransfer__eyebrow">
              {formatSpecies(transfer.pet_species)} готова к передаче
            </p>
            <h1>{transfer.pet_name}</h1>
            <p>
              {transfer.from_user_name
                ? `${transfer.from_user_name} передает вам ветпаспорт питомца.`
                : "Вам передают ветпаспорт питомца."}
            </p>
            <div className="P-PetTransfer__notice">
              После принятия питомец, его напоминания и записи здоровья появятся в вашем аккаунте.
              Ссылка действует до {expiresAt}.
            </div>

            <button
              type="button"
              className="P-PetTransfer__primaryAction"
              disabled={acceptMutation.isPending}
              onClick={() => {
                trackButtonClick("pet_transfer_accept");
                acceptMutation.mutate();
              }}
            >
              {acceptMutation.isPending ? "Принимаем..." : "Принять питомца"}
            </button>
          </section>
        )}
      </div>
    </AppLayout>
  );
}
