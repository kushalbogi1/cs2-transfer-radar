from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.best_move import router as best_move_router
from app.api.routes.dashboard import router as dashboard_router
from app.api.routes.dream_team import router as dream_team_router
from app.api.routes.player_stats import router as player_stats_router
from app.api.routes.players import router as players_router
from app.api.routes.simulator import router as simulator_router
from app.api.routes.suggestions import router as suggestions_router
from app.api.routes.team_analysis import router as team_analysis_router
from app.api.routes.teams import router as teams_router
from app.api.routes.transfer_battle import router as transfer_battle_router
from app.config.settings import settings

app = FastAPI(title=settings.app_name)

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

origins = [
    FRONTEND_URL,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]



allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

if settings.frontend_url:
    allowed_origins.append(settings.frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "message": "CS2 Transfer Radar API",
        "environment": settings.app_env,
        "status": "ok",
    }


app.include_router(teams_router)
app.include_router(players_router)
app.include_router(player_stats_router)
app.include_router(simulator_router)
app.include_router(dream_team_router)
app.include_router(team_analysis_router)
app.include_router(transfer_battle_router)
app.include_router(suggestions_router)
app.include_router(best_move_router)
app.include_router(dashboard_router)



