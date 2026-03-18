from app.db.database import Base, engine
from app.db.models import CandidatePool, Player, PlayerRole, Team, TeamRoster  # noqa: F401


def main():
    Base.metadata.create_all(bind=engine)
    print("Tables created successfully.")


if __name__ == "__main__":
    main()