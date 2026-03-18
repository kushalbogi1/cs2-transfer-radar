from app.config.settings import settings
from app.db.database import SessionLocal
from app.ingestion.stat_pipelines import ingest_player_stats


def main():
    db = SessionLocal()
    try:
        result = ingest_player_stats(db, settings.player_stats_path)
        print("Player stats ingestion complete:", result)
    finally:
        db.close()


if __name__ == "__main__":
    main()