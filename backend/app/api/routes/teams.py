from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.db.database import get_db
from app.db.models import Team, TeamRoster, Player


router = APIRouter(prefix="/teams", tags=["teams"])


@router.get("/")
def list_teams(db: Session = Depends(get_db)):
    teams = db.execute(select(Team).order_by(Team.name)).scalars().all()

    return [
        {
            "id": team.id,
            "name": team.name,
            "slug": team.slug,
            "region": team.region,
            "is_tracked": team.is_tracked,
        }
        for team in teams
    ]


@router.get("/{team_id}")
def get_team(team_id: int, db: Session = Depends(get_db)):
    team = db.execute(
        select(Team)
        .where(Team.id == team_id)
        .options(
            joinedload(Team.rosters)
            .joinedload(TeamRoster.player)
            .joinedload(Player.role_assignment)
        )
    ).unique().scalar_one_or_none()

    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    roster = []
    for entry in team.rosters:
        if not entry.is_active:
            continue

        role = entry.player.role_assignment.primary_role if entry.player.role_assignment else None

        roster.append(
            {
                "player_id": entry.player.id,
                "nickname": entry.player.nickname,
                "full_name": entry.player.full_name,
                "nationality": entry.player.nationality,
                "age": entry.player.age,
                "strength_score": entry.player.strength_score,
                "role": role,
            }
        )

    return {
        "id": team.id,
        "name": team.name,
        "slug": team.slug,
        "region": team.region,
        "roster": sorted(roster, key=lambda x: x["nickname"].lower()),
    }