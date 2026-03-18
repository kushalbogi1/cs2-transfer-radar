from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.api.routes.simulator import SimulationRequest, simulate_roster_change
from app.api.routes.suggestions import get_replacement_suggestions
from app.db.database import get_db
from app.db.models import Player, Team, TeamRoster


router = APIRouter(prefix="/teams", tags=["best-move"])


MIN_RECOMMENDATION_DELTA = 0.1  # only better moves are allowed


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


@router.get("/{team_id}/best-move")
def get_best_moves_for_team(team_id: int, db: Session = Depends(get_db)):
    team, active_players = get_team_active_players(db, team_id)

    all_moves = []
    evaluated_moves = 0

    for outgoing_player in active_players:
        suggestion_payload = get_replacement_suggestions(team_id, outgoing_player.id, db)
        suggestions = suggestion_payload["suggestions"][:5]

        for suggestion in suggestions:
            simulation = simulate_roster_change(
                SimulationRequest(
                    team_id=team_id,
                    outgoing_player_id=outgoing_player.id,
                    incoming_player_id=suggestion["player_id"],
                ),
                db,
            )
            evaluated_moves += 1

            move = {
                "outgoing_player": {
                    "id": outgoing_player.id,
                    "nickname": outgoing_player.nickname,
                    "role": outgoing_player.role_assignment.primary_role if outgoing_player.role_assignment else None,
                    "strength_score": outgoing_player.strength_score,
                },
                "incoming_player": {
                    "id": suggestion["player_id"],
                    "nickname": suggestion["nickname"],
                    "role": suggestion["role"],
                    "strength_score": suggestion["strength_score"],
                    "fit_score": suggestion["fit_score"],
                },
                "projection": simulation,
            }

            all_moves.append(move)

    if not all_moves:
        raise HTTPException(status_code=404, detail="No valid moves found for this team")

    all_moves.sort(
        key=lambda move: move["projection"]["summary"]["combined_delta"],
        reverse=True,
    )

    recommended_moves = [
        move
        for move in all_moves
        if move["projection"]["summary"]["combined_delta"] >= MIN_RECOMMENDATION_DELTA
    ]

    top_moves = recommended_moves[:3]

    if top_moves:
        summary_message = "Recommended moves found based on projected better outcomes."
    else:
        summary_message = "No upgrade-quality moves were found. Current roster may already be near-optimal, or the candidate pool is too limited."

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