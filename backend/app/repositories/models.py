from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class ScenarioRow(Base):
    __tablename__ = "scenarios"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    bundled: Mapped[bool] = mapped_column(Boolean, default=False)
    payload: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class RunRow(Base):
    __tablename__ = "runs"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    scenario_id: Mapped[str] = mapped_column(String(64), index=True)
    strategy: Mapped[str] = mapped_column(String(32), index=True)
    seed: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(32), index=True)
    llm_mode: Mapped[str] = mapped_column(String(32))
    scenario_snapshot_hash: Mapped[str] = mapped_column(String(64))
    algorithm_version: Mapped[str] = mapped_column(String(32))
    metric_schema_version: Mapped[str] = mapped_column(String(32))
    payload: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class EventRow(Base):
    __tablename__ = "events"

    event_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    run_id: Mapped[str] = mapped_column(String(64), index=True)
    sequence: Mapped[int] = mapped_column(Integer)
    payload: Mapped[str] = mapped_column(Text)
