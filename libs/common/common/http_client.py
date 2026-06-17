"""Client REST interne entre services + cache Redis (référentiel).

Les services appellent ``referentiel-service`` via REST pour les listes en
cascade et les coefficients officiels, sans dupliquer ses tables. Les réponses
sont mises en cache Redis (TTL), invalidées par l'événement ``ReferentielUpdated``.
"""
import json
import logging
from typing import Any, Optional

import httpx

logger = logging.getLogger(__name__)


class InternalClient:
    """Client HTTP interne propageant les en-têtes de confiance (contexte tenant)."""

    def __init__(self, base_url: str, internal_secret: str, timeout: float = 5.0):
        self._base_url = base_url.rstrip("/")
        self._internal_secret = internal_secret
        self._timeout = timeout

    def _headers(self, ctx: Optional[Any] = None) -> dict[str, str]:
        headers = {"X-Internal-Secret": self._internal_secret}
        if ctx is not None:
            headers["X-User-Id"] = str(ctx.user_id)
            headers["X-Role"] = ctx.role
            if ctx.tenant_id is not None:
                headers["X-Tenant-Id"] = str(ctx.tenant_id)
        return headers

    def get(self, path: str, *, ctx=None, params: Optional[dict] = None) -> Any:
        url = f"{self._base_url}/{path.lstrip('/')}"
        with httpx.Client(timeout=self._timeout) as client:
            resp = client.get(url, headers=self._headers(ctx), params=params)
            resp.raise_for_status()
            return resp.json()

    def post(self, path: str, *, ctx=None, json: Optional[dict] = None) -> Any:
        url = f"{self._base_url}/{path.lstrip('/')}"
        with httpx.Client(timeout=self._timeout) as client:
            resp = client.post(url, headers=self._headers(ctx), json=json)
            resp.raise_for_status()
            return resp.json()

    def delete(self, path: str, *, ctx=None) -> None:
        url = f"{self._base_url}/{path.lstrip('/')}"
        with httpx.Client(timeout=self._timeout) as client:
            resp = client.delete(url, headers=self._headers(ctx))
            resp.raise_for_status()


class RedisCache:
    """Cache JSON simple au-dessus de Redis."""

    def __init__(self, redis_url: str, prefix: str = "gs"):
        import redis  # import paresseux

        self._client = redis.Redis.from_url(redis_url, decode_responses=True)
        self._prefix = prefix

    def _key(self, key: str) -> str:
        return f"{self._prefix}:{key}"

    def get_json(self, key: str) -> Optional[Any]:
        try:
            raw = self._client.get(self._key(key))
            return json.loads(raw) if raw else None
        except Exception as exc:
            logger.warning("Lecture cache '%s' échouée : %s", key, exc)
            return None

    def set_json(self, key: str, value: Any, ttl_seconds: int = 3600) -> None:
        try:
            self._client.set(self._key(key), json.dumps(value, default=str), ex=ttl_seconds)
        except Exception as exc:
            logger.warning("Écriture cache '%s' échouée : %s", key, exc)

    def invalidate_prefix(self, pattern: str) -> None:
        try:
            for k in self._client.scan_iter(f"{self._prefix}:{pattern}*"):
                self._client.delete(k)
        except Exception as exc:
            logger.warning("Invalidation cache '%s' échouée : %s", pattern, exc)
