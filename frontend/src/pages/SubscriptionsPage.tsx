import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Shield, Sparkles } from "lucide-react";
import { trackEvent } from "@/shared/analytics/metrica";
import { getPlatformSupportLabel, openPlatformSupport } from "@/shared/platform/support";
import AppLayout from "../widgets/layout/AppLayout";
import arrowIcon from "../shared/ui/icons/arrow-icon.svg";
import "./subscriptions-page.css";

type Plan = {
  id: string;
  name: string;
  price: string;
  badge?: string;
  features: string[];
};

const plans: Plan[] = [
  {
    id: "basic",
    name: "Базовый набор",
    price: "Бесплатно",
    features: [
      "До 5 напоминаний",
      "Возможность добавить одного питомца",
      "Ограниченная версия вет паспорта",
    ],
  },
  {
    id: "premium",
    name: "Премиум",
    price: "199 ₽ в месяц",
    badge: "Популярно",
    features: [
      "Бесконечное количество напоминаний",
      "Возможность добавить второго питомца",
      "Расширенная версия вет паспорта",
      "Трекер здоровья",
    ],
  },
  {
    id: "family",
    name: "Семейная",
    price: "349 ₽ в месяц",
    features: [
      "Неограниченное количество питомцев",
      "Бесконечное количество напоминаний",
      "Расширенная версия вет паспорта",
      "Трекер здоровья",
    ],
  },
];

export default function SubscriptionsPage() {
  const navigate = useNavigate();
  const [selectedPlanId, setSelectedPlanId] = useState("premium");
  const supportLabel = useMemo(() => getPlatformSupportLabel(), []);

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === selectedPlanId) ?? plans[1],
    [selectedPlanId],
  );

  return (
    <AppLayout>
      <div className="P-Subscriptions">
        <header className="P-Subscriptions__header">
          <button
            type="button"
            className="P-Subscriptions__back"
            onClick={() => navigate(-1)}
          >
            <img src={arrowIcon} alt="Назад" className="A-IconImage A-IconImage--md" />
            <span>Выбор подписки</span>
          </button>
        </header>

        <section className="P-Subscriptions__hero">
          <div className="P-Subscriptions__heroGlow" />
          <div className="P-Subscriptions__heroCoins">
            <span>🪙</span>
            <span>🪙</span>
            <span>🪙</span>
          </div>

          <div className="P-Subscriptions__heroArt">
            <div className="P-Subscriptions__shield">
              <Shield size={34} strokeWidth={2.2} />
            </div>
            <div className="P-Subscriptions__cat">🐱</div>
          </div>

          <div className="P-Subscriptions__heroCopy">
            <p className="P-Subscriptions__eyebrow">Будьте уверены в уходе за питомцем</p>
            <p className="P-Subscriptions__subtext">
              Выберите тариф, который позволит не держать все важное в голове.
            </p>
          </div>
        </section>

        <section className="P-Subscriptions__plans">
          {plans.map((plan) => (
            <button
              key={plan.id}
              type="button"
              className={`P-Subscriptions__plan ${selectedPlanId === plan.id ? "is-active" : ""}`}
              onClick={() => {
                setSelectedPlanId(plan.id);
                trackEvent("subscription_plan_selected", { plan: plan.id });
              }}
            >
              <div className="P-Subscriptions__planTop">
                <div>
                  <div className="P-Subscriptions__planName">
                    {plan.id === "premium" ? "👑 " : plan.id === "family" ? "👨‍👩‍👧 " : ""}
                    {plan.name}
                  </div>
                  <div className="P-Subscriptions__planPrice">{plan.price}</div>
                </div>

                <span className="P-Subscriptions__checkbox">
                  {selectedPlanId === plan.id ? <Check size={14} /> : null}
                </span>
              </div>

              {plan.badge ? (
                <div className="P-Subscriptions__badge">
                  <Sparkles size={14} />
                  <span>{plan.badge}</span>
                </div>
              ) : null}

              <div className="P-Subscriptions__featureList">
                {plan.features.map((feature) => (
                  <div key={feature} className="P-Subscriptions__feature">
                    <span className="P-Subscriptions__featureDot">✦</span>
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </button>
          ))}
        </section>

        <section className="P-Subscriptions__footer">
          <button
            type="button"
            className="P-Subscriptions__cta"
            onClick={() => {
              trackEvent("subscription_cta_clicked", { plan: selectedPlan.id });
              openPlatformSupport();
            }}
          >
            {`Оформить подписку ${selectedPlan.name}`}
          </button>
          <p className="P-Subscriptions__hint">
            После выбора просто напишите нам тут: <strong>{supportLabel}</strong>
          </p>
        </section>
      </div>
    </AppLayout>
  );
}
