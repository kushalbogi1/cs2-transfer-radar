from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.db.database import get_db
from app.db.models import Player, Team, TeamRoster

router = APIRouter(prefix="/simulator", tags=["simulator"])

ROLE_IDEAL = {
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


def get_role_counts(players: list[Player]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for player in players:
        role = player.role_assignment.primary_role if player.role_assignment else None
        if role:
            counts[role] = counts.get(role, 0) + 1
    return counts


def analyze_role_balance(players: list[Player]) -> dict:
    counts = get_role_counts(players)
    breakdown = {}
    missing_roles = []
    duplicate_roles = []

    total_penalty = 0
    for role, ideal in ROLE_IDEAL.items():
        actual = counts.get(role, 0)
        diff = abs(ideal - actual)
        breakdown[role] = {
            "ideal": ideal,
            "actual": actual,
            "diff": diff,
        }
        total_penalty += diff * 15

        if actual < ideal:
            missing_roles.append(role)
        elif actual > ideal:
            duplicate_roles.append(role)

    score = max(0, 100 - total_penalty)

    if score >= 90:
        label = "Strong fit"
    elif score >= 75:
        label = "Good fit"
    elif score >= 60:
        label = "Risky fit"
    else:
        label = "Poor fit"

    return {
        "score": score,
        "label": label,
        "role_counts": counts,
        "breakdown": breakdown,
        "missing_roles": missing_roles,
        "duplicate_roles": duplicate_roles,
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


def get_combined_verdict(delta: float) -> str:
    if delta >= 8:
        return "strong upgrade"
    if delta >= 3:
        return "upgrade"
    if delta > -3:
        return "neutral"
    if delta > -8:
        return "downgrade"
    return "major downgrade"


def build_explanations(
    before_role: dict,
    after_role: dict,
    outgoing_player: Player,
    incoming_player: Player,
    before_strength: dict,
    after_strength: dict,
) -> list[str]:
    explanations: list[str] = []

    outgoing_role = outgoing_player.role_assignment.primary_role if outgoing_player.role_assignment else None
    incoming_role = incoming_player.role_assignment.primary_role if incoming_player.role_assignment else None

    if outgoing_role and incoming_role:
        if outgoing_role == incoming_role:
            explanations.append(
                f"Role fit is strong because {incoming_player.nickname} matches the outgoing {outgoing_role} role."
            )
        else:
            explanations.append(
                f"Role fit is weaker because {incoming_player.nickname} is a {incoming_role}, replacing a {outgoing_role}."
            )

    if after_role["score"] > before_role["score"]:
        explanations.append("The move improves overall roster role balance.")
    elif after_role["score"] < before_role["score"]:
        explanations.append("The move makes the roster role balance worse.")
    else:
        explanations.append("The move keeps roster role balance roughly unchanged.")

    if after_role["missing_roles"]:
        explanations.append(f"Missing roles after move: {', '.join(after_role['missing_roles'])}.")
    if after_role["duplicate_roles"]:
        explanations.append(f"Duplicate roles after move: {', '.join(after_role['duplicate_roles'])}.")

    before_avg = before_strength["score"]
    after_avg = after_strength["score"]

    if after_avg > before_avg:
        explanations.append("Average roster strength increases after the swap.")
    elif after_avg < before_avg:
        explanations.append("Average roster strength decreases after the swap.")
    else:
        explanations.append("Average roster strength stays roughly the same after the swap.")

    return explanations


def simulate_roster_change(payload: SimulationRequest, db: Session):
    team = db.execute(
        select(Team)
        .where(Team.id == payload.team_id)
        .options(
            joinedload(Team.rosters)
            .joinedload(TeamRoster.player)
            .joinedload(Player.role_assignment)
        )
    ).unique().scalar_one_or_none()

    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    active_players = [entry.player for entry in team.rosters if entry.is_active]

    outgoing_player = next((p for p in active_players if p.id == payload.outgoing_player_id), None)
    if not outgoing_player:
        raise HTTPException(status_code=404, detail="Outgoing player not found on active roster")

    incoming_player = db.execute(
        select(Player)
        .where(Player.id == payload.incoming_player_id)
        .options(joinedload(Player.role_assignment))
    ).scalar_one_or_none()

    if not incoming_player:
        raise HTTPException(status_code=404, detail="Incoming player not found")

    if incoming_player.id in {p.id for p in active_players}:
        raise HTTPException(status_code=400, detail="Incoming player is already on this team's active roster")

    before_players = active_players
    after_players = [p for p in active_players if p.id != outgoing_player.id] + [incoming_player]

    before_role = analyze_role_balance(before_players)
    after_role = analyze_role_balance(after_players)

    before_strength = score_strength(before_players)
    after_strength = score_strength(after_players)

    before_combined = compute_combined_score(before_role["score"], before_strength["score"])
    after_combined = compute_combined_score(after_role["score"], after_strength["score"])

    combined_delta = round(after_combined - before_combined, 2)

    explanations = build_explanations(
        before_role,
        after_role,
        outgoing_player,
        incoming_player,
        before_strength,
        after_strength,
    )

    return {
        "team": {
            "id": team.id,
            "name": team.name,
        },
        "swap": {
            "outgoing": {
                "id": outgoing_player.id,
                "nickname": outgoing_player.nickname,
                "role": outgoing_player.role_assignment.primary_role if outgoing_player.role_assignment else None,
                "strength_score": outgoing_player.strength_score,
            },
            "incoming": {
                "id": incoming_player.id,
                "nickname": incoming_player.nickname,
                "role": incoming_player.role_assignment.primary_role if incoming_player.role_assignment else None,
                "strength_score": incoming_player.strength_score,
            },
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
        "summary": {
            "combined_delta": combined_delta,
            "verdict": get_combined_verdict(combined_delta),
            "role_fit_label": after_role["label"],
            "strength_change_label": (
                "Improved"
                if after_strength["score"] > before_strength["score"]
                else "Declined"
                if after_strength["score"] < before_strength["score"]
                else "Unchanged"
            ),
        },
        "explanations": explanations,
    }


@router.get("/candidates")
def list_candidates(
    candidate_mode: str = Query("all", pattern="^(available_only|active_targets|all)$"),
    db: Session = Depends(get_db),
):
    players = db.execute(
        select(Player)
        .options(
            joinedload(Player.role_assignment),
            joinedload(Player.roster_entries).joinedload(TeamRoster.team),
        )
        .order_by(Player.nickname)
    ).unique().scalars().all()

    results = []
    for player in players:
        if player.strength_score is None:
            continue
        if not player.role_assignment or not player.role_assignment.primary_role:
            continue

        status = (player.status or "").lower()

        if candidate_mode == "available_only" and status not in {"free_agent", "bench", "inactive"}:
            continue
        if candidate_mode == "active_targets" and status != "active":
            continue
        if status == "retired":
            continue

        active_team = None
        for roster in player.roster_entries:
            if roster.is_active and roster.team:
                active_team = roster.team.name
                break

        results.append(
            {
                "player_id": player.id,
                "nickname": player.nickname,
                "role": player.role_assignment.primary_role if player.role_assignment else None,
                "secondary_role": player.role_assignment.secondary_role if player.role_assignment else None,
                "source": player.status or "pool",
                "score": player.strength_score,
                "strength_score": player.strength_score,
                "status": player.status,
                "market_value_tier": player.market_value_tier,
                "team": active_team,
            }
        )

    return results


@router.post("/run")
def run_simulation(payload: SimulationRequest, db: Session = Depends(get_db)):
    return simulate_roster_change(payload, db)