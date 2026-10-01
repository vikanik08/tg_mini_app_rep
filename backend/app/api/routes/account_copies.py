from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.account_copy import AccountCopyResponse
from app.services.account_copies import (
    accept_account_copy,
    cancel_account_copy,
    create_account_copy,
    get_active_account_copy,
    serialize_account_copy,
)

router = APIRouter(prefix="/account-copies", tags=["account-copies"])


@router.post("", response_model=AccountCopyResponse)
def create_account_copy_route(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        account_copy = create_account_copy(db, current_user)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error

    return serialize_account_copy(db, account_copy, current_user)


@router.get("/{token}", response_model=AccountCopyResponse)
def get_account_copy_route(
    token: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        account_copy = get_active_account_copy(db, token)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        ) from error

    return serialize_account_copy(db, account_copy, current_user)


@router.post("/{token}/accept", response_model=AccountCopyResponse)
def accept_account_copy_route(
    token: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        account_copy = accept_account_copy(db, current_user, token)
    except PermissionError as error:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(error),
        ) from error
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error

    return serialize_account_copy(db, account_copy, current_user)


@router.post("/{token}/cancel", response_model=AccountCopyResponse)
def cancel_account_copy_route(
    token: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        account_copy = cancel_account_copy(db, current_user, token)
    except PermissionError as error:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(error),
        ) from error
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        ) from error

    return serialize_account_copy(db, account_copy, current_user)
