from collections import Counter

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.db.database import get_db
from app.db.models import CandidatePool, Player, Team, TeamRoster


router = APIRouter(prefix="/simulator", tags=["simulator"])


IDEAL_ROLE_COUNTS = {
    "IGL": 1,
    "AWPer": 1,
    "Entry": 1,
    "Support": 1,
    "Lurker": 1,
}


class SimulationRequest(BaseModel):
    team_id: int
    outgoing_player_id: int
    incoming_player_id: int


def get_team_active_roster(db: Session, team_id: int):
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


def classify_role_issues(counts: Counter) -> dict:
    missing_roles = []
    duplicate_roles = []

    for role, ideal in IDEAL_ROLE_COUNTS.items():
        actual = counts.get(role, 0)
        if actual < ideal:
            missing_roles.append(role)
        elif actual > ideal:
            duplicate_roles.append(role)

    return {
        "missing_roles": missing_roles,
        "duplicate_roles": duplicate_roles,
    }


def get_role_fit_label(role_score: float) -> str:
    if role_score >= 95:
        return "Excellent"
    if role_score >= 85:
        return "Good"
    if role_score >= 70:
        return "Shaky"
    return "Poor"


def get_strength_change_label(delta: float) -> str:
    if abs(delta) <= 2:
        return "About the same"
    if delta > 2 and delta <= 7:
        return "Slightly stronger"
    if delta > 7:
        return "Much stronger"
    if delta < -2 and delta >= -7:
        return "Slightly weaker"
    return "Much weaker"


def score_role_balance(players: list[Player]) -> dict:
    roles = []
    for player in players:
        if player.role_assignment and player.role_assignment.primary_role:
            roles.append(player.role_assignment.primary_role)

    counts = Counter(roles)

    penalty = 0
    breakdown = {}

    for role, ideal in IDEAL_ROLE_COUNTS.items():
        actual = counts.get(role, 0)
        diff = abs(actual - ideal)
        penalty += diff
        breakdown[role] = {
            "ideal": ideal,
            "actual": actual,
            "diff": diff,
        }

    score = max(0, 100 - (penalty * 15))
    role_issues = classify_role_issues(counts)

    return {
        "score": score,
        "label": get_role_fit_label(score),
        "role_counts": dict(counts),
        "breakdown": breakdown,
        "missing_roles": role_issues["missing_roles"],
        "duplicate_roles": role_issues["duplicate_roles"],
    }


def score_strength(players: list[Player]) -> dict:
    values = [player.strength_score or 70 for player in players]
    avg_strength = round(sum(values) / len(values), 2) if values else 0

    return {
        "score": avg_strength,
        "player_scores": [
            {
                "player_id": player.id,
                "nickname": player.nickname,
                "strength_score": player.strength_score or 70,
            }
            for player in players
        ],
    }


def compute_combined_score(role_score: float, strength_score: float) -> float:
    combined = (role_score * 0.6) + (strength_score * 0.4)
    return round(combined, 2)


def describe_strength_difference(outgoing_strength: float, incoming_strength: float) -> str:
    delta = round(incoming_strength - outgoing_strength, 2)

    if abs(delta) <= 2:
        return (
            f"Incoming player has a very similar manual strength score "
            f"({incoming_strength}) compared with outgoing player ({outgoing_strength})."
        )
    if delta > 2 and delta <= 7:
        return (
            f"Incoming player is slightly stronger by manual strength score "
            f"({incoming_strength} vs {outgoing_strength})."
        )
    if delta > 7:
        return (
            f"Incoming player is significantly stronger by manual strength score "
            f"({incoming_strength} vs {outgoing_strength})."
        )
    if delta < -2 and delta >= -7:
        return (
            f"Incoming player is slightly weaker by manual strength score "
            f"({incoming_strength} vs {outgoing_strength})."
        )
    return (
        f"Incoming player is significantly weaker by manual strength score "
        f"({incoming_strength} vs {outgoing_strength})."
    )


