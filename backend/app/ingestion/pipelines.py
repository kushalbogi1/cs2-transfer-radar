import json
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config.settings import settings
from app.db.models import Player, PlayerRole, Team, TeamRoster


def load_json(path: str):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def upsert_team(
    db: Session,
    name: str,
    slug: str | None = None,
    region: str | None = None,
    is_tracked: bool = True,
):
    team = db.execute(select(Team).where(Team.name == name)).scalar_one_or_none()
    if not team:
        team = Team(name=name)
        db.add(team)
        db.flush()

    team.slug = slug
    team.region = region
    team.is_tracked = is_tracked
    return team


def upsert_player(
    db: Session,
    nickname: str,
    full_name: str | None = None,
    nationality: str | None = None,
    age: int | None = None,
    strength_score: float | int | None = None,
):
    player = db.execute(select(Player).where(Player.nickname == nickname)).scalar_one_or_none()
    if not player:
        player = Player(nickname=nickname)
        db.add(player)
        db.flush()

    player.full_name = full_name
    player.nationality = nationality
    player.age = age
    player.strength_score = strength_score
    return player


def upsert_roster_link(db: Session, team_id: int, player_id: int, is_active: bool = True):
    existing = db.execute(
        select(TeamRoster).where(
            TeamRoster.team_id == team_id,
            TeamRoster.player_id == player_id,
        )
    ).scalar_one_or_none()

    if not existing:
        existing = TeamRoster(team_id=team_id, player_id=player_id, is_active=is_active)
        db.add(existing)
        db.flush()
    else:
        existing.is_active = is_active

    return existing


def upsert_role(db: Session, player_id: int, primary_role: str | None, secondary_role: str | None = None):
    role = db.execute(select(PlayerRole).where(PlayerRole.player_id == player_id)).scalar_one_or_none()

    if not role:
        role = PlayerRole(player_id=player_id)
        db.add(role)
        db.flush()

    role.primary_role = primary_role
    role.secondary_role = secondary_role
    return role


def ingest_seed_teams(db: Session):
    seed_teams = load_json(settings.seed_teams_path)

    teams_processed = 0
    players_processed = 0
    roster_links_processed = 0

    for team_payload in seed_teams:
        team = upsert_team(
            db,
            name=team_payload["team_name"],
            slug=team_payload.get("slug"),
            region=team_payload.get("region"),
            is_tracked=True,
        )
        teams_processed += 1

        # Mark all current links for this team inactive first
        existing_team_links = db.execute(
            select(TeamRoster).where(TeamRoster.team_id == team.id)
        ).scalars().all()

        for link in existing_team_links:
            link.is_active = False

        for player_payload in team_payload.get("players", []):
            player = upsert_player(
                db,
                nickname=player_payload["nickname"],
                full_name=player_payload.get("full_name"),
                nationality=player_payload.get("nationality"),
                age=player_payload.get("age"),
                strength_score=player_payload.get("strength_score"),
            )
            players_processed += 1

            # If this player is active on another team, deactivate that old link
            other_active_links = db.execute(
                select(TeamRoster).where(
                    TeamRoster.player_id == player.id,
                    TeamRoster.team_id != team.id,
                    TeamRoster.is_active == True,
                )
            ).scalars().all()

            for old_link in other_active_links:
                old_link.is_active = False

            upsert_roster_link(
                db,
                team_id=team.id,
                player_id=player.id,
                is_active=player_payload.get("is_active", True),
            )
            roster_links_processed += 1

    db.commit()

    return {
        "teams_processed": teams_processed,
        "players_processed": players_processed,
        "roster_links_processed": roster_links_processed,
    }


def ingest_seed_roles(db: Session):
    roles_payload = load_json(settings.seed_roles_path)
    seeded = 0

    for item in roles_payload:
        player = db.execute(select(Player).where(Player.nickname == item["nickname"])).scalar_one_or_none()
        if not player:
            continue

        upsert_role(
            db,
            player_id=player.id,
            primary_role=item.get("primary_role"),
            secondary_role=item.get("secondary_role"),
        )
        seeded += 1

    db.commit()
    return {"roles_seeded": seeded}


def ingest_team_tiers(db: Session):
    payload = load_json(settings.team_tiers_path)
    updated = 0

    for item in payload:
        team = db.execute(select(Team).where(Team.name == item["team_name"])).scalar_one_or_none()
        if not team:
            continue

        team.competitive_tier = item.get("competitive_tier")
        updated += 1

    db.commit()
    return {"team_tiers_updated": updated}


def ingest_player_statuses(db: Session):
    payload = load_json(settings.player_statuses_path)
    updated = 0

    for item in payload:
        player = db.execute(select(Player).where(Player.nickname == item["nickname"])).scalar_one_or_none()
        if not player:
            continue

        player.status = item.get("status")
        player.market_value_tier = item.get("market_value_tier")
        updated += 1

    db.commit()
    return {"player_statuses_updated": updated}