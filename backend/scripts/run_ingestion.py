from app.db.database import SessionLocal
from app.ingestion.pipelines import ingest_seed_teams


def main():
    db = SessionLocal()
    try:
        result = ingest_seed_teams(db)
        print("Ingestion complete:", result)
    finally:
        db.close()


if __name__ == "__main__":
    main()