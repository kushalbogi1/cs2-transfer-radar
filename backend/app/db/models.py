from sqlalchemy import Boolean, Column, Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import relationship

from app.db.database import Base


class Team(Base):
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False, index=True)
    slug = Column(String, unique=True, nullable=False, index=True)
    region = Column(String, nullable=True)
    is_tracked = Column(Boolean, default=True, nullable=False)

    rosters = relationship("TeamRoster", back_populates="team", cascade="all, delete-orphan")


class Player(Base):
    __tablename__ = "players"

    id = Column(Integer, primary_key=True, index=True)
    nickname = Column(String, unique=True, nullable=False, index=True)
    full_name = Column(String, nullable=True)
    nationality = Column(String, nullable=True)
    age = Column(Integer, nullable=True)
    strength_score = Column(Float, nullable=True)

    roster_entries = relationship("TeamRoster", back_populates="player", cascade="all, delete-orphan")
    role_assignment = relationship("PlayerRole", back_populates="player", uselist=False, cascade="all, delete-orphan")
    candidate_entry = relationship("CandidatePool", back_populates="player", uselist=False, cascade="all, delete-orphan")
    snapshots = relationship("PlayerSnapshot", back_populates="player", cascade="all, delete-orphan")


class TeamRoster(Base):
    __tablename__ = "team_rosters"
    __table_args__ = (
        UniqueConstraint("team_id", "player_id", name="uq_team_player"),
    )

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    player_id = Column(Integer, ForeignKey("players.id"), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    team = relationship("Team", back_populates="rosters")
    player = relationship("Player", back_populates="roster_entries")


class PlayerRole(Base):
    __tablename__ = "player_roles"

    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(Integer, ForeignKey("players.id"), nullable=False, unique=True)
    primary_role = Column(String, nullable=False)
    secondary_role = Column(String, nullable=True)

    player = relationship("Player", back_populates="role_assignment")


class CandidatePool(Base):
    __tablename__ = "candidate_pool"

    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(Integer, ForeignKey("players.id"), nullable=False, unique=True)
    source = Column(String, nullable=False, default="manual_seed")
    score = Column(Float, nullable=True)

    player = relationship("Player", back_populates="candidate_entry")


class PlayerSnapshot(Base):
    __tablename__ = "player_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(Integer, ForeignKey("players.id"), nullable=False, index=True)
    source = Column(String, nullable=False, default="manual_import")
    snapshot_date = Column(String, nullable=False)

    rating = Column(Float, nullable=True)
    impact = Column(Float, nullable=True)
    adr = Column(Float, nullable=True)
    kast = Column(Float, nullable=True)
    maps_played = Column(Integer, nullable=True)

    player = relationship("Player", back_populates="snapshots")