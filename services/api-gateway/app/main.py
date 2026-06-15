"""API Gateway — point d'entrée unique du SaaS Scolaire.

Responsabilités :
- CORS pour le frontend ;
- validation du JWT (sauf routes publiques d'auth) ;
- extraction des claims et **injection des en-têtes de confiance** internes
  (``X-User-Id``, ``X-Role``, ``X-Tenant-Id``, ``X-Internal-Secret``) ;
- reverse-proxy vers le service cible selon le préfixe d'URL.

Le frontend ne parle qu'à la gateway ; jamais directement à un service.
"""
import httpx
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from common.jwt import JWTError, decode_token

from app.config import settings

app = FastAPI(title="API Gateway — SaaS Scolaire", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes accessibles sans JWT (login / bootstrap superadmin).
PUBLIC_PATHS = {
    "auth/login",
    "auth/login-professor",
    "auth/register-superadmin",
}

_ROUTES = settings.routes()


@app.get("/health", tags=["infra"])
def health() -> dict:
    return {"status": "ok", "service": "api-gateway"}


def _hop_by_hop(name: str) -> bool:
    return name.lower() in {
        "connection", "keep-alive", "transfer-encoding", "te", "trailer",
        "proxy-authorization", "proxy-authenticate", "upgrade", "host",
        "content-length",
    }


@app.api_route("/{prefix}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_root(prefix: str, request: Request) -> Response:
    """Préfixe nu, sans sous-chemin (ex. GET /eleves, GET /notifications)."""
    return await proxy(prefix, "", request)


@app.api_route(
    "/{prefix}/{path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
)
async def proxy(prefix: str, path: str, request: Request) -> Response:
    target = _ROUTES.get(prefix)
    if target is None:
        return JSONResponse({"detail": "Ressource inconnue"}, status_code=404)

    full_path = f"{prefix}/{path}" if path else prefix
    headers = {k: v for k, v in request.headers.items() if not _hop_by_hop(k)}

    # Authentification, sauf routes publiques.
    if full_path not in PUBLIC_PATHS:
        auth = request.headers.get("authorization", "")
        if not auth.lower().startswith("bearer "):
            return JSONResponse({"detail": "Token manquant"}, status_code=401)
        try:
            claims = decode_token(auth.split(" ", 1)[1])
        except JWTError:
            return JSONResponse({"detail": "Token invalide ou expiré"}, status_code=401)

        # En-têtes de confiance injectés vers le service aval.
        headers["X-User-Id"] = str(claims.user_id)
        headers["X-Role"] = claims.role
        tenant_id = claims.tenant_id
        # Superadmin sans tenant : peut cibler un établissement via X-School-Id (frontend).
        if tenant_id is None and claims.role == "superadmin":
            school_hdr = request.headers.get("x-school-id") or request.headers.get("X-School-Id")
            if school_hdr:
                tenant_id = int(school_hdr)
        if tenant_id is not None:
            headers["X-Tenant-Id"] = str(tenant_id)
        headers["X-Internal-Secret"] = settings.internal_shared_secret
        headers.pop("authorization", None)

    body = await request.body()
    url = f"{target}/{full_path}"
    async with httpx.AsyncClient(timeout=30.0) as client:
        upstream = await client.request(
            request.method, url, headers=headers, params=request.query_params, content=body
        )

    resp_headers = {
        k: v for k, v in upstream.headers.items() if not _hop_by_hop(k)
    }
    return Response(
        content=upstream.content,
        status_code=upstream.status_code,
        headers=resp_headers,
        media_type=upstream.headers.get("content-type"),
    )
