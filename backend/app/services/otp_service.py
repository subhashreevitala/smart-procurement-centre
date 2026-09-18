import time
import random
import os
import logging
from typing import Dict, Tuple, Optional
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

# Configurable settings
OTP_EXPIRY_SECONDS = 300  # 5 minutes
OTP_COOLDOWN_SECONDS = 30  # 30 seconds resend cooldown
MAX_OTP_ATTEMPTS = 5
DEMO_OTP = "123456"

# Known demo phone numbers that allow DEMO_OTP bypass
DEMO_PHONE_NUMBERS = {
    "9999999999", # Admin (DoCA Officer)
    "9876543210", # Farmer (Ramesh Kumar)
    "9876543211", # Farmer (Suresh Patel)
    "9876543212", # Farmer (Harpreet Singh)
}

# Allow dev bypass for all numbers if IS_DEV_MODE is enabled
IS_DEV_MODE = os.getenv("ENV", "development").lower() in ("development", "dev", "test")

class OTPStore:
    def __init__(self):
        # Key: f"{phone_number}:{purpose}" -> dict
        self._store: Dict[str, dict] = {}

    def _get_key(self, phone_number: str, purpose: str) -> str:
        clean_phone = phone_number.strip().replace(" ", "").replace("+91", "")[-10:]
        return f"{clean_phone}:{purpose}"

    def can_resend(self, phone_number: str, purpose: str = "login") -> Tuple[bool, int]:
        """
        Check if an OTP can be resent. Returns (can_resend, remaining_seconds).
        """
        key = self._get_key(phone_number, purpose)
        entry = self._store.get(key)
        if not entry:
            return True, 0
            
        last_sent = entry.get("last_sent_at", 0)
        elapsed = time.time() - last_sent
        if elapsed < OTP_COOLDOWN_SECONDS:
            remaining = int(OTP_COOLDOWN_SECONDS - elapsed)
            return False, remaining
        return True, 0

    def generate_otp(self, phone_number: str, purpose: str = "login") -> Tuple[Optional[str], bool, str]:
        """
        Generates and stores a 6-digit OTP for the given phone number and purpose.
        Returns (otp, success, message).
        """
        clean_phone = phone_number.strip().replace(" ", "").replace("+91", "")[-10:]
        if len(clean_phone) != 10 or not clean_phone.isdigit():
            return None, False, "Invalid 10-digit mobile number."

        can_send, remaining = self.can_resend(clean_phone, purpose)
        if not can_send:
            return None, False, f"Please wait {remaining} seconds before requesting a new OTP."

        # For known demo numbers, use DEMO_OTP for consistency in demos/tests
        if clean_phone in DEMO_PHONE_NUMBERS:
            otp = DEMO_OTP
        else:
            otp = f"{random.randint(100000, 999999)}"

        now = time.time()
        key = self._get_key(clean_phone, purpose)
        self._store[key] = {
            "otp": otp,
            "created_at": now,
            "expires_at": now + OTP_EXPIRY_SECONDS,
            "last_sent_at": now,
            "attempts": 0
        }

        logger.info(f"Generated OTP for {clean_phone} [{purpose}]: {otp}")
        return otp, True, "OTP generated successfully."

    def verify_otp(self, phone_number: str, entered_otp: str, purpose: str = "login") -> Tuple[bool, str]:
        """
        Verifies the provided OTP against the stored one.
        Returns (is_valid, message).
        """
        clean_phone = phone_number.strip().replace(" ", "").replace("+91", "")[-10:]
        entered_otp = str(entered_otp).strip()

        # Check demo bypass: if demo account or dev mode with DEMO_OTP
        if clean_phone in DEMO_PHONE_NUMBERS and entered_otp == DEMO_OTP:
            return True, "Demo verification successful."
        if IS_DEV_MODE and entered_otp == DEMO_OTP:
            return True, "Development verification successful."

        key = self._get_key(clean_phone, purpose)
        entry = self._store.get(key)

        if not entry:
            return False, "No active OTP found. Please request a new verification code."

        # Check expiration
        now = time.time()
        if now > entry.get("expires_at", 0):
            self._store.pop(key, None)
            return False, "OTP has expired. Please request a new one."

        # Check attempts
        entry["attempts"] = entry.get("attempts", 0) + 1
        if entry["attempts"] > MAX_OTP_ATTEMPTS:
            self._store.pop(key, None)
            return False, "Too many failed attempts. Please request a new OTP."

        # Verify code
        if entry.get("otp") == entered_otp:
            # One-time use: remove once verified
            self._store.pop(key, None)
            return True, "Verification successful."
        else:
            remaining_attempts = MAX_OTP_ATTEMPTS - entry["attempts"]
            return False, f"Incorrect verification code. {remaining_attempts} attempts remaining."

# Singleton instance
otp_manager = OTPStore()
