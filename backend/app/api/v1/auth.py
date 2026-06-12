from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm

from app.api.deps import DbManagerDep
from app.modules.auth.schemas import TokenResponse
from app.modules.auth.service import AuthService
from app.modules.users.schemas import UserRegisterRequest, UserRead
from app.modules.users.service import UserService

router = APIRouter()


@router.post("/token", response_model=TokenResponse)
async def issue_token(
    manager: DbManagerDep,
    form: OAuth2PasswordRequestForm = Depends(),
) -> TokenResponse:
    service = AuthService(manager)
    return await service.login(username=form.username, password=form.password)

@router.post("/register", response_model=UserRead)
async def register(
    payload: UserRegisterRequest,
    manager: DbManagerDep,
) -> UserRead:
    service = UserService(manager)
    user = await service.register_user(payload)
    return UserRead.from_db(user)
