from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.db.database import get_db
from app.db.models import Player, Team, TeamRoster

router = APIRouter(prefix="/teams", tags=["suggestions"])

ROLE_MIN_SCORE = {
    "IGL": 60,
    "AWPer": 68,
    "Entry": 66,
    "Support": 58,
    "Lurker": 62,
}

TEAM_TIER_VALUES = {
    "S": 5,
    "A": 4,
    "B": 3,
    "C": 2,
    "D": 1,
}

MARKET_VALUE_VALUES = {
    "low": 1,
    "mid": 2,
    "high": 3,
    "elite": 4,
}


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


def get_candidate_team(candidate: Player):
    active_entry = next((entry for entry in candidate.roster_entries if entry.is_active), None)
    return active_entry.team if active_entry else None


def get_team_tier_value(tier: str | None) -> int:
    if not tier:
        return 0
    return TEAM_TIER_VALUES.get(tier.upper(), 0)


def get_market_value_value(market_value_tier: str | None) -> int:
    if not market_value_tier:
        return 0
    return MARKET_VALUE_VALUES.get(market_value_tier.lower(), 0)


def get_status_priority(status: str | None) -> int:
    status = (status or "").lower()
    if status == "free_agent":
        return 0
    if status == "bench":
        return 1
    if status == "inactive":
        return 2
    if status == "active":
        return 3
    if status == "retired":
        return 4
    return 5


def get_role_match_tier(outgoing_player: Player, candidate: Player) -> int | None:
    outgoing_primary = outgoing_player.role_assignment.primary_role if outgoing_player.role_assignment else None
    outgoing_secondary = outgoing_player.role_assignment.secondary_role if outgoing_player.role_assignment else None

    candidate_primary = candidate.role_assignment.primary_role if candidate.role_assignment else None
    candidate_secondary = candidate.role_assignment.secondary_role if candidate.role_assignment else None

    if not outgoing_primary or not candidate_primary:
        return None

    if outgoing_primary == candidate_primary:
        return 0

    if candidate_secondary and outgoing_primary == candidate_secondary:
        return 1

    if outgoing_secondary and outgoing_secondary == candidate_primary:
        return 2

    return None


def passes_role_specific_minimum(outgoing_player: Player, candidate: Player) -> bool:
    outgoing_primary = outgoing_player.role_assignment.primary_role if outgoing_player.role_assignment else None
    if not outgoing_primary:
        return False

    minimum = ROLE_MIN_SCORE.get(outgoing_primary, 50)
    score = candidate.strength_score if candidate.strength_score is not None else 0
    return score >= minimum


def get_availability_bonus(candidate: Player, candidate_mode: str) -> float:
    status = (candidate.status or "").lower()

    if candidate_mode == "available_only":
        if status == "free_agent":
            return 10
        if status == "bench":
            return 8
        if status == "inactive":
            return 6
        return -100

    if candidate_mode == "active_targets":
        if status == "active":
            return 6
        return -100

    if status == "free_agent":
        return 8
    if status == "bench":
        return 6
    if status == "inactive":
        return 4
    if status == "active":
        return 1
    if status == "retired":
        return -100
    return 0


def is_candidate_realistic(team: Team, candidate: Player) -> bool:
    """
    Hard realism filter for obviously unrealistic moves.
    """
    status = (candidate.status or "").lower()
    if status == "retired":
        return False

    team_tier_value = get_team_tier_value(team.competitive_tier)
    candidate_market_value = get_market_value_value(candidate.market_value_tier)
    candidate_team = get_candidate_team(candidate)

    # If we do not have enough tier data, do not hard-block here.
    if team_tier_value == 0:
        return True

    # Hard block extreme market jumps
    if candidate_market_value and (candidate_market_value - team_tier_value) >= 3:
        return False

    # Hard block poaching active stars from much stronger teams
    if status == "active" and candidate_team and candidate_team.id != team.id:
        candidate_team_tier = get_team_tier_value(candidate_team.competitive_tier)
        if candidate_team_tier and (candidate_team_tier - team_tier_value) >= 2:
            return False

    # Lower-tier teams should not realistically pull elite active stars
    if status == "active" and candidate_market_value == 4 and team_tier_value <= 2:
        return False

    return True


def get_realism_penalty(team: Team, candidate: Player) -> float:
    penalty = 0
    team_tier_value = get_team_tier_value(team.competitive_tier)
    candidate_market_value = get_market_value_value(candidate.market_value_tier)
    status = (candidate.status or "").lower()

    if team_tier_value and candidate_market_value:
        tier_gap = candidate_market_value - team_tier_value
        if tier_gap == 2:
            penalty += 12
        elif tier_gap == 1:
            penalty += 5

    candidate_team = get_candidate_team(candidate)
    if candidate_team and candidate_team.id != team.id:
        candidate_team_tier_value = get_team_tier_value(candidate_team.competitive_tier)
        if team_tier_value and candidate_team_tier_value:
            team_gap = candidate_team_tier_value - team_tier_value
            if team_gap == 1:
                penalty += 5

    if status == "active":
        penalty += 2
    elif status == "bench":
        penalty -= 1
    elif status == "free_agent":
        penalty -= 2

    return penalty


