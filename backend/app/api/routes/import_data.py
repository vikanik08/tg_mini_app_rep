import os
import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any
from urllib.parse import urlparse, urlunparse

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import MetaData, Table, create_engine, inspect, insert, select, text

from app.api.routes.admin import require_admin
from app.core.config import settings

router = APIRouter(prefix="/admin/import", tags=["admin-import"])


def _normalize_postgres_url(url: str) -> str:
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+psycopg://", 1)
    return url


def _require_import_enabled() -> str:
    if os.getenv("IMPORT_DATABASE_ENABLED", "").lower() != "true":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Database import is disabled",
        )

    source_url = os.getenv("IMPORT_DATABASE_URL", "")
    if not source_url:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="IMPORT_DATABASE_URL is not configured",
        )
    return _normalize_postgres_url(source_url)


def _with_sslmode_require(url: str) -> str:
    parsed = urlparse(url)
    if "sslmode=" in parsed.query:
        return url
    query = f"{parsed.query}&sslmode=require" if parsed.query else "sslmode=require"
    return urlunparse(parsed._replace(query=query))


def _safe_error_detail(exc: Exception) -> str:
    message = str(exc).splitlines()[0]
    for value in (os.getenv("IMPORT_DATABASE_URL", ""), settings.database_url):
        if value:
            message = message.replace(value, "[database-url]")
    return f"{type(exc).__name__}: {message}"


def _table_names(engine) -> list[str]:
    return inspect(engine).get_table_names(schema="public")


def _copy_table(source_conn, target_conn, source_table: Table, target_table: Table) -> int:
    source_columns = set(source_table.columns.keys())
    target_columns = set(target_table.columns.keys())
    common_columns = [column.name for column in target_table.columns if column.name in source_columns]

    rows = source_conn.execute(select(*(source_table.c[name] for name in common_columns))).mappings()
    count = 0
    for row in rows:
        payload = dict(row)

        if target_table.name == "users":
            if "platform" in target_columns and "platform" not in payload:
                payload["platform"] = "telegram"
            if "platform_user_id" in target_columns and "platform_user_id" not in payload:
                telegram_id = payload.get("telegram_id")
                payload["platform_user_id"] = str(telegram_id) if telegram_id is not None else ""

        target_conn.execute(insert(target_table).values(payload))
        count += 1
    return count


def _to_json_value(value: Any) -> Any:
    if isinstance(value, uuid.UUID):
        return str(value)
    if isinstance(value, datetime | date):
        return value.isoformat()
    if isinstance(value, Decimal):
        return str(value)
    return value


def _prepare_payload(table_name: str, row: dict[str, Any], target_table: Table) -> dict[str, Any]:
    target_columns = set(target_table.columns.keys())
    payload = {key: value for key, value in row.items() if key in target_columns}

    if table_name == "users":
        if "platform" in target_columns and "platform" not in payload:
            payload["platform"] = "telegram"
        if "platform_user_id" in target_columns and "platform_user_id" not in payload:
            telegram_id = payload.get("telegram_id")
            payload["platform_user_id"] = str(telegram_id) if telegram_id is not None else ""

    return payload


def _reflect_current_database():
    engine = create_engine(_normalize_postgres_url(settings.database_url), pool_pre_ping=True)
    metadata = MetaData()
    metadata.reflect(bind=engine, schema="public")
    return engine, metadata


@router.get("/export")
def export_current_database(_: None = Depends(require_admin)):
    engine, metadata = _reflect_current_database()

    try:
        exported: list[dict[str, Any]] = []
        with engine.connect() as conn:
            for table in metadata.sorted_tables:
                if table.name == "alembic_version":
                    continue

                rows = []
                for row in conn.execute(select(table)).mappings():
                    rows.append({key: _to_json_value(value) for key, value in dict(row).items()})

                exported.append({"name": table.name, "rows": rows})
    finally:
        engine.dispose()

    return {"version": 1, "tables": exported}


@router.post("/payload")
def import_payload_database(payload: dict[str, Any], _: None = Depends(require_admin)):
    if os.getenv("IMPORT_DATABASE_ENABLED", "").lower() != "true":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Database import is disabled",
        )

    engine, metadata = _reflect_current_database()
    tables_by_name = {table.name: table for table in metadata.tables.values()}

    source_tables = {
        table["name"]: table.get("rows", [])
        for table in payload.get("tables", [])
        if isinstance(table, dict) and table.get("name") in tables_by_name
    }
    table_names = [name for name in _table_names(engine) if name in source_tables]
    if not table_names:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No matching tables found to import",
        )

    copied: dict[str, int] = {}
    quoted_tables = ", ".join(f'"{name}"' for name in table_names)

    try:
        with engine.begin() as conn:
            conn.execute(text(f"TRUNCATE TABLE {quoted_tables} RESTART IDENTITY CASCADE"))

            for table in metadata.sorted_tables:
                if table.name not in source_tables or table.name == "alembic_version":
                    continue

                copied[table.name] = 0
                for row in source_tables[table.name]:
                    row_payload = _prepare_payload(table.name, row, table)
                    conn.execute(insert(table).values(row_payload))
                    copied[table.name] += 1
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=_safe_error_detail(exc),
        ) from exc
    finally:
        engine.dispose()

    return {"status": "ok", "copied": copied}


@router.post("/render")
def import_render_database(_: None = Depends(require_admin)):
    source_engine = None
    target_engine = None

    try:
        source_url = _with_sslmode_require(_require_import_enabled())
        target_url = _normalize_postgres_url(settings.database_url)

        source_engine = create_engine(source_url, pool_pre_ping=True)
        target_engine = create_engine(target_url, pool_pre_ping=True)

        source_metadata = MetaData()
        target_metadata = MetaData()
        source_metadata.reflect(bind=source_engine, schema="public")
        target_metadata.reflect(bind=target_engine, schema="public")

        source_tables = {
            table.name: table
            for table in source_metadata.tables.values()
            if table.name != "alembic_version"
        }

        table_names = [name for name in _table_names(target_engine) if name in source_tables]
        if not table_names:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="No matching tables found to import",
            )

        quoted_tables = ", ".join(f'"{name}"' for name in table_names)
        copied: dict[str, int] = {}

        with source_engine.connect() as source_conn, target_engine.begin() as target_conn:
            target_conn.execute(text(f"TRUNCATE TABLE {quoted_tables} RESTART IDENTITY CASCADE"))

            for target_table in target_metadata.sorted_tables:
                if target_table.name not in source_tables or target_table.name == "alembic_version":
                    continue
                copied[target_table.name] = _copy_table(
                    source_conn,
                    target_conn,
                    source_tables[target_table.name],
                    target_table,
                )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=_safe_error_detail(exc),
        ) from exc
    finally:
        if source_engine:
            source_engine.dispose()
        if target_engine:
            target_engine.dispose()

    return {"status": "ok", "copied": copied}
