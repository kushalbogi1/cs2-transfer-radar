from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc, select
from sqlalchemy.orm import Session, joinedload

from app.db.database import get_db
from app.db.models import Player, PlayerSnapshot, TeamRoster

router = APIRouter(prefix="/players", tags=["players"])


def get_active_team_name(player: Player) -> str | None:
    for roster_entry in player.roster_entries:
        if roster_entry.is_active and roster_entry.team:
            return roster_entry.team.name
    return None


def get_latest_snapshot(db: Session, player_id: int):
    return db.execute(
        select(PlayerSnapshot)
        .where(PlayerSnapshot.player_id == player_id)
        .order_by(desc(PlayerSnapshot.snapshot_date), desc(PlayerSnapshot.id))
    ).scalars().first()


@router.get("/")
def get_players(db: Session = Depends(get_db)):
    players = db.execute(
        select(Player).options(
            joinedload(Player.role_assignment),
            joinedload(Player.roster_entries).joinedload(TeamRoster.team),
        )
    ).unique().scalars().all()

    payload = []
    for player in players:
        latest_snapshot = get_latest_snapshot(db, player.id)

        primary_role = player.role_assignment.primary_role if player.role_assignment else None
        secondary_role = player.role_assignment.secondary_role if player.role_assignment else None

        payload.append(
            {
                "id": player.id,
                "nickname": player.nickname,
                "full_name": player.full_name,
                "nationality": player.nationality,
                "age": player.age,
                "role": primary_role,
                "primary_role": primary_role,
                "secondary_role": secondary_role,
                "strength_score": player.strength_score,
                "current_rating": latest_snapshot.rating if latest_snapshot else None,
                "team": get_active_team_name(player),
                "status": player.status,
                "market_value_tier": player.market_value_tier,
            }
        )

    # Public-facing ranking now uses rating first, then strength as fallback
    payload.sort(
        key=lambda p: (
            -(p["current_rating"] if p["current_rating"] is not None else -1),
            -(p["strength_score"] if p["strength_score"] is not None else -1),
            p["nickname"].lower(),
        )
    )

    for idx, player in enumerate(payload, start=1):
        player["rank"] = idx

    return payload


@router.get("/{player_id}")
def get_player(player_id: int, db: Session = Depends(get_db)):
    player = db.execute(
        select(Player)
        .where(Player.id == player_id)
        .options(
            joinedload(Player.role_assignment),
            joinedload(Player.roster_entries).joinedload(TeamRoster.team),
        )
    ).unique().scalar_one_or_none()

    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    latest_snapshot = get_latest_snapshot(db, player.id)

    primary_role = player.role_assignment.primary_role if player.role_assignment else None
    secondary_role = player.role_assignment.secondary_role if player.role_assignment else None

    return {
        "id": player.id,
        "nickname": player.nickname,
        "full_name": player.full_name,
        "nationality": player.nationality,
        "age": player.age,
        "role": primary_role,
        "primary_role": primary_role,
        "secondary_role": secondary_role,
        "strength_score": player.strength_score,
        "current_rating": latest_snapshot.rating if latest_snapshot else None,
        "team": get_active_team_name(player),
        "status": player.status,
        "market_value_tier": player.market_value_tier,
    }