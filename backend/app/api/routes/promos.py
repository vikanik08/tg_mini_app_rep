from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.promo import PromoRedeemRequest, PromoRedeemResponse
from app.services.promos import redeem_premium_promo

router = APIRouter(prefix="/promos", tags=["promos"])


@router.post("/redeem", response_model=PromoRedeemResponse)
def redeem_promo(
    payload: PromoRedeemRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        user, already_redeemed = redeem_premium_promo(db, current_user, payload.code)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        ) from e

    return {
        "code": payload.code.strip().lower(),
        "plan": user.subscription_plan,
        "expires_at": user.subscription_expires_at,
        "already_redeemed": already_redeemed,
        "user": user,
    }
