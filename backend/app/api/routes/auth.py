from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.auth import TelegramAuthRequest, TokenResponse
from app.services.auth import authenticate_telegram_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/telegram", response_model=TokenResponse)
def telegram_auth(payload: TelegramAuthRequest, db: Session = Depends(get_db)):
    try:
        token, user = authenticate_telegram_user(payload.init_data, db)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        ) from e

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user,
    }
