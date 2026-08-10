"""Téléchargement d'images sûr pour le rendu PDF (anti-SSRF / anti-LFI).

Utilisé par le renderer V2. Ne loggue pas d'URL internes dans les exceptions
propagées au client.
"""
from __future__ import annotations

import ipaddress
import logging
import socket
from typing import Optional
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlparse
from urllib.request import HTTPRedirectHandler, Request, build_opener, urlopen

logger = logging.getLogger("bulletins.safe_image")

MAX_DOWNLOAD_BYTES = 2 * 1024 * 1024  # 2 MiB
MAX_REDIRECTS = 3
FETCH_TIMEOUT_SEC = 2.0
ALLOWED_SCHEMES = frozenset({"http", "https"})
MAX_URL_LENGTH = 2000


class SafeImageError(ValueError):
    """Échec de récupération d'image — message générique côté API."""


class _ValidatingRedirectHandler(HTTPRedirectHandler):
    """Re-valide chaque Location avant de suivre (anti-redirect SSRF)."""

    max_redirections = MAX_REDIRECTS

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        validate_image_url(newurl)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def _is_blocked_ip(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
        return True
    if ip.is_multicast or ip.is_unspecified:
        return True
    if isinstance(ip, ipaddress.IPv4Address):
        if ip in ipaddress.ip_network("100.64.0.0/10"):
            return True
        if ip in ipaddress.ip_network("0.0.0.0/8"):
            return True
    if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped is not None:
        return _is_blocked_ip(ip.ipv4_mapped)
    return False


def _resolve_host_ips(hostname: str) -> list[ipaddress.IPv4Address | ipaddress.IPv6Address]:
    ips: list[ipaddress.IPv4Address | ipaddress.IPv6Address] = []
    try:
        infos = socket.getaddrinfo(hostname, None, type=socket.SOCK_STREAM)
    except socket.gaierror as exc:
        raise SafeImageError("Image indisponible") from exc
    for _family, _type, _proto, _canon, sockaddr in infos:
        try:
            ips.append(ipaddress.ip_address(sockaddr[0]))
        except ValueError:
            continue
    if not ips:
        raise SafeImageError("Image indisponible")
    return ips


def validate_image_url(url: str) -> str:
    """Valide schéma + hostname/IP avant fetch. Lève SafeImageError si interdit."""
    if not url or not isinstance(url, str):
        raise SafeImageError("Image indisponible")
    url = url.strip()
    if len(url) > MAX_URL_LENGTH:
        raise SafeImageError("Image indisponible")
    lower = url.lower()
    if lower.startswith(("file:", "javascript:", "data:", "ftp:", "gopher:", "dict:")):
        raise SafeImageError("Image indisponible")

    parsed = urlparse(url)
    if parsed.scheme.lower() not in ALLOWED_SCHEMES:
        raise SafeImageError("Image indisponible")
    host = parsed.hostname
    if not host:
        raise SafeImageError("Image indisponible")
    if host.lower() in {"localhost", "metadata.google.internal"}:
        raise SafeImageError("Image indisponible")

    try:
        literal = ipaddress.ip_address(host)
    except ValueError:
        literal = None

    if literal is not None:
        if _is_blocked_ip(literal):
            raise SafeImageError("Image indisponible")
    else:
        for ip in _resolve_host_ips(host):
            if _is_blocked_ip(ip):
                raise SafeImageError("Image indisponible")
    return url


def _read_bounded(resp, max_bytes: int = MAX_DOWNLOAD_BYTES) -> bytes:
    chunks: list[bytes] = []
    total = 0
    while True:
        chunk = resp.read(64 * 1024)
        if not chunk:
            break
        total += len(chunk)
        if total > max_bytes:
            raise SafeImageError("Image trop volumineuse")
        chunks.append(chunk)
    return b"".join(chunks)


def fetch_image_bytes(url: str) -> bytes:
    """Télécharge une image HTTP(S) après validation anti-SSRF."""
    current = validate_image_url(url)
    # Re-valider juste avant connect (anti DNS rebinding)
    current = validate_image_url(current)
    req = Request(
        current,
        headers={"User-Agent": "BloomSchool-Bulletin/1.0"},
        method="GET",
    )
    opener = build_opener(_ValidatingRedirectHandler())
    try:
        resp = opener.open(req, timeout=FETCH_TIMEOUT_SEC)
    except HTTPError as exc:
        raise SafeImageError("Image indisponible") from exc
    except (URLError, TimeoutError, OSError, SafeImageError) as exc:
        if isinstance(exc, SafeImageError):
            raise
        raise SafeImageError("Image indisponible") from exc

    with resp:
        final = resp.geturl() or current
        validate_image_url(final)
        data = _read_bounded(resp)
        if not data:
            raise SafeImageError("Image indisponible")
        return data


def load_image_for_pdf(source: Optional[str]) -> Optional[bytes]:
    """Point d'entrée renderer : bytes image ou None (cadre vide).

    - http(s) → fetch sécurisé
    - data: / file: / chemins locaux → refusés (pas de LFI)
    """
    if not source or not isinstance(source, str):
        return None
    s = source.strip()
    if not s:
        return None
    if s.lower().startswith("data:"):
        return None
    if not s.lower().startswith(("http://", "https://")):
        logger.info("image_source_rejected_non_http")
        return None
    try:
        return fetch_image_bytes(s)
    except SafeImageError:
        return None
    except Exception:
        logger.info("image_fetch_failed")
        return None
