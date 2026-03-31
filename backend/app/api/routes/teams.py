from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.db.database import get_db
from app.db.models import Player, Team, TeamRoster

router = APIRouter(prefix="/teams", tags=["teams"])


def build_active_roster(team: Team):
    active_entries = [entry for entry in team.rosters if entry.is_active and entry.player]
    active_players = [entry.player for entry in active_entries]

    roster_payload = []
    strengths = []

    for player in active_players:
        role = player.role_assignment.primary_role if player.role_assignment else None
        secondary_role = player.role_assignment.secondary_role if player.role_assignment else None

        roster_payload.append(
            {
                "player_id": player.id,
                "nickname": player.nickname,
                "full_name": player.full_name,
                "nationality": player.nationality,
                "age": player.age,
                "role": role,
                "secondary_role": secondary_role,
                "strength_score": player.strength_score,
            }
        )

        if player.strength_score is not None:
            strengths.append(player.strength_score)

    average_strength = round(sum(strengths) / len(strengths), 2) if strengths else None

    return roster_payload, average_strength


@router.get("/")
def get_teams(db: Session = Depends(get_db)):
    teams = db.execute(
        select(Team).options(
            joinedload(Team.rosters)
            .joinedload(TeamRoster.player)
            .joinedload(Player.role_assignment)
        )
    ).unique().scalars().all()

    ranked_teams = []
    for team in teams:
        roster_payload, average_strength = build_active_roster(team)

        ranked_teams.append(
            {
                "id": team.id,
                "name": team.name,
                "slug": team.slug,
                "region": team.region,
                "is_tracked": team.is_tracked,
                "competitive_tier": team.competitive_tier,
                "average_strength": average_strength,
                "active_players": [
                    player["nickname"] for player in roster_payload[:5]
                ],
                "active_player_count": len(roster_payload),
            }
        )

    ranked_teams.sort(
        key=lambda t: (
            -(t["average_strength"] if t["average_strength"] is not None else -1),
            t["name"].lower(),
        )
    )

    for idx, team in enumerate(ranked_teams, start=1):
        team["rank"] = idx

    return ranked_teams


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

    roster_payload, average_strength = build_active_roster(team)

    roster_payload.sort(
        key=lambda p: (
            -(p["strength_score"] if p["strength_score"] is not None else -1),
            p["nickname"].lower(),
        )
    )

    return {
        "id": team.id,
        "name": team.name,
        "slug": team.slug,
        "region": team.region,
        "competitive_tier": team.competitive_tier,
        "average_strength": average_strength,
        "roster": roster_payload,
    }