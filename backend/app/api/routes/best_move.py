from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.api.routes.simulator import SimulationRequest, simulate_roster_change
from app.api.routes.suggestions import get_replacement_suggestions
from app.db.database import get_db
from app.db.models import Player, Team, TeamRoster

router = APIRouter(prefix="/teams", tags=["best-move"])

MIN_RECOMMENDATION_DELTA = 0.5


def get_team_active_players(db: Session, team_id: int):
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


def get_status_preference_bonus(status: str | None) -> float:
    status = (status or "").lower()
    if status == "free_agent":
        return 3.0
    if status == "bench":
        return 2.0
    if status == "inactive":
        return 1.0
    if status == "active":
        return -1.0
    return 0.0


@router.get("/{team_id}/best-move")
def get_best_moves_for_team(team_id: int, db: Session = Depends(get_db)):
    team, active_players = get_team_active_players(db, team_id)

    all_moves = []
    evaluated_moves = 0

    for outgoing_player in active_players:
        try:
            suggestion_payload = get_replacement_suggestions(
                team_id=team_id,
                outgoing_player_id=outgoing_player.id,
                candidate_mode="all",
                db=db,
            )
        except Exception:
            continue

        suggestions = suggestion_payload.get("suggestions", [])[:8]

        for suggestion in suggestions:
            outgoing_primary = (
                outgoing_player.role_assignment.primary_role
                if outgoing_player.role_assignment
                else None
            )
            outgoing_secondary = (
                outgoing_player.role_assignment.secondary_role
                if outgoing_player.role_assignment
                else None
            )

            incoming_primary = suggestion.get("role")
            incoming_secondary = suggestion.get("secondary_role")

            same_primary = outgoing_primary and incoming_primary and outgoing_primary == incoming_primary
            primary_to_secondary = outgoing_primary and incoming_secondary and outgoing_primary == incoming_secondary
            secondary_to_primary = outgoing_secondary and incoming_primary and outgoing_secondary == incoming_primary

            if not (same_primary or primary_to_secondary or secondary_to_primary):
                continue

            try:
                simulation = simulate_roster_change(
                    SimulationRequest(
                        team_id=team_id,
                        outgoing_player_id=outgoing_player.id,
                        incoming_player_id=suggestion["player_id"],
                    ),
                    db,
                )
            except Exception:
                continue

            evaluated_moves += 1

            raw_delta = simulation["summary"]["combined_delta"]
            fit_score = suggestion.get("fit_score", 0)
            status_bonus = get_status_preference_bonus(suggestion.get("status"))

            # Realistic recommendation score:
            # projected improvement matters most, but realistic availability matters too
            recommendation_score = round((raw_delta * 3.0) + (fit_score * 0.12) + status_bonus, 2)

            all_moves.append(
                {
                    "outgoing_player": {
                        "id": outgoing_player.id,
                        "nickname": outgoing_player.nickname,
                        "role": outgoing_primary,
                        "strength_score": outgoing_player.strength_score,
                    },
                    "incoming_player": {
                        "id": suggestion["player_id"],
                        "nickname": suggestion["nickname"],
                        "role": incoming_primary,
                        "secondary_role": incoming_secondary,
                        "strength_score": suggestion["strength_score"],
                        "fit_score": fit_score,
                        "status": suggestion.get("status"),
                        "market_value_tier": suggestion.get("market_value_tier"),
                        "candidate_team": suggestion.get("candidate_team"),
                        "candidate_team_tier": suggestion.get("candidate_team_tier"),
                    },
                    "projection": simulation,
                    "recommendation_score": recommendation_score,
                }
            )

    if not all_moves:
        return {
            "team": {
                "id": team.id,
                "name": team.name,
            },
            "top_moves": [],
            "meta": {
                "evaluated_moves": 0,
                "returned_moves": 0,
                "best_delta_overall": None,
                "summary_message": "No valid candidate moves were found for this team.",
            },
        }

    all_moves.sort(
        key=lambda move: (
            -(move["recommendation_score"]),
            -(move["projection"]["summary"]["combined_delta"]),
        )
    )

    recommended_moves = [
        move
        for move in all_moves
        if move["projection"]["summary"]["combined_delta"] >= MIN_RECOMMENDATION_DELTA
    ]

    top_moves = recommended_moves[:3]

    if top_moves:
        summary_message = "Recommended moves found based on realistic projected upgrade outcomes."
    else:
        summary_message = (
            "No realistic upgrade-quality moves were found. Current roster may already be near-optimal, "
            "or the candidate pool still needs more bench/free-agent data."
        )

    return {
        "team": {
            "id": team.id,
            "name": team.name,
        },
        "top_moves": top_moves,
        "meta": {
            "evaluated_moves": evaluated_moves,
            "returned_moves": len(top_moves),
            "best_delta_overall": all_moves[0]["projection"]["summary"]["combined_delta"] if all_moves else None,
            "summary_message": summary_message,
        },
    }