from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm

from app.api.deps import DbManagerDep
from app.modules.auth.schemas import TokenResponse
from app.modules.auth.service import AuthService

router = APIRouter()


@router.post("/token", response_model=TokenResponse)
async def issue_token(
    manager: DbManagerDep,
    form: OAuth2PasswordRequestForm = Depends(),
) -> TokenResponse:
    service = AuthService(manager)
    return await service.login(username=form.username, password=form.password)
