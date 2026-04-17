import { Link } from "react-router-dom";
import checkIcon from "../../shared/ui/icons/check-mark-icon.svg";
import editIcon from "../../shared/ui/icons/edit-icon.svg";
import "./pet-card.css";

type DashboardPetCardProps = {
  name: string;
  ageText: string;
  weightText: string;
  statusText: string;
  eventLabel: string;
  eventTitle: string;
  eventDate: string;
  nextCheckLabel: string;
  nextCheckDate?: string;
  imageUrl?: string;
  to?: string;
  onSelect?: () => void;
};

export default function DashboardPetCard({
  name,
  ageText,
  weightText,
  statusText,
  eventLabel,
  eventTitle,
  eventDate,
  nextCheckLabel,
  nextCheckDate,
  imageUrl,
  to,
  onSelect,
}: DashboardPetCardProps) {
  const content = (
    <section className="O-PetCard">
      <div className="O-PetCard__top">
        <div className="O-PetCard__photoWrap">
          {imageUrl ? (
            <img src={imageUrl} alt={name} className="O-PetCard__photo" />
          ) : (
            <div className="O-PetCard__photo O-PetCard__photo--empty">Фото</div>
          )}
        </div>

        <div className="O-PetCard__content">
          <div className="O-PetCard__name">{name}</div>

          <div className="O-PetCard__meta">
            {ageText} • {weightText}
          </div>

          <div className="O-PetCard__status">
            <img
              src={checkIcon}
              alt=""
              className="A-IconImage A-IconImage--sm"
            />
            <span>{statusText}</span>
          </div>

          <div className="O-PetCard__lastEventBlock">
            <div className="O-PetCard__lastEventLabel">{eventLabel}</div>
            <div className="O-PetCard__lastEventTitle">{eventTitle}</div>
            {eventDate ? (
              <div className="O-PetCard__lastEventDate">{eventDate}</div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="O-PetCard__divider" />

      <div className="O-PetCard__bottom">
        <div className="O-PetCard__bottomTitle">{nextCheckLabel}</div>

        {nextCheckDate ? (
          <div className="O-PetCard__checkRow">
            <img src={editIcon} alt="" className="A-IconImage A-IconImage--sm" />
            <span>{nextCheckDate}</span>
          </div>
        ) : (
          <div className="O-PetCard__checkRow">
            <span>Пока ничего не запланировано</span>
          </div>
        )}
      </div>
    </section>
  );

  if (to) {
    return (
      <Link className="O-PetCard__link" to={to} onClick={onSelect}>
        {content}
      </Link>
    );
  }

  return content;
}
