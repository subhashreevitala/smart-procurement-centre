from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from typing import Union
from app.database import get_db
from app import models, schemas
from app.auth_utils import create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES, get_current_active_user
from app.services.otp_service import otp_manager, IS_DEV_MODE, DEMO_PHONE_NUMBERS
from app.services import sms_service

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

@router.post("/send-otp", response_model=schemas.OTPResponse)
def send_otp(request: schemas.OTPRequest, db: Session = Depends(get_db)):
    """
    Generate and dispatch a 6-digit SMS OTP for Login or Registration.
    """
    clean_phone = request.phone_number.strip().replace(" ", "").replace("+91", "")[-10:]
    if len(clean_phone) != 10 or not clean_phone.isdigit():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide a valid 10-digit Indian mobile number."
        )

    purpose = request.purpose or "login"
    existing_user = db.query(models.User).filter(models.User.phone_number == clean_phone).first()

    if purpose == "login":
        if not existing_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No account found with mobile number '{clean_phone}'. Please register first."
            )
    elif purpose == "register":
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Mobile number '{clean_phone}' is already registered. Please sign in instead."
            )

    otp, success, msg = otp_manager.generate_otp(clean_phone, purpose=purpose)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=msg
        )

    # Dispatch SMS via gateway
    sms_service.send_otp_sms(clean_phone, otp, purpose=purpose)

    # In dev mode or for demo accounts, include the OTP in the response for UI testing helpers
    dev_otp_val = otp if (IS_DEV_MODE or clean_phone in DEMO_PHONE_NUMBERS) else None

    return schemas.OTPResponse(
        success=True,
        message=f"Verification code sent to +91 {clean_phone}",
        phone_number=clean_phone,
        expires_in_seconds=300,
        dev_otp=dev_otp_val
    )

@router.post("/verify-otp", response_model=schemas.Token)
def verify_otp(request: schemas.OTPVerifyRequest, db: Session = Depends(get_db)):
    """
    Verify the 6-digit SMS OTP and authenticate the user.
    """
    clean_phone = request.phone_number.strip().replace(" ", "").replace("+91", "")[-10:]
    purpose = request.purpose or "login"

    is_valid, msg = otp_manager.verify_otp(clean_phone, request.otp, purpose=purpose)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=msg
        )

    user = db.query(models.User).filter(models.User.phone_number == clean_phone).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with phone number '{clean_phone}' not found."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is deactivated. Please contact the Mandi Administrator."
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/register", response_model=schemas.Token, status_code=status.HTTP_201_CREATED)
def register(user_in: schemas.UserRegisterWithOTP, db: Session = Depends(get_db)):
    """
    Register a new farmer with SMS OTP verification.
    """
    clean_phone = user_in.phone_number.strip().replace(" ", "").replace("+91", "")[-10:]
    if len(clean_phone) != 10 or not clean_phone.isdigit():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide a valid 10-digit mobile number."
        )

    existing_user = db.query(models.User).filter(models.User.phone_number == clean_phone).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Phone number '{clean_phone}' is already registered. Please sign in."
        )

    # Verify OTP
    is_valid, msg = otp_manager.verify_otp(clean_phone, user_in.otp, purpose="register")
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Phone verification failed: {msg}"
        )

    new_user = models.User(
        phone_number=clean_phone,
        full_name=user_in.full_name.strip(),
        role=models.Role.farmer
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Send Welcome SMS
    sms_service.send_welcome_sms(clean_phone, new_user.full_name)

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(new_user.id)}, expires_delta=access_token_expires
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": new_user
    }

@router.post("/login", response_model=schemas.Token)
def login_form_compatibility(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """
    OAuth2 Password Form compatible login endpoint for Swagger UI and automated tooling.
    Accepts phone number in the username field.
    """
    clean_phone = form_data.username.strip().replace(" ", "").replace("+91", "")[-10:]
    user = db.query(models.User).filter(models.User.phone_number == clean_phone).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with phone number '{clean_phone}' not found. Please register first."
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=schemas.User)
def get_me(current_user: models.User = Depends(get_current_active_user)):
    """
    Get current authenticated user details.
    """
    return current_user
