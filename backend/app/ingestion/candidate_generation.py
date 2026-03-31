from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.db.models import CandidatePool, Player

MIN_STRENGTH_THRESHOLD = 60


def generate_candidate_pool(db: Session) -> dict:
    db.execute(delete(CandidatePool))
    db.commit()

    players = db.execute(select(Player)).scalars().all()

    added = 0
    skipped = 0

    for player in players:
        if player.strength_score is None:
            skipped += 1
            continue

        if player.strength_score < MIN_STRENGTH_THRESHOLD:
            skipped += 1
            continue

        candidate = CandidatePool(
            player_id=player.id,
            source="auto_generated",
        )
        db.add(candidate)
        added += 1

    db.commit()

    return {
        "candidates_added": added,
        "players_skipped": skipped,
        "min_strength_threshold": MIN_STRENGTH_THRESHOLD,
    }