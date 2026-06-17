from datetime import datetime, timedelta
from typing import Optional, Dict
from jose import jwt, JWTError
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.connection import get_db_session
from app.models.school import Admin

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Le tokenUrl correspond au chemin d'accès absolu pour l'authentification.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Vérifie si un mot de passe en clair correspond au mot de passe haché."""
    return pwd_context.verify(plain_password, hashed_password)

def hash_password(password: str) -> str:
    """Génère le hash d'un mot de passe."""
    return pwd_context.hash(password)

def get_password_hash(password: str) -> str:
    """Génère le hash d'un mot de passe (alias pour compatibilité)."""
    return hash_password(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Génère un token d'accès JWT."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def get_current_user(token: str = Depends(oauth2_scheme)) -> Dict:
    """Dépendance FastAPI pour récupérer l'utilisateur connecté via le token JWT.
    Supporte Admin, SuperAdmin, et Professeur."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Identifiants ou token invalides",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    # Extraire les infos du token (fonctionne pour admin et professeur)
    user_id = payload.get("id")
    role = payload.get("role")
    school_id = payload.get("school_id")
    
    if not user_id or not role:
        raise credentials_exception
    
    return {
        "id": user_id,
        "username": username,
        "role": role,
        "school_id": school_id
    }

