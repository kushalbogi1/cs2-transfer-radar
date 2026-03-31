from collections import Counter

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.api.routes.best_move import get_best_moves_for_team
from app.db.database import get_db
from app.db.models import Player, Team, TeamRoster

router = APIRouter(prefix="/teams", tags=["team-analysis"])


IDEAL_ROLE_COUNTS = {
    "IGL": 1,
    "AWPer": 1,
    "Entry": 1,
    "Support": 1,
    "Lurker": 1,
}


def get_team_active_players(db: Session, team_id: int) -> tuple[Team, list[Player]]:
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


def analyze_role_structure(players: list[Player]) -> dict:
    roles = []
    for player in players:
        if player.role_assignment and player.role_assignment.primary_role:
            roles.append(player.role_assignment.primary_role)

    counts = Counter(roles)
    missing_roles = []
    duplicate_roles = []
    penalty = 0

    for role, ideal in IDEAL_ROLE_COUNTS.items():
        actual = counts.get(role, 0)
        diff = abs(actual - ideal)
        penalty += diff

        if actual < ideal:
            missing_roles.append(role)
        elif actual > ideal:
            duplicate_roles.append(role)

    score = max(0, 100 - (penalty * 15))

    return {
        "score": score,
        "role_counts": dict(counts),
        "missing_roles": missing_roles,
        "duplicate_roles": duplicate_roles,
    }


def analyze_firepower(players: list[Player]) -> dict:
    strengths = [player.strength_score or 70 for player in players]
    avg_strength = round(sum(strengths) / len(strengths), 2) if strengths else 0
    max_strength = max(strengths) if strengths else 0
    min_strength = min(strengths) if strengths else 0
    spread = round(max_strength - min_strength, 2)

    if spread <= 8:
        balance_label = "Balanced"
        balance_score = 95
    elif spread <= 15:
        balance_label = "Mostly balanced"
        balance_score = 82
    elif spread <= 25:
        balance_label = "Top-heavy"
        balance_score = 68
    else:
        balance_label = "Very top-heavy"
        balance_score = 52

    return {
        "average_strength": avg_strength,
        "max_strength": max_strength,
        "min_strength": min_strength,
        "spread": spread,
        "balance_label": balance_label,
        "balance_score": balance_score,
    }


def compute_roster_health(role_score: float, firepower_balance_score: float, avg_strength: float) -> float:
    return round((role_score * 0.5) + (firepower_balance_score * 0.25) + (avg_strength * 0.25), 2)


def get_health_label(score: float) -> str:
    if score >= 90:
        return "Elite structure"
    if score >= 80:
        return "Stable"
    if score >= 70:
        return "Needs small change"
    if score >= 60:
        return "Risky roster"
    return "Rebuild recommended"


def identify_weak_link(players: list[Player]) -> dict | None:
    if not players:
        return None

    ranked = sorted(
        players,
        key=lambda p: (
            (p.strength_score if p.strength_score is not None else -1),
            p.nickname.lower(),
        )
    )

    weakest = ranked[0]
    role = weakest.role_assignment.primary_role if weakest.role_assignment else None

    return {
        "id": weakest.id,
        "nickname": weakest.nickname,
        "role": role,
        "strength_score": weakest.strength_score,
        "reason": (
            f"{weakest.nickname} appears to be the weakest current piece on raw strength score."
            if weakest.strength_score is not None
            else f"{weakest.nickname} appears weakest because no reliable strength score is available."
        ),
    }


def suggest_action(role_analysis: dict, firepower_analysis: dict, avg_strength: float) -> str:
    if role_analysis["missing_roles"]:
        return f"Fix missing role coverage first: {', '.join(role_analysis['missing_roles'])}."
    if role_analysis["duplicate_roles"]:
        return f"Reduce role overlap in: {', '.join(role_analysis['duplicate_roles'])}."
    if firepower_analysis["balance_label"] in {"Top-heavy", "Very top-heavy"}:
        return "Consider upgrading weaker support pieces around the core."
    if avg_strength < 78:
        return "Roster needs a firepower upgrade."
    return "No immediate roster change needed."


def build_explanations(role_analysis: dict, firepower_analysis: dict, avg_strength: float, weak_link: dict | None) -> list[str]:
    explanations = []

    if role_analysis["missing_roles"]:
        explanations.append(
            f"Missing roles: {', '.join(role_analysis['missing_roles'])}."
        )

    if role_analysis["duplicate_roles"]:
        explanations.append(
            f"Duplicate roles: {', '.join(role_analysis['duplicate_roles'])}."
        )

    if not role_analysis["missing_roles"] and not role_analysis["duplicate_roles"]:
        explanations.append("Team has full baseline role coverage.")

    explanations.append(
        f"Firepower profile is {firepower_analysis['balance_label'].lower()} "
        f"(spread: {firepower_analysis['spread']})."
    )

    if avg_strength >= 90:
        explanations.append("This roster has elite firepower on paper.")
    elif avg_strength >= 82:
        explanations.append("This roster has strong firepower overall.")
    elif avg_strength >= 75:
        explanations.append("This roster has decent firepower but limited ceiling.")
    else:
        explanations.append("This roster looks weak on raw firepower.")

    if weak_link:
        explanations.append(weak_link["reason"])

    return explanations


def build_instability_reasons(role_analysis: dict, firepower_analysis: dict, weak_link: dict | None) -> list[str]:
    reasons = []

    if role_analysis["missing_roles"]:
        reasons.append(f"Missing role coverage: {', '.join(role_analysis['missing_roles'])}.")
    if role_analysis["duplicate_roles"]:
        reasons.append(f"Role overlap: {', '.join(role_analysis['duplicate_roles'])}.")
    if firepower_analysis["balance_label"] in {"Top-heavy", "Very top-heavy"}:
        reasons.append(
            f"Firepower is {firepower_analysis['balance_label'].lower()} with a spread of {firepower_analysis['spread']}."
        )
    if weak_link:
        reasons.append(
            f"Weakest current player appears to be {weak_link['nickname']} ({weak_link['role'] or 'Unknown role'})."
        )

    if not reasons:
        reasons.append("No major structural instability detected.")

    return reasons


@router.get("/{team_id}/analysis")
def get_team_analysis(team_id: int, db: Session = Depends(get_db)):
    team, players = get_team_active_players(db, team_id)

    role_analysis = analyze_role_structure(players)
    firepower_analysis = analyze_firepower(players)
    weak_link = identify_weak_link(players)

    roster_health_score = compute_roster_health(
        role_analysis["score"],
        firepower_analysis["balance_score"],
        firepower_analysis["average_strength"],
    )

    label = get_health_label(roster_health_score)
    suggested_action = suggest_action(
        role_analysis,
        firepower_analysis,
        firepower_analysis["average_strength"],
    )
    explanations = build_explanations(
        role_analysis,
        firepower_analysis,
        firepower_analysis["average_strength"],
        weak_link,
    )
    instability_reasons = build_instability_reasons(
        role_analysis,
        firepower_analysis,
        weak_link,
    )

    try:
        best_moves = get_best_moves_for_team(team_id, db)
        suggested_moves = best_moves.get("top_moves", [])
    except Exception:
        suggested_moves = []

    return {
        "team": {
            "id": team.id,
            "name": team.name,
        },
        "roster_health_score": roster_health_score,
        "label": label,
        "role_structure": role_analysis,
        "firepower": firepower_analysis,
        "weak_link": weak_link,
        "instability_reasons": instability_reasons,
        "suggested_action": suggested_action,
        "explanations": explanations,
        "suggested_moves": suggested_moves,
    }