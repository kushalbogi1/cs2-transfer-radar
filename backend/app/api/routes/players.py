from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.db.database import get_db
from app.db.models import Player, TeamRoster


router = APIRouter(prefix="/players", tags=["players"])


@router.get("/")
def list_players(db: Session = Depends(get_db)):
    players = db.execute(
        select(Player)
        .options(
            joinedload(Player.role_assignment),
            joinedload(Player.roster_entries).joinedload(TeamRoster.team),
        )
        .order_by(Player.nickname)
    ).unique().scalars().all()

    result = []
    for player in players:
        active_team = None
        for roster in player.roster_entries:
            if roster.is_active:
                active_team = roster.team.name
                break

        result.append(
            {
                "id": player.id,
                "nickname": player.nickname,
                "full_name": player.full_name,
                "nationality": player.nationality,
                "age": player.age,
                "role": player.role_assignment.primary_role if player.role_assignment else None,
                "team": active_team,
                "strength_score": player.strength_score,
            }
        )

    return result


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

    active_team = None
    for roster in player.roster_entries:
        if roster.is_active:
            active_team = {
                "team_id": roster.team.id,
                "team_name": roster.team.name,
            }
            break

    return {
        "id": player.id,
        "nickname": player.nickname,
        "full_name": player.full_name,
        "nationality": player.nationality,
        "age": player.age,
        "strength_score": player.strength_score,
        "primary_role": player.role_assignment.primary_role if player.role_assignment else None,
        "secondary_role": player.role_assignment.secondary_role if player.role_assignment else None,
        "current_team": active_team,
    }