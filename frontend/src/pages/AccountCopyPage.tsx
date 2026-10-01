import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  acceptAccountCopy,
  buildAccountCopyLinks,
  createAccountCopy,
  getAccountCopy,
  type AccountCopy,
} from "@/entities/accountCopy/api";
import { getApiErrorMessage } from "@/shared/api/errors";
import { trackButtonClick, trackEvent } from "@/shared/analytics/metrica";
import { useToast } from "@/shared/ui/useToast";
import AppLayout from "../widgets/layout/AppLayout";
import arrowIcon from "../shared/ui/icons/arrow-icon.svg";
import "./pet-transfer-page.css";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function platformLabel(platform: string) {
  return platform === "vk" ? "VK" : platform === "telegram" ? "Telegram" : platform;
}

export default function AccountCopyPage() {
  const { token } = useParams<{ token?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [createdCopy, setCreatedCopy] = useState<AccountCopy | null>(null);

  const copyQuery = useQuery({
    queryKey: ["account-copy", token],
    queryFn: () => getAccountCopy(token!),
    enabled: Boolean(token),
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: createAccountCopy,
    onSuccess: (accountCopy) => {
      setCreatedCopy(accountCopy);
      trackEvent("account_copy_link_created", {
        source_platform: accountCopy.source_platform,
        pet_count: accountCopy.pet_count,
      });
    },
    onError: (error) => {
      showToast(getApiErrorMessage(error, "Не удалось создать ссылку"), "error");
    },
  });

  const acceptMutation = useMutation({
    mutationFn: () => acceptAccountCopy(token!),
    onSuccess: async (accountCopy) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["pets"] }),
        queryClient.invalidateQueries({ queryKey: ["events"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
      trackEvent("account_copy_accepted", {
        source_platform: accountCopy.source_platform,
        pet_count: accountCopy.pet_count,
        event_count: accountCopy.event_count,
        health_check_count: accountCopy.health_check_count,
      });
      showToast(
        `Скопировано питомцев: ${accountCopy.pet_count}. Исходный аккаунт сохранён.`,
        "success",
      );
      navigate("/profile", { replace: true });
    },
    onError: (error) => {
      showToast(
        getApiErrorMessage(error, "Не удалось скопировать данные"),
        "error",
      );
    },
  });

  const accountCopy = createdCopy ?? copyQuery.data;
  const links = accountCopy ? buildAccountCopyLinks(accountCopy.token) : null;
  const isSender = Boolean(accountCopy?.is_sender || (!token && accountCopy));

  async function copyLink(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      showToast("Ссылка скопирована", "success");
    } catch {
      showToast("Не удалось скопировать ссылку", "error");
    }
  }

  return (
    <AppLayout>
      <div className="P-PetTransfer">
        <header className="P-PetTransfer__header">
          <Link className="P-PetTransfer__back" to="/profile">
            <img src={arrowIcon} alt="" />
            Профиль
          </Link>
        </header>

        {!token && !accountCopy ? (
          <section className="P-PetTransfer__card">
            <p className="P-PetTransfer__eyebrow">VK ↔ Telegram</p>
            <h1>Скопировать данные аккаунта</h1>
            <p>
              Создайте ссылку и откройте её во втором мини-приложении. Питомцы,
              напоминания и история здоровья будут скопированы, а в исходном
              аккаунте всё останется без изменений.
            </p>
            <div className="P-PetTransfer__notice">
              Доступно на всех тарифах. Ссылка действует 14 дней и принимается
              только один раз.
            </div>
            <button
              type="button"
              className="P-PetTransfer__primaryAction"
              disabled={createMutation.isPending}
              onClick={() => {
                trackButtonClick("account_copy_create");
                createMutation.mutate();
              }}
            >
              {createMutation.isPending ? "Создаём ссылку..." : "Создать ссылку"}
            </button>
          </section>
        ) : null}

        {token && copyQuery.isLoading ? (
          <section className="P-PetTransfer__card">
            <h1>Проверяем ссылку...</h1>
          </section>
        ) : null}

        {token && copyQuery.isError ? (
          <section className="P-PetTransfer__card">
            <h1>Ссылка недоступна</h1>
            <p>
              {getApiErrorMessage(
                copyQuery.error,
                "Ссылка уже использована, истекла или была отменена.",
              )}
            </p>
            <Link className="P-PetTransfer__secondaryAction" to="/profile">
              Вернуться в профиль
            </Link>
          </section>
        ) : null}

        {accountCopy && isSender && links ? (
          <section className="P-PetTransfer__card">
            <p className="P-PetTransfer__eyebrow">Ссылка готова</p>
            <h1>Откройте её во втором аккаунте</h1>
            <p>
              В копию войдут: питомцев — {accountCopy.pet_count}, напоминаний —
              {" "}{accountCopy.event_count}, записей здоровья —{" "}
              {accountCopy.health_check_count}.
            </p>
            <div className="P-PetTransfer__notice">
              Исходный аккаунт {platformLabel(accountCopy.source_platform)} не
              изменится. Ссылка действует до {formatDate(accountCopy.expires_at)}.
            </div>
            <div className="P-PetTransfer__actions">
              <a className="P-PetTransfer__primaryAction" href={links.telegram}>
                Открыть через Telegram
              </a>
              <a className="P-PetTransfer__secondaryAction" href={links.vk}>
                Открыть через VK
              </a>
              <button
                type="button"
                className="P-PetTransfer__secondaryAction"
                onClick={() => copyLink(links.web)}
              >
                Скопировать обычную ссылку
              </button>
            </div>
          </section>
        ) : null}

        {accountCopy && !isSender ? (
          <section className="P-PetTransfer__card">
            <p className="P-PetTransfer__eyebrow">
              Из {platformLabel(accountCopy.source_platform)}
            </p>
            <h1>Скопировать данные в этот аккаунт?</h1>
            <p>
              {accountCopy.from_user_name
                ? `Источник: ${accountCopy.from_user_name}.`
                : "Данные получены из второго аккаунта."}
            </p>
            <div className="P-PetTransfer__notice">
              Будут добавлены: питомцев — {accountCopy.pet_count}, напоминаний —
              {" "}{accountCopy.event_count}, записей здоровья —{" "}
              {accountCopy.health_check_count}. В исходном аккаунте данные
              останутся.
            </div>
            <button
              type="button"
              className="P-PetTransfer__primaryAction"
              disabled={acceptMutation.isPending}
              onClick={() => {
                trackButtonClick("account_copy_accept");
                acceptMutation.mutate();
              }}
            >
              {acceptMutation.isPending ? "Копируем данные..." : "Скопировать данные"}
            </button>
          </section>
        ) : null}
      </div>
    </AppLayout>
  );
}
