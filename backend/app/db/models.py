from sqlalchemy import Boolean, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class Team(Base):
    __tablename__ = "teams"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    slug: Mapped[str | None] = mapped_column(String, unique=True, nullable=True)
    region: Mapped[str | None] = mapped_column(String, nullable=True)
    is_tracked: Mapped[bool] = mapped_column(Boolean, default=True)
    competitive_tier: Mapped[str | None] = mapped_column(String, nullable=True)

    rosters: Mapped[list["TeamRoster"]] = relationship("TeamRoster", back_populates="team")


class Player(Base):
    __tablename__ = "players"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nickname: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    full_name: Mapped[str | None] = mapped_column(String, nullable=True)
    nationality: Mapped[str | None] = mapped_column(String, nullable=True)
    age: Mapped[int | None] = mapped_column(Integer, nullable=True)

    strength_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    status: Mapped[str | None] = mapped_column(String, nullable=True)  # active, bench, free_agent, inactive
    market_value_tier: Mapped[str | None] = mapped_column(String, nullable=True)  # elite, high, mid, low

    roster_entries: Mapped[list["TeamRoster"]] = relationship("TeamRoster", back_populates="player")
    role_assignment: Mapped["PlayerRole | None"] = relationship(
        "PlayerRole",
        back_populates="player",
        uselist=False,
    )
    stat_snapshots: Mapped[list["PlayerSnapshot"]] = relationship("PlayerSnapshot", back_populates="player")
    candidate_entries: Mapped[list["CandidatePool"]] = relationship("CandidatePool", back_populates="player")


class TeamRoster(Base):
    __tablename__ = "team_rosters"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    team_id: Mapped[int] = mapped_column(ForeignKey("teams.id"), nullable=False)
    player_id: Mapped[int] = mapped_column(ForeignKey("players.id"), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    team: Mapped["Team"] = relationship("Team", back_populates="rosters")
    player: Mapped["Player"] = relationship("Player", back_populates="roster_entries")


class PlayerRole(Base):
    __tablename__ = "player_roles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    player_id: Mapped[int] = mapped_column(ForeignKey("players.id"), unique=True, nullable=False)
    primary_role: Mapped[str | None] = mapped_column(String, nullable=True)
    secondary_role: Mapped[str | None] = mapped_column(String, nullable=True)

    player: Mapped["Player"] = relationship("Player", back_populates="role_assignment")


class PlayerSnapshot(Base):
    __tablename__ = "player_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    player_id: Mapped[int] = mapped_column(ForeignKey("players.id"), nullable=False)

    source: Mapped[str] = mapped_column(String, nullable=False)
    snapshot_date: Mapped[str] = mapped_column(String, nullable=False)

    rating: Mapped[float | None] = mapped_column(Float, nullable=True)
    impact: Mapped[float | None] = mapped_column(Float, nullable=True)
    adr: Mapped[float | None] = mapped_column(Float, nullable=True)
    kast: Mapped[float | None] = mapped_column(Float, nullable=True)
    maps_played: Mapped[int | None] = mapped_column(Integer, nullable=True)

    player: Mapped["Player"] = relationship("Player", back_populates="stat_snapshots")


class CandidatePool(Base):
    __tablename__ = "candidate_pool"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    player_id: Mapped[int] = mapped_column(ForeignKey("players.id"), nullable=False)
    source: Mapped[str] = mapped_column(String, nullable=False)
    score: Mapped[float | None] = mapped_column(Float, nullable=True)

    player: Mapped["Player"] = relationship("Player", back_populates="candidate_entries")