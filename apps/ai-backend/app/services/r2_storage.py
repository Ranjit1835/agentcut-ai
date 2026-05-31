"""Cloudflare R2 storage service (S3-compatible)."""

from __future__ import annotations

from datetime import datetime, timedelta
from pathlib import Path
from typing import BinaryIO

import boto3
import structlog
from botocore.config import Config

from app.config import get_settings

logger = structlog.get_logger(__name__)

_client: boto3.client | None = None


def get_r2_client() -> boto3.client:
    """Returns a singleton R2 (S3-compatible) client."""
    global _client
    if _client is None:
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


async def upload_file(
    file_path: str | Path,
    r2_key: str,
    content_type: str = "application/octet-stream",
) -> str:
    """Upload a local file to R2. Returns the R2 key."""
    settings = get_settings()
    client = get_r2_client()
    file_path = Path(file_path)

    logger.info("r2_upload_start", key=r2_key, size_mb=file_path.stat().st_size / (1024 * 1024))

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
    """Upload a file object to R2. Returns the R2 key."""
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
    """Generate a 7-day signed download URL."""
    settings = get_settings()
    client = get_r2_client()

    url = client.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.r2_bucket_name, "Key": r2_key},
        ExpiresIn=expires_in,
    )

    return url


async def delete_file(r2_key: str) -> None:
    """Delete a file from R2."""
    settings = get_settings()
    client = get_r2_client()

    client.delete_object(Bucket=settings.r2_bucket_name, Key=r2_key)
    logger.info("r2_delete_complete", key=r2_key)


async def download_file(r2_key: str, local_path: str | Path) -> Path:
    """Download a file from R2 to local path."""
    settings = get_settings()
    client = get_r2_client()
    local_path = Path(local_path)

    local_path.parent.mkdir(parents=True, exist_ok=True)
    client.download_file(settings.r2_bucket_name, r2_key, str(local_path))

    logger.info("r2_download_complete", key=r2_key, local=str(local_path))
    return local_path
