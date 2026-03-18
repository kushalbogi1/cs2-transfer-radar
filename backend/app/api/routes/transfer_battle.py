from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.api.routes.simulator import simulate_roster_change, SimulationRequest


router = APIRouter(prefix="/transfer-battle", tags=["transfer-battle"])


class BattleMove(BaseModel):
    outgoing_player_id: int
    incoming_player_id: int


class TransferBattleRequest(BaseModel):
    team_id: int
    move_a: BattleMove
    move_b: BattleMove


@router.post("/")
def run_transfer_battle(payload: TransferBattleRequest, db: Session = Depends(get_db)):
    if payload.move_a.incoming_player_id == payload.move_b.incoming_player_id and payload.move_a.outgoing_player_id == payload.move_b.outgoing_player_id:
        raise HTTPException(status_code=400, detail="Move A and Move B cannot be identical.")

    result_a = simulate_roster_change(
        SimulationRequest(
            team_id=payload.team_id,
            outgoing_player_id=payload.move_a.outgoing_player_id,
            incoming_player_id=payload.move_a.incoming_player_id,
        ),
        db,
    )

    result_b = simulate_roster_change(
        SimulationRequest(
            team_id=payload.team_id,
            outgoing_player_id=payload.move_b.outgoing_player_id,
            incoming_player_id=payload.move_b.incoming_player_id,
        ),
        db,
    )

    delta_a = result_a["summary"]["combined_delta"]
    delta_b = result_b["summary"]["combined_delta"]

    if delta_a > delta_b:
        winner = "Move A"
        winner_reason = "Move A produces the better projected combined outcome."
    elif delta_b > delta_a:
        winner = "Move B"
        winner_reason = "Move B produces the better projected combined outcome."
    else:
        winner = "Tie"
        winner_reason = "Both moves produce the same projected combined outcome."

    return {
        "team": result_a["team"],
        "move_a": result_a,
        "move_b": result_b,
        "comparison": {
            "winner": winner,
            "winner_reason": winner_reason,
            "move_a_delta": delta_a,
            "move_b_delta": delta_b,
        },
    }