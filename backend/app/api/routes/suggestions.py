from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.db.database import get_db
from app.db.models import Player, Team, TeamRoster


router = APIRouter(prefix="/teams", tags=["suggestions"])


def get_team_and_roster(db: Session, team_id: int):
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

    active_players = [entry.player for entry in team.rosters if entry.is_active]
    return team, active_players


def get_role_match_tier(outgoing_player: Player, candidate: Player) -> int:
    """
    Lower number = better fit.

    0 = exact primary-role match
    1 = candidate primary role matches outgoing secondary role
    2 = everything else
    """
    outgoing_role = outgoing_player.role_assignment.primary_role if outgoing_player.role_assignment else None
    outgoing_secondary = outgoing_player.role_assignment.secondary_role if outgoing_player.role_assignment else None
    candidate_role = candidate.role_assignment.primary_role if candidate.role_assignment else None

    if outgoing_role and candidate_role and outgoing_role == candidate_role:
        return 0

    if outgoing_secondary and candidate_role and outgoing_secondary == candidate_role:
        return 1

    return 2


def score_candidate_fit(outgoing_player: Player, candidate: Player) -> float:
    """
    Score used for display only.
    Actual ranking is done by role tier first, then strength.
    """
    role_tier = get_role_match_tier(outgoing_player, candidate)
    strength = candidate.strength_score or 0

    if role_tier == 0:
        bonus = 15
    elif role_tier == 1:
        bonus = 8
    else:
        bonus = -5

    return round(strength + bonus, 2)


@router.get("/{team_id}/suggestions/{outgoing_player_id}")
def get_replacement_suggestions(team_id: int, outgoing_player_id: int, db: Session = Depends(get_db)):
    team, active_players = get_team_and_roster(db, team_id)

    outgoing_player = next((p for p in active_players if p.id == outgoing_player_id), None)
    if not outgoing_player:
        raise HTTPException(status_code=404, detail="Outgoing player is not on this team's active roster")

    active_player_ids = {player.id for player in active_players}

    all_players = db.execute(
        select(Player).options(joinedload(Player.role_assignment))
    ).unique().scalars().all()

    suggestions = []
    for candidate in all_players:
        if candidate.id in active_player_ids:
            continue
        if candidate.id == outgoing_player.id:
            continue
        if candidate.strength_score is None:
            continue
        if candidate.strength_score < 60:
            continue

        role_tier = get_role_match_tier(outgoing_player, candidate)
        fit_score = score_candidate_fit(outgoing_player, candidate)

        suggestions.append(
            {
                "player_id": candidate.id,
                "nickname": candidate.nickname,
                "role": candidate.role_assignment.primary_role if candidate.role_assignment else None,
                "secondary_role": candidate.role_assignment.secondary_role if candidate.role_assignment else None,
                "strength_score": candidate.strength_score,
                "fit_score": fit_score,
                "role_match_tier": role_tier,
            }
        )

    # Sort by:
    # 1. best role tier first
    # 2. highest strength inside that tier
    # 3. highest fit score as a tie-breaker
    suggestions.sort(
        key=lambda x: (x["role_match_tier"], -(x["strength_score"] or 0), -x["fit_score"])
    )

    return {
        "team": {
            "id": team.id,
            "name": team.name,
        },
        "outgoing_player": {
            "id": outgoing_player.id,
            "nickname": outgoing_player.nickname,
            "role": outgoing_player.role_assignment.primary_role if outgoing_player.role_assignment else None,
            "secondary_role": outgoing_player.role_assignment.secondary_role if outgoing_player.role_assignment else None,
            "strength_score": outgoing_player.strength_score,
        },
        "suggestions": [
            {
                "player_id": s["player_id"],
                "nickname": s["nickname"],
                "role": s["role"],
                "secondary_role": s["secondary_role"],
                "strength_score": s["strength_score"],
                "fit_score": s["fit_score"],
            }
            for s in suggestions[:10]
        ],
    }