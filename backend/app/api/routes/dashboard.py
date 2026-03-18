from fastapi import APIRouter, Depends
from sqlalchemy import asc, desc, select
from sqlalchemy.orm import Session, joinedload

from app.api.routes.best_move import get_best_moves_for_team
from app.api.routes.team_analysis import get_team_analysis
from app.db.database import get_db
from app.db.models import Player, Team


router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/overview")
def get_dashboard_overview(db: Session = Depends(get_db)):
    teams = db.execute(select(Team).order_by(Team.name)).scalars().all()
    players = db.execute(select(Player).order_by(Player.nickname)).scalars().all()

    strongest_player = db.execute(
        select(Player)
        .where(Player.strength_score.is_not(None))
        .order_by(desc(Player.strength_score), asc(Player.nickname))
    ).scalars().first()

    most_unstable_team = None
    lowest_health_score = None

    for team in teams:
        analysis = get_team_analysis(team.id, db)
        if lowest_health_score is None or analysis["roster_health_score"] < lowest_health_score:
            lowest_health_score = analysis["roster_health_score"]
            most_unstable_team = analysis

    featured_best_move = None
    best_move_delta = None

    for team in teams:
        best_move_result = get_best_moves_for_team(team.id, db)

        if best_move_result["top_moves"]:
            top_move = best_move_result["top_moves"][0]
            delta = top_move["projection"]["summary"]["combined_delta"]

            if best_move_delta is None or delta > best_move_delta:
                best_move_delta = delta
                featured_best_move = {
                    "team": best_move_result["team"],
                    "move": top_move,
                }

    return {
        "counts": {
            "teams": len(teams),
            "players": len(players),
        },
        "strongest_player": (
            {
                "id": strongest_player.id,
                "nickname": strongest_player.nickname,
                "strength_score": strongest_player.strength_score,
            }
            if strongest_player
            else None
        ),
        "most_unstable_team": (
            {
                "team": most_unstable_team["team"],
                "roster_health_score": most_unstable_team["roster_health_score"],
                "label": most_unstable_team["label"],
                "suggested_action": most_unstable_team["suggested_action"],
            }
            if most_unstable_team
            else None
        ),
        "featured_best_move": featured_best_move,
    }