def build_explanations(before_role: dict, after_role: dict, outgoing: Player, incoming: Player) -> list[str]:
    explanations = []

    outgoing_role = outgoing.role_assignment.primary_role if outgoing.role_assignment else "Unknown"
    incoming_role = incoming.role_assignment.primary_role if incoming.role_assignment else "Unknown"

    if outgoing_role != incoming_role:
        explanations.append(
            f"Role swap changes {outgoing.nickname} ({outgoing_role}) to {incoming.nickname} ({incoming_role})."
        )
    else:
        explanations.append(
            f"Role swap keeps the same primary role profile: {outgoing_role}."
        )

    for role, details in after_role["breakdown"].items():
        before_diff = before_role["breakdown"][role]["diff"]
        after_diff = details["diff"]

        if after_diff > before_diff:
            if details["actual"] == 0:
                explanations.append(f"Team loses its primary {role}.")
            elif details["actual"] > details["ideal"]:
                explanations.append(f"Team now has too many players in the {role} role.")
        elif after_diff < before_diff:
            explanations.append(f"Team role structure improves for {role}.")

    if after_role["missing_roles"]:
        explanations.append(
            f"Missing roles after the move: {', '.join(after_role['missing_roles'])}."
        )

    if after_role["duplicate_roles"]:
        explanations.append(
            f"Duplicated roles after the move: {', '.join(after_role['duplicate_roles'])}."
        )

    outgoing_strength = outgoing.strength_score or 70
    incoming_strength = incoming.strength_score or 70
    explanations.append(describe_strength_difference(outgoing_strength, incoming_strength))

    return explanations


@router.get("/candidates")
def list_candidates(db: Session = Depends(get_db)):
    candidates = db.execute(
        select(CandidatePool)
        .options(
            joinedload(CandidatePool.player).joinedload(Player.role_assignment)
        )
    ).unique().scalars().all()

    return [
        {
            "player_id": candidate.player.id,
            "nickname": candidate.player.nickname,
            "role": candidate.player.role_assignment.primary_role if candidate.player.role_assignment else None,
            "source": candidate.source,
            "score": candidate.score,
            "strength_score": candidate.player.strength_score,
        }
        for candidate in candidates
    ]


@router.post("/run")
def simulate_roster_change(payload: SimulationRequest, db: Session = Depends(get_db)):
    team, current_players = get_team_active_roster(db, payload.team_id)

    outgoing = next((p for p in current_players if p.id == payload.outgoing_player_id), None)
    if not outgoing:
        raise HTTPException(
            status_code=400,
            detail="Outgoing player is not on this team's active roster",
        )

    incoming = db.execute(
        select(Player)
        .where(Player.id == payload.incoming_player_id)
        .options(joinedload(Player.role_assignment))
    ).scalar_one_or_none()

    if not incoming:
        raise HTTPException(status_code=404, detail="Incoming player not found")

    if outgoing.id == incoming.id:
        raise HTTPException(status_code=400, detail="Outgoing and incoming player cannot be the same")

    if any(player.id == incoming.id for player in current_players):
        raise HTTPException(status_code=400, detail="Incoming player is already on this team's active roster")

    before_role = score_role_balance(current_players)
    before_strength = score_strength(current_players)
    before_combined = compute_combined_score(before_role["score"], before_strength["score"])

    new_roster = [player for player in current_players if player.id != outgoing.id]
    new_roster.append(incoming)

    after_role = score_role_balance(new_roster)
    after_strength = score_strength(new_roster)
    after_combined = compute_combined_score(after_role["score"], after_strength["score"])

    combined_delta = round(after_combined - before_combined, 2)
    strength_delta = round(after_strength["score"] - before_strength["score"], 2)
    role_delta = round(after_role["score"] - before_role["score"], 2)

    if combined_delta > 3:
        verdict = "strong upgrade"
    elif combined_delta > 0:
        verdict = "slight upgrade"
    elif combined_delta < -3:
        verdict = "clear downgrade"
    elif combined_delta < 0:
        verdict = "slight downgrade"
    else:
        verdict = "neutral move"

    explanations = build_explanations(before_role, after_role, outgoing, incoming)

    return {
        "team": {
            "id": team.id,
            "name": team.name,
        },
        "swap": {
            "outgoing": {
                "id": outgoing.id,
                "nickname": outgoing.nickname,
                "role": outgoing.role_assignment.primary_role if outgoing.role_assignment else None,
                "strength_score": outgoing.strength_score,
            },
            "incoming": {
                "id": incoming.id,
                "nickname": incoming.nickname,
                "role": incoming.role_assignment.primary_role if incoming.role_assignment else None,
                "strength_score": incoming.strength_score,
            },
        },
        "summary": {
            "verdict": verdict,
            "role_fit_label": after_role["label"],
            "strength_change_label": get_strength_change_label(strength_delta),
            "combined_delta": combined_delta,
            "role_delta": role_delta,
            "strength_delta": strength_delta,
        },
        "before": {
            "role_balance": before_role,
            "strength": before_strength,
            "combined_score": before_combined,
        },
        "after": {
            "role_balance": after_role,
            "strength": after_strength,
            "combined_score": after_combined,
        },
        "delta": combined_delta,
        "verdict": verdict,
        "explanations": explanations,
    }