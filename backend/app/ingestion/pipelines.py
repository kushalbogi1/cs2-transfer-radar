import json
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config.settings import settings
from app.db.models import CandidatePool, Player, PlayerRole, Team, TeamRoster
from app.ingestion.hltv_scraper import HLTVScraper


def slugify(value: str) -> str:
    return value.strip().lower().replace(" ", "-")


def upsert_team(db: Session, name: str, region: str | None = None, is_tracked: bool = True) -> Team:
    team = db.execute(select(Team).where(Team.name == name)).scalar_one_or_none()

    if team:
        team.region = region or team.region
        team.is_tracked = is_tracked
        if not team.slug:
            team.slug = slugify(name)
        return team

    team = Team(
        name=name,
        slug=slugify(name),
        region=region,
        is_tracked=is_tracked,
    )
    db.add(team)
    db.flush()
    return team


def upsert_player(
    db: Session,
    nickname: str,
    full_name: str | None = None,
    nationality: str | None = None,
    age: int | None = None,
    strength_score: float | None = None,
) -> Player:
    player = db.execute(select(Player).where(Player.nickname == nickname)).scalar_one_or_none()

    if player:
        player.full_name = full_name or player.full_name
        player.nationality = nationality or player.nationality
        player.age = age if age is not None else player.age
        player.strength_score = strength_score if strength_score is not None else player.strength_score
        return player

    player = Player(
        nickname=nickname,
        full_name=full_name,
        nationality=nationality,
        age=age,
        strength_score=strength_score,
    )
    db.add(player)
    db.flush()
    return player


def add_player_to_team(db: Session, team: Team, player: Player) -> TeamRoster:
    roster = db.execute(
        select(TeamRoster).where(
            TeamRoster.team_id == team.id,
            TeamRoster.player_id == player.id,
        )
    ).scalar_one_or_none()

    if roster:
        roster.is_active = True
        return roster

    roster = TeamRoster(
        team_id=team.id,
        player_id=player.id,
        is_active=True,
    )
    db.add(roster)
    db.flush()
    return roster


def ingest_seed_teams(db: Session) -> dict:
    scraper = HLTVScraper(settings.seed_teams_path)
    seed_teams = scraper.load_seed_teams()

    teams_count = 0
    players_count = 0
    roster_links = 0

    for team_data in seed_teams:
        team = upsert_team(
            db,
            name=team_data["team_name"],
            region=team_data.get("region"),
            is_tracked=True,
        )
        teams_count += 1

        for player_data in team_data.get("players", []):
            player = upsert_player(
                db,
                nickname=player_data["nickname"],
                full_name=player_data.get("full_name"),
                nationality=player_data.get("nationality"),
                age=player_data.get("age"),
                strength_score=player_data.get("strength_score"),
            )
            players_count += 1

            add_player_to_team(db, team, player)
            roster_links += 1

    db.commit()

    return {
        "teams_processed": teams_count,
        "players_processed": players_count,
        "roster_links_processed": roster_links,
    }


def seed_roles(db: Session, roles_path: str) -> dict:
    path = Path(roles_path)
    if not path.exists():
        raise FileNotFoundError(f"Roles file not found: {roles_path}")

    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    count = 0
    for item in data:
        player = db.execute(
            select(Player).where(Player.nickname == item["nickname"])
        ).scalar_one_or_none()

        if not player:
            continue

        role = db.execute(
            select(PlayerRole).where(PlayerRole.player_id == player.id)
        ).scalar_one_or_none()

        if role:
            role.primary_role = item["primary_role"]
            role.secondary_role = item.get("secondary_role")
        else:
            db.add(
                PlayerRole(
                    player_id=player.id,
                    primary_role=item["primary_role"],
                    secondary_role=item.get("secondary_role"),
                )
            )

        count += 1

    db.commit()
    return {"roles_seeded": count}


def seed_candidate_pool(db: Session, candidate_path: str) -> dict:
    path = Path(candidate_path)
    if not path.exists():
        raise FileNotFoundError(f"Candidate pool file not found: {candidate_path}")

    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    count = 0
    for item in data:
        player = db.execute(
            select(Player).where(Player.nickname == item["nickname"])
        ).scalar_one_or_none()

        if not player:
            player = upsert_player(
                db,
                nickname=item["nickname"],
                full_name=item.get("full_name"),
                nationality=item.get("nationality"),
                age=item.get("age"),
                strength_score=item.get("score"),
            )

        candidate = db.execute(
            select(CandidatePool).where(CandidatePool.player_id == player.id)
        ).scalar_one_or_none()

        if candidate:
            candidate.source = item.get("source", "manual_seed")
            candidate.score = item.get("score")
        else:
            db.add(
                CandidatePool(
                    player_id=player.id,
                    source=item.get("source", "manual_seed"),
                    score=item.get("score"),
                )
            )

        count += 1

    db.commit()
    return {"candidate_pool_seeded": count}