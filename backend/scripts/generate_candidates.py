from app.db.database import SessionLocal
from app.ingestion.candidate_generation import generate_candidate_pool


def main():
    db = SessionLocal()
    try:
        result = generate_candidate_pool(db)
        print("Candidate generation complete:", result)
    finally:
        db.close()


if __name__ == "__main__":
    main()