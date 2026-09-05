import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { acceptPetTransfer, getPetTransfer } from "@/entities/petTransfer/api";
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

  const acceptMutation = useMutation({
    mutationFn: () => acceptPetTransfer(token),
    onSuccess: async (acceptedTransfer) => {
      await queryClient.invalidateQueries();
      trackEvent("pet_transfer_accepted", { pet_id: acceptedTransfer.pet_id });
      showToast("Питомец добавлен в ваш аккаунт", "success");
      navigate(`/passport/${acceptedTransfer.pet_id}`, { replace: true });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Не удалось принять питомца";
      showToast(message, "error");
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
        ) : (
          <section className="P-PetTransfer__card">
            <p className="P-PetTransfer__eyebrow">
              {formatSpecies(transfer.pet_species)} готова к передаче
            </p>
            <h1>{transfer.pet_name}</h1>
            <p>
              {transfer.from_user_name
                ? `${transfer.from_user_name} передает вам паспорт питомца.`
                : "Вам передают паспорт питомца."}
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
