from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import Player, PlayerSnapshot


router = APIRouter(prefix="/players", tags=["player-stats"])


@router.get("/{player_id}/stats")
def get_player_stats(player_id: int, db: Session = Depends(get_db)):
    player = db.execute(
        select(Player).where(Player.id == player_id)
    ).scalar_one_or_none()

    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    snapshots = db.execute(
        select(PlayerSnapshot)
        .where(PlayerSnapshot.player_id == player.id)
        .order_by(desc(PlayerSnapshot.snapshot_date), desc(PlayerSnapshot.id))
    ).scalars().all()

    latest = snapshots[0] if snapshots else None

    return {
        "player": {
            "id": player.id,
            "nickname": player.nickname,
            "full_name": player.full_name,
            "strength_score": player.strength_score,
        },
        "latest_snapshot": (
            {
                "source": latest.source,
                "snapshot_date": latest.snapshot_date,
                "rating": latest.rating,
                "impact": latest.impact,
                "adr": latest.adr,
                "kast": latest.kast,
                "maps_played": latest.maps_played,
            }
            if latest
            else None
        ),
        "snapshot_count": len(snapshots),
        "snapshots": [
            {
                "id": snap.id,
                "source": snap.source,
                "snapshot_date": snap.snapshot_date,
                "rating": snap.rating,
                "impact": snap.impact,
                "adr": snap.adr,
                "kast": snap.kast,
                "maps_played": snap.maps_played,
            }
            for snap in snapshots
        ],
    }