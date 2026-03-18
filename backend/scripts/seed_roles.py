from app.config.settings import settings
from app.db.database import SessionLocal
from app.ingestion.pipelines import seed_roles


def main():
    db = SessionLocal()
    try:
        result = seed_roles(db, settings.seed_roles_path)
        print("Role seeding complete:", result)
    finally:
        db.close()


if __name__ == "__main__":
    main()