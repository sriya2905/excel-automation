from fastapi import APIRouter, HTTPException, status



from models.schemas import AuthLoginRequest, AuthSetupRequest

from services.auth_service import AuthService



router = APIRouter(prefix="/auth", tags=["Authentication"])

auth_service = AuthService()





@router.get("/status")

def auth_status():

    return {

        "configured": auth_service.is_configured(),

        "users": auth_service.list_usernames(),

    }





@router.post("/setup")

def auth_setup(body: AuthSetupRequest):

    if auth_service.is_configured():

        raise HTTPException(

            status_code=status.HTTP_400_BAD_REQUEST,

            detail="Passwords are already configured. Run setup.bat to reset.",

        )

    try:

        auth_service.setup_passwords(body.passwords)

    except ValueError as exc:

        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return {"status": "success", "message": "Passwords saved. You can log in now."}





@router.post("/login")

def auth_login(body: AuthLoginRequest):

    if not auth_service.is_configured():

        raise HTTPException(

            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,

            detail="Authentication is not configured. Complete initial setup first.",

        )

    if not auth_service.verify_login(body.username, body.password):

        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password.")

    token = auth_service.create_token(body.username)

    return {"token": token, "username": body.username, "status": "success"}





@router.post("/logout")

def auth_logout():

    return {"status": "success", "message": "Logged out. Clear token on client."}

