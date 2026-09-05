import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAdminMe, updateOwnSubscription } from "@/entities/admin/api";
import { getCurrentUser } from "@/entities/user/api";
import type { AuthUser } from "@/shared/auth/requests";
import { trackButtonClick, trackEvent } from "@/shared/analytics/metrica";
import {
  formatSubscriptionDaysLeft,
  formatSubscriptionExpiryDate,
  getEffectivePlan,
  planLabels,
  readCurrentUser,
} from "@/shared/lib/subscription";
import { useToast } from "@/shared/ui/useToast";
import AppLayout from "../widgets/layout/AppLayout";
import arrowIcon from "../shared/ui/icons/arrow-icon.svg";
import "./admin-tariffs-page.css";

const planOptions: Array<{
  id: AuthUser["subscription_plan"];
  note: string;
}> = [
  { id: "basic", note: "Обычный бесплатный доступ" },
  { id: "premium", note: "Расширенный паспорт, PDF и трекер здоровья" },
  { id: "family", note: "Неограниченные питомцы и все Premium-функции" },
  { id: "breeder", note: "Семейные функции плюс передача питомца новому владельцу" },
];

function toDefaultExpiryDate() {
  const nextMonth = new Date();
  nextMonth.setDate(nextMonth.getDate() + 30);
  return nextMonth.toISOString().slice(0, 10);
}

function toApiDate(value: string, plan: AuthUser["subscription_plan"]) {
  if (plan === "basic") return null;
  if (!value) return null;
  return `${value}T23:59:59Z`;
}

export default function AdminTariffsPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<AuthUser["subscription_plan"]>("breeder");
  const [expiresAt, setExpiresAt] = useState(toDefaultExpiryDate);

  const userQuery = useQuery({
    queryKey: ["current-user"],
    queryFn: getCurrentUser,
    initialData: readCurrentUser,
  });

  const adminQuery = useQuery({
    queryKey: ["admin-me"],
    queryFn: getAdminMe,
    retry: false,
  });

  const currentUser = userQuery.data ?? null;
  const currentPlan = getEffectivePlan(currentUser);
  const currentPlanLabel = planLabels[currentPlan];
  const currentMeta = useMemo(() => {
    const daysLeft = formatSubscriptionDaysLeft(currentUser);
    const expiryDate = formatSubscriptionExpiryDate(currentUser);
    return expiryDate ? `${daysLeft} • до ${expiryDate}` : daysLeft;
  }, [currentUser]);

  const updateMutation = useMutation({
    mutationFn: () =>
      updateOwnSubscription({
        plan: selectedPlan,
        expires_at: toApiDate(expiresAt, selectedPlan),
      }),
    onSuccess: async (updatedUser) => {
      localStorage.setItem("current_user", JSON.stringify(updatedUser));
      await queryClient.invalidateQueries();
      trackEvent("admin_subscription_updated", { plan: updatedUser.subscription_plan });
      showToast(`Тариф обновлен: ${planLabels[updatedUser.subscription_plan]}`, "success");
    },
    onError: () => {
      showToast("Не удалось обновить тариф. Проверьте доступ админа.", "error");
    },
  });

  return (
    <AppLayout>
      <div className="P-AdminTariffs">
        <header className="P-AdminTariffs__header">
          <Link className="P-AdminTariffs__back" to="/profile">
            <img src={arrowIcon} alt="Назад" className="A-IconImage A-IconImage--md" />
            <span>Админ тарифы</span>
          </Link>
        </header>

        <section className="P-AdminTariffs__card">
          <p className="P-AdminTariffs__eyebrow">Текущий аккаунт</p>
          <h1>{currentPlanLabel}</h1>
          <p>{currentMeta}</p>
          <span className="P-AdminTariffs__pill">
            {currentUser?.platform}:{currentUser?.platform_user_id}
          </span>
        </section>

        {adminQuery.isLoading ? (
          <section className="P-AdminTariffs__card">
            <p>Проверяем админ-доступ...</p>
          </section>
        ) : !adminQuery.data?.is_admin ? (
          <section className="P-AdminTariffs__card">
            <p className="P-AdminTariffs__eyebrow">Нет доступа</p>
            <h1>Переключатель закрыт</h1>
            <p>Этот экран доступен только аккаунтам, указанным в backend whitelist.</p>
          </section>
        ) : (
          <section className="P-AdminTariffs__card">
            <p className="P-AdminTariffs__eyebrow">Переключить себе тариф</p>
            <div className="P-AdminTariffs__plans">
              {planOptions.map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  className={`P-AdminTariffs__plan ${selectedPlan === plan.id ? "is-active" : ""}`}
                  onClick={() => {
                    setSelectedPlan(plan.id);
                    trackButtonClick("admin_plan_select");
                  }}
                >
                  <strong>{planLabels[plan.id]}</strong>
                  <span>{plan.note}</span>
                </button>
              ))}
            </div>

            <label className="P-AdminTariffs__field">
              <span>Дата окончания</span>
              <input
                type="date"
                value={expiresAt}
                onChange={(event) => setExpiresAt(event.target.value)}
                disabled={selectedPlan === "basic"}
              />
            </label>

            <button
              type="button"
              className="P-AdminTariffs__primaryAction"
              disabled={updateMutation.isPending}
              onClick={() => {
                trackButtonClick("admin_plan_save");
                updateMutation.mutate();
              }}
            >
              {updateMutation.isPending ? "Сохраняем..." : "Сохранить тариф"}
            </button>
          </section>
        )}
      </div>
    </AppLayout>
  );
}
