from app.db.database import Base, SessionLocal, engine
from app.ingestion.pipelines import (
    ingest_player_statuses,
    ingest_seed_roles,
    ingest_seed_teams,
    ingest_team_tiers,
)


def main():
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        print("Running team/player ingestion...")
        print(ingest_seed_teams(db))

        print("Running role seeding...")
        print(ingest_seed_roles(db))

        print("Running team tier seeding...")
        print(ingest_team_tiers(db))

        print("Running player status seeding...")
        print(ingest_player_statuses(db))

        print("Seed setup complete.")
    finally:
        db.close()


if __name__ == "__main__":
    main()