"""Authentication endpoints — register and login by device ID."""

import re

import bcrypt
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field, field_validator
from slowapi import Limiter
from slowapi.util import get_remote_address

from database import get_user_by_device, register_device, rotate_token

router = APIRouter(prefix="/auth", tags=["auth"])
_limiter = Limiter(key_func=get_remote_address)

_USERNAME_RE = re.compile(r"^[a-zA-ZÀ-ÿ0-9_\-. ]{2,32}$")


class RegisterRequest(BaseModel):
    device_id: str = Field(min_length=8, max_length=128)
    username: str = Field(min_length=2, max_length=32)
    password: str = Field(min_length=4, max_length=128)

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        v = v.strip()
        if not _USERNAME_RE.match(v):
            raise ValueError("Nome de utilizador contém caracteres inválidos")
        return v


class LoginRequest(BaseModel):
    device_id: str = Field(min_length=8, max_length=128)
    password: str = Field(min_length=4, max_length=128)


class AuthResponse(BaseModel):
    token: str
    username: str


@router.post("/register", response_model=AuthResponse)
@_limiter.limit("3/hour")
async def register(request: Request, req: RegisterRequest) -> AuthResponse:
    existing = await get_user_by_device(req.device_id)
    if existing:
        raise HTTPException(
            status_code=409,
            detail="Este aparelho já tem uma conta registada. Usa a opção Entrar.",
        )

    password_hash = bcrypt.hashpw(req.password.encode(), bcrypt.gensalt()).decode()
    token = await register_device(req.device_id, req.username, password_hash)
    if token is None:
        raise HTTPException(status_code=409, detail="Este aparelho já está registado")

    return AuthResponse(token=token, username=req.username)


@router.post("/login", response_model=AuthResponse)
@_limiter.limit("10/minute")
async def login(request: Request, req: LoginRequest) -> AuthResponse:
    user = await get_user_by_device(req.device_id)
    if not user:
        raise HTTPException(
            status_code=404,
            detail="Aparelho não registado. Cria uma conta primeiro.",
        )

    if not bcrypt.checkpw(req.password.encode(), user["password_hash"].encode()):
        raise HTTPException(status_code=401, detail="Palavra-passe incorreta")

    new_token = await rotate_token(req.device_id)
    return AuthResponse(token=new_token, username=user["username"])
