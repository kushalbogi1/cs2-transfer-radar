from collections import Counter

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.db.database import get_db
from app.db.models import Player


router = APIRouter(prefix="/dream-team", tags=["dream-team"])


IDEAL_ROLE_COUNTS = {
    "IGL": 1,
    "AWPer": 1,
    "Entry": 1,
    "Support": 1,
    "Lurker": 1,
}


class DreamTeamRequest(BaseModel):
    player_ids: list[int]


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
    if role_score >= 75:
        return "Playable"
    return "Poor"


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
    return round((role_score * 0.6) + (strength_score * 0.4), 2)


def build_explanations(role_balance: dict, strength_score: float) -> list[str]:
    explanations = []

    if role_balance["missing_roles"]:
        explanations.append(
            f"Missing roles: {', '.join(role_balance['missing_roles'])}."
        )

    if role_balance["duplicate_roles"]:
        explanations.append(
            f"Duplicate roles: {', '.join(role_balance['duplicate_roles'])}."
        )

    if not role_balance["missing_roles"] and not role_balance["duplicate_roles"]:
        explanations.append("Team has a clean role structure with no obvious gaps.")

    if strength_score >= 90:
        explanations.append("This lineup has elite firepower on paper.")
    elif strength_score >= 82:
        explanations.append("This lineup has strong overall firepower.")
    elif strength_score >= 75:
        explanations.append("This lineup has decent firepower but not elite ceiling.")
    else:
        explanations.append("This lineup may struggle on raw firepower alone.")

    return explanations


@router.post("/")
def analyze_dream_team(payload: DreamTeamRequest, db: Session = Depends(get_db)):
    if len(payload.player_ids) != 5:
        raise HTTPException(status_code=400, detail="You must select exactly 5 players.")

    if len(set(payload.player_ids)) != 5:
        raise HTTPException(status_code=400, detail="Dream team cannot contain duplicate players.")

    players = db.execute(
        select(Player)
        .where(Player.id.in_(payload.player_ids))
        .options(joinedload(Player.role_assignment))
    ).unique().scalars().all()

    if len(players) != 5:
        raise HTTPException(status_code=404, detail="One or more players were not found.")

    role_balance = score_role_balance(players)
    strength = score_strength(players)
    combined_score = compute_combined_score(role_balance["score"], strength["score"])
    explanations = build_explanations(role_balance, strength["score"])

    return {
        "selected_players": [
            {
                "id": player.id,
                "nickname": player.nickname,
                "role": player.role_assignment.primary_role if player.role_assignment else None,
                "strength_score": player.strength_score,
            }
            for player in players
        ],
        "role_balance": role_balance,
        "strength": strength,
        "combined_score": combined_score,
        "explanations": explanations,
    }