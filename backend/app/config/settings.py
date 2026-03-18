from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    app_name: str = "CS2 Transfer Radar"
    app_env: str = "dev"
    database_url: str = "postgresql+psycopg://cs2:cs2@127.0.0.1:5432/cs2analytics"
    frontend_url: str | None = None

    tracked_teams_path: str = str(BASE_DIR / "config" / "tracked_teams.json")
    seed_teams_path: str = str(BASE_DIR / "data" / "seed_teams.json")
    seed_roles_path: str = str(BASE_DIR / "data" / "seed_roles.json")
    candidate_pool_path: str = str(BASE_DIR / "data" / "candidate_pool.json")
    player_stats_path: str = str(BASE_DIR / "data" / "player_stats.json")

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )


settings = Settings()