def score_candidate_fit(team: Team, outgoing_player: Player, candidate: Player, candidate_mode: str) -> float:
    strength = candidate.strength_score or 0
    role_tier = get_role_match_tier(outgoing_player, candidate)

    if role_tier == 0:
        role_bonus = 16
    elif role_tier == 1:
        role_bonus = 9
    elif role_tier == 2:
        role_bonus = 4
    else:
        return -999

    availability_bonus = get_availability_bonus(candidate, candidate_mode)
    if availability_bonus <= -100:
        return -999

    if not is_candidate_realistic(team, candidate):
        return -999

    realism_penalty = get_realism_penalty(team, candidate)

    score = strength + role_bonus + availability_bonus - realism_penalty
    return round(score, 2)


@router.get("/{team_id}/suggestions/{outgoing_player_id}")
def get_replacement_suggestions(
    team_id: int,
    outgoing_player_id: int,
    candidate_mode: str = Query("available_only", pattern="^(available_only|active_targets|all)$"),
    db: Session = Depends(get_db),
):
    team, active_players = get_team_and_roster(db, team_id)

    outgoing_player = next((p for p in active_players if p.id == outgoing_player_id), None)
    if not outgoing_player:
        raise HTTPException(status_code=404, detail="Outgoing player is not on this team's active roster")

    active_player_ids = {player.id for player in active_players}

    all_players = db.execute(
        select(Player).options(
            joinedload(Player.role_assignment),
            joinedload(Player.roster_entries).joinedload(TeamRoster.team),
        )
    ).unique().scalars().all()

    suggestions = []
    for candidate in all_players:
        if candidate.id in active_player_ids:
            continue

        if candidate.id == outgoing_player.id:
            continue

        if candidate.strength_score is None:
            continue

        if not candidate.role_assignment or not candidate.role_assignment.primary_role:
            continue

        role_tier = get_role_match_tier(outgoing_player, candidate)
        if role_tier is None:
            continue

        if not passes_role_specific_minimum(outgoing_player, candidate):
            continue

        availability_bonus = get_availability_bonus(candidate, candidate_mode)
        if availability_bonus <= -100:
            continue

        if not is_candidate_realistic(team, candidate):
            continue

        fit_score = score_candidate_fit(team, outgoing_player, candidate, candidate_mode)
        if fit_score <= -999:
            continue

        candidate_team = get_candidate_team(candidate)

        suggestions.append(
            {
                "player_id": candidate.id,
                "nickname": candidate.nickname,
                "role": candidate.role_assignment.primary_role,
                "secondary_role": candidate.role_assignment.secondary_role,
                "strength_score": candidate.strength_score,
                "fit_score": fit_score,
                "role_match_tier": role_tier,
                "status": candidate.status,
                "market_value_tier": candidate.market_value_tier,
                "candidate_team": candidate_team.name if candidate_team else None,
                "candidate_team_tier": candidate_team.competitive_tier if candidate_team else None,
                "status_priority": get_status_priority(candidate.status),
            }
        )

    suggestions.sort(
        key=lambda x: (
            x["role_match_tier"],
            x["status_priority"],
            -(x["fit_score"]),
            -(x["strength_score"] or 0),
        )
    )

    return {
        "team": {
            "id": team.id,
            "name": team.name,
            "competitive_tier": team.competitive_tier,
        },
        "outgoing_player": {
            "id": outgoing_player.id,
            "nickname": outgoing_player.nickname,
            "role": outgoing_player.role_assignment.primary_role if outgoing_player.role_assignment else None,
            "secondary_role": outgoing_player.role_assignment.secondary_role if outgoing_player.role_assignment else None,
            "strength_score": outgoing_player.strength_score,
        },
        "candidate_mode": candidate_mode,
        "suggestions": [
            {
                "player_id": s["player_id"],
                "nickname": s["nickname"],
                "role": s["role"],
                "secondary_role": s["secondary_role"],
                "strength_score": s["strength_score"],
                "fit_score": s["fit_score"],
                "status": s["status"],
                "market_value_tier": s["market_value_tier"],
                "candidate_team": s["candidate_team"],
                "candidate_team_tier": s["candidate_team_tier"],
            }
            for s in suggestions[:10]
        ],
    }