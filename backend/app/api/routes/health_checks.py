import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.health_check import HealthCheckCreate, HealthCheckResponse
from app.services.health_checks import create_health_check, list_health_checks
from app.services.subscriptions import assert_can_use_health_tracker

router = APIRouter(prefix="/health-checks", tags=["health-checks"])


@router.get("", response_model=list[HealthCheckResponse])
def get_health_checks(
    pet_id: uuid.UUID | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        assert_can_use_health_tracker(current_user)
        return list_health_checks(db=db, user=current_user, pet_id=pet_id)
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e)) from e


@router.post("", response_model=HealthCheckResponse, status_code=status.HTTP_201_CREATED)
def create_health_check_route(
    payload: HealthCheckCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        assert_can_use_health_tracker(current_user)
        return create_health_check(db=db, user=current_user, payload=payload)
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e)) from e
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
