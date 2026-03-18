from sqlalchemy import select, delete
from sqlalchemy.orm import Session

from app.db.models import Player, CandidatePool


MIN_STRENGTH_THRESHOLD = 75  # more realistic


def generate_candidate_pool(db: Session) -> dict:
    # STEP 1: clear old candidates
    db.execute(delete(CandidatePool))
    db.commit()

    players = db.execute(select(Player)).scalars().all()

    added = 0
    skipped = 0

    for player in players:
        # skip players without strength
        if player.strength_score is None:
            skipped += 1
            continue

        # threshold filter
        if player.strength_score < MIN_STRENGTH_THRESHOLD:
            skipped += 1
            continue

        candidate = CandidatePool(
            player_id=player.id,
            source="auto_generated",
            score=player.strength_score,
        )

        db.add(candidate)
        added += 1

    db.commit()

    return {
        "candidates_added": added,
        "skipped": skipped,
    }