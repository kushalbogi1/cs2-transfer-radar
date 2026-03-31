from fastapi import APIRouter, Depends
from sqlalchemy import desc, select
from sqlalchemy.orm import Session, joinedload

from app.api.routes.best_move import get_best_moves_for_team
from app.api.routes.team_analysis import get_team_analysis
from app.db.database import get_db
from app.db.models import Player, PlayerSnapshot, Team, TeamRoster

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def get_active_team_name(player: Player) -> str | None:
    for roster in player.roster_entries:
        if roster.is_active and roster.team:
            return roster.team.name
    return None


def get_team_average_strength(team: Team) -> float | None:
    strengths = []
    for roster in team.rosters:
        if roster.is_active and roster.player and roster.player.strength_score is not None:
            strengths.append(roster.player.strength_score)

    if not strengths:
        return None

    return round(sum(strengths) / len(strengths), 2)


def get_latest_snapshot(db: Session, player_id: int):
    return db.execute(
        select(PlayerSnapshot)
        .where(PlayerSnapshot.player_id == player_id)
        .order_by(desc(PlayerSnapshot.snapshot_date), desc(PlayerSnapshot.id))
    ).scalars().first()


@router.get("/overview")
def get_dashboard_overview(db: Session = Depends(get_db)):
    teams = db.execute(
        select(Team).options(
            joinedload(Team.rosters).joinedload(TeamRoster.player)
        ).order_by(Team.name)
    ).unique().scalars().all()

    players = db.execute(
        select(Player).options(
            joinedload(Player.role_assignment),
            joinedload(Player.roster_entries).joinedload(TeamRoster.team),
        ).order_by(Player.nickname)
    ).unique().scalars().all()

    ranked_players = []
    for player in players:
        latest_snapshot = get_latest_snapshot(db, player.id)

        ranked_players.append(
            {
                "id": player.id,
                "nickname": player.nickname,
                "strength_score": player.strength_score,
                "current_rating": latest_snapshot.rating if latest_snapshot else None,
                "primary_role": player.role_assignment.primary_role if player.role_assignment else None,
                "secondary_role": player.role_assignment.secondary_role if player.role_assignment else None,
                "team": get_active_team_name(player),
                "status": player.status,
                "market_value_tier": player.market_value_tier,
            }
        )

    # Public homepage ranking uses rating first
    ranked_players.sort(
        key=lambda p: (
            -(p["current_rating"] if p["current_rating"] is not None else -1),
            -(p["strength_score"] if p["strength_score"] is not None else -1),
            p["nickname"].lower(),
        )
    )

    for idx, player in enumerate(ranked_players, start=1):
        player["rank"] = idx

    top_players = ranked_players[:5]
    strongest_player = top_players[0] if top_players else None

    ranked_teams = []
    for team in teams:
        avg_strength = get_team_average_strength(team)
        active_players = [
            roster.player.nickname
            for roster in team.rosters
            if roster.is_active and roster.player
        ]

        ranked_teams.append(
            {
                "id": team.id,
                "name": team.name,
                "region": team.region,
                "competitive_tier": team.competitive_tier,
                "average_strength": avg_strength,
                "active_players": active_players[:5],
            }
        )

    ranked_teams.sort(
        key=lambda t: (
            -(t["average_strength"] if t["average_strength"] is not None else -1),
            t["name"].lower(),
        )
    )

    for idx, team in enumerate(ranked_teams, start=1):
        team["rank"] = idx

    top_teams = ranked_teams[:5]

    most_unstable_team = None
    lowest_health_score = None

    for team in teams:
        try:
            analysis = get_team_analysis(team.id, db)
        except Exception:
            continue

        if lowest_health_score is None or analysis["roster_health_score"] < lowest_health_score:
            lowest_health_score = analysis["roster_health_score"]
            most_unstable_team = analysis

    featured_best_move = None
    best_move_delta = None

    for team in teams:
        try:
            best_move_result = get_best_moves_for_team(team.id, db)
        except Exception:
            continue

        if best_move_result["top_moves"]:
            top_move = best_move_result["top_moves"][0]
            delta = top_move["projection"]["summary"]["combined_delta"]

            if best_move_delta is None or delta > best_move_delta:
                best_move_delta = delta
                featured_best_move = {
                    "team": {
                        "id": team.id,
                        "name": team.name,
                    },
                    "move": top_move,
                }

    return {
        "counts": {
            "teams": len(teams),
            "players": len(players),
        },
        "strongest_player": strongest_player,
        "top_players": top_players,
        "top_teams": top_teams,
        "most_unstable_team": most_unstable_team,
        "featured_best_move": featured_best_move,
    }