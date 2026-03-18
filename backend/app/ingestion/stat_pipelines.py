import json
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Player, PlayerSnapshot


def normalize_to_100(value: float, min_val: float, max_val: float) -> float:
    if value is None:
        return 70.0
    if max_val == min_val:
        return 70.0
    scaled = ((value - min_val) / (max_val - min_val)) * 100
    return max(0.0, min(100.0, scaled))


def compute_strength_score(
    rating: float | None,
    impact: float | None,
    adr: float | None,
    kast: float | None,
    maps_played: int | None,
) -> float:
    rating_score = normalize_to_100(rating or 1.0, 0.8, 1.4)
    impact_score = normalize_to_100(impact or 1.0, 0.7, 1.5)
    adr_score = normalize_to_100(adr or 70.0, 50.0, 100.0)
    kast_score = normalize_to_100(kast or 68.0, 55.0, 80.0)
    maps_score = normalize_to_100(float(maps_played or 20), 0.0, 100.0)

    strength = (
        rating_score * 0.40 +
        impact_score * 0.20 +
        adr_score * 0.15 +
        kast_score * 0.15 +
        maps_score * 0.10
    )
    return round(strength, 2)


def ingest_player_stats(db: Session, stats_path: str) -> dict:
    path = Path(stats_path)
    if not path.exists():
        raise FileNotFoundError(f"Player stats file not found: {stats_path}")

    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    snapshots_created = 0
    players_updated = 0
    skipped = []

    for item in data:
        nickname = item["nickname"]

        player = db.execute(
            select(Player).where(Player.nickname == nickname)
        ).scalar_one_or_none()

        if not player:
            skipped.append(nickname)
            continue

        snapshot = PlayerSnapshot(
            player_id=player.id,
            source=item.get("source", "manual_import"),
            snapshot_date=item.get("snapshot_date", "2026-03-16"),
            rating=item.get("rating"),
            impact=item.get("impact"),
            adr=item.get("adr"),
            kast=item.get("kast"),
            maps_played=item.get("maps_played"),
        )
        db.add(snapshot)
        snapshots_created += 1

        player.strength_score = compute_strength_score(
            rating=item.get("rating"),
            impact=item.get("impact"),
            adr=item.get("adr"),
            kast=item.get("kast"),
            maps_played=item.get("maps_played"),
        )
        players_updated += 1

    db.commit()

    return {
        "snapshots_created": snapshots_created,
        "players_updated": players_updated,
        "skipped_players": skipped,
    }