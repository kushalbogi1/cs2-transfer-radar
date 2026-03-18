from app.config.settings import settings
from app.db.database import SessionLocal
from app.ingestion.pipelines import seed_candidate_pool


def main():
    db = SessionLocal()
    try:
        result = seed_candidate_pool(db, settings.candidate_pool_path)
        print("Candidate pool seeding complete:", result)
    finally:
        db.close()


if __name__ == "__main__":
    main()