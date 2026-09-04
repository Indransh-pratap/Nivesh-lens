import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.portfolio import Portfolio
from app.schemas.portfolio import PortfolioCreate


class PortfolioNotFoundError(Exception):
    pass


def list_portfolios(
    db: Session,
    user_id: str,
) -> list[Portfolio]:

    result = db.scalars(
        select(Portfolio)
        .options(
            selectinload(Portfolio.holdings),
            selectinload(Portfolio.transactions),
        )
        .where(
            Portfolio.user_id == user_id
        )
        .order_by(
            Portfolio.created_at.desc()
        )
    )

    return list(result.unique().all())


def create_portfolio(
    db: Session,
    user_id: str,
    payload: PortfolioCreate,
) -> Portfolio:

    portfolio = Portfolio(
        user_id=user_id,
        name=payload.name.strip(),
    )

    db.add(portfolio)
    db.commit()
    db.refresh(portfolio)

    return portfolio


def get_owned_portfolio(
    db: Session,
    user_id: str,
    portfolio_id: uuid.UUID,
) -> Portfolio:

    portfolio = db.scalar(
        select(Portfolio)
        .options(
            selectinload(Portfolio.holdings),
            selectinload(Portfolio.transactions),
        )
        .where(
            Portfolio.id == portfolio_id,
            Portfolio.user_id == user_id,
        )
    )

    if portfolio is None:
        raise PortfolioNotFoundError()

    return portfolio


def delete_portfolio(
    db: Session,
    user_id: str,
    portfolio_id: uuid.UUID,
) -> None:

    portfolio = get_owned_portfolio(
        db,
        user_id,
        portfolio_id,
    )

    db.delete(portfolio)
    db.commit()