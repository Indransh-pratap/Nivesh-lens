import uuid

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user_id
from app.db.dependencies import get_db
from app.schemas.portfolio import PortfolioCreate, PortfolioResponse
from app.services import portfolio_service

router = APIRouter(prefix="/portfolios")


def not_found() -> None:
    from fastapi import HTTPException

    raise HTTPException(status_code=404, detail="Portfolio not found")


@router.get("", response_model=list[PortfolioResponse])
def get_portfolios(db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)) -> list[PortfolioResponse]:
    return portfolio_service.list_portfolios(db, user_id)


@router.post("", response_model=PortfolioResponse, status_code=status.HTTP_201_CREATED)
def post_portfolio(payload: PortfolioCreate, db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)) -> PortfolioResponse:
    return portfolio_service.create_portfolio(db, user_id, payload)


@router.get("/{portfolio_id}", response_model=PortfolioResponse)
def get_portfolio(portfolio_id: uuid.UUID, db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)) -> PortfolioResponse:
    try:
        return portfolio_service.get_owned_portfolio(db, user_id, portfolio_id)
    except portfolio_service.PortfolioNotFoundError:
        not_found()


@router.delete("/{portfolio_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_portfolio(portfolio_id: uuid.UUID, db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)) -> Response:
    try:
        portfolio_service.delete_portfolio(db, user_id, portfolio_id)
    except portfolio_service.PortfolioNotFoundError:
        not_found()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
