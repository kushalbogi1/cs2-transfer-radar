from app.db.database import Base, SessionLocal, engine
from app.db.models import CandidatePool, Player, PlayerRole, Team, TeamRoster  # noqa: F401
from app.ingestion.pipelines import ingest_seed_teams, seed_candidate_pool, seed_roles
from app.config.settings import settings


def main():
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        print("Running team/player ingestion...")
        print(ingest_seed_teams(db))

        print("Running role seeding...")
        print(seed_roles(db, settings.seed_roles_path))

        print("Running candidate pool seeding...")
        print(seed_candidate_pool(db, settings.candidate_pool_path))

        print("Seed setup complete.")
    finally:
        db.close()


if __name__ == "__main__":
    main()