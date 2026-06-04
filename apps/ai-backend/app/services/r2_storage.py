"""Storage service — local disk in dev, Cloudflare R2 in production."""

from __future__ import annotations

import shutil
from pathlib import Path
from typing import BinaryIO

import structlog

from app.config import get_settings

logger = structlog.get_logger(__name__)

# Local storage root for dev mode
_LOCAL_STORAGE_ROOT = Path(__file__).resolve().parent.parent.parent / ".local-storage"


def _is_local_mode() -> bool:
    """Use local storage when in development."""
    settings = get_settings()
    return settings.is_development


def _local_path_for_key(r2_key: str) -> Path:
    """Map an R2 key to a local file path."""
    p = _LOCAL_STORAGE_ROOT / r2_key
    p.parent.mkdir(parents=True, exist_ok=True)
    return p


# ---------------------------------------------------------------------------
# R2 client (lazy, only created when actually needed in production)
# ---------------------------------------------------------------------------
_client = None


def get_r2_client():
    global _client
    if _client is None:
        import boto3
        from botocore.config import Config

        settings = get_settings()
        _client = boto3.client(
            "s3",
            endpoint_url=settings.r2_endpoint_url,
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key,
            region_name=settings.aws_region,
            config=Config(
                signature_version="s3v4",
                retries={"max_attempts": 3, "mode": "adaptive"},
            ),
        )
    return _client


# ---------------------------------------------------------------------------
# Public API — same interface, local or R2 backend
# ---------------------------------------------------------------------------

async def upload_file(
    file_path: str | Path,
    r2_key: str,
    content_type: str = "application/octet-stream",
) -> str:
    """Upload a local file. In dev mode, copies to .local-storage/."""
    file_path = Path(file_path)
    size_mb = file_path.stat().st_size / (1024 * 1024)

    if _is_local_mode():
        dest = _local_path_for_key(r2_key)
        shutil.copy2(file_path, dest)
        logger.info("local_upload_complete", key=r2_key, size_mb=round(size_mb, 1))
        return r2_key

    settings = get_settings()
    client = get_r2_client()
    logger.info("r2_upload_start", key=r2_key, size_mb=round(size_mb, 1))
    client.upload_file(
        Filename=str(file_path),
        Bucket=settings.r2_bucket_name,
        Key=r2_key,
        ExtraArgs={"ContentType": content_type},
    )
    logger.info("r2_upload_complete", key=r2_key)
    return r2_key


async def upload_fileobj(
    file_obj: BinaryIO,
    r2_key: str,
    content_type: str = "application/octet-stream",
) -> str:
    """Upload a file object."""
    if _is_local_mode():
        dest = _local_path_for_key(r2_key)
        with open(dest, "wb") as f:
            shutil.copyfileobj(file_obj, f)
        logger.info("local_upload_complete", key=r2_key)
        return r2_key

    settings = get_settings()
    client = get_r2_client()
    client.upload_fileobj(
        Fileobj=file_obj,
        Bucket=settings.r2_bucket_name,
        Key=r2_key,
        ExtraArgs={"ContentType": content_type},
    )
    logger.info("r2_upload_complete", key=r2_key)
    return r2_key


async def generate_signed_url(r2_key: str, expires_in: int = 604800) -> str:
    """Generate a download URL. In dev mode returns an HTTP URL served by the backend."""
    if _is_local_mode():
        return f"http://localhost:8000/storage/{r2_key}"

    settings = get_settings()
    client = get_r2_client()
    return client.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.r2_bucket_name, "Key": r2_key},
        ExpiresIn=expires_in,
    )


async def delete_file(r2_key: str) -> None:
    """Delete a file."""
    if _is_local_mode():
        local = _local_path_for_key(r2_key)
        local.unlink(missing_ok=True)
        logger.info("local_delete_complete", key=r2_key)
        return

    settings = get_settings()
    client = get_r2_client()
    client.delete_object(Bucket=settings.r2_bucket_name, Key=r2_key)
    logger.info("r2_delete_complete", key=r2_key)


async def download_file(r2_key: str, local_path: str | Path) -> Path:
    """Download a file. In dev mode, copies from .local-storage/."""
    local_path = Path(local_path)
    local_path.parent.mkdir(parents=True, exist_ok=True)

    if _is_local_mode():
        src = _local_path_for_key(r2_key)
        if not src.exists():
            raise FileNotFoundError(f"Local storage file not found: {src}")
        shutil.copy2(src, local_path)
        logger.info("local_download_complete", key=r2_key, local=str(local_path))
        return local_path

    settings = get_settings()
    client = get_r2_client()
    client.download_file(settings.r2_bucket_name, r2_key, str(local_path))
    logger.info("r2_download_complete", key=r2_key, local=str(local_path))
    return local_path
