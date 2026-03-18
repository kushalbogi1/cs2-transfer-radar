import json
from pathlib import Path
from typing import Any


class HLTVScraper:
    """
    Temporary MVP version.
    Instead of scraping HLTV live, this reads curated local JSON files.
    """

    def __init__(self, seed_teams_path: str):
        self.seed_teams_path = Path(seed_teams_path)

    def load_seed_teams(self) -> list[dict[str, Any]]:
        if not self.seed_teams_path.exists():
            raise FileNotFoundError(f"Seed teams file not found: {self.seed_teams_path}")

        with open(self.seed_teams_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        if not isinstance(data, list):
            raise ValueError("seed_teams.json must contain a list of team objects")

        return data