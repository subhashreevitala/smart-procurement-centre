import os
import requests
import logging

logger = logging.getLogger(__name__)

# To configure SMS gateway, set these in environment variables
SMS_API_KEY = os.getenv("SMS_INDIA_HUB_API_KEY", "DEMO_API_KEY")
SMS_SENDER_ID = os.getenv("SMS_INDIA_HUB_SENDER_ID", "DEMO_ID")

def send_sms(phone_number: str, message: str) -> bool:
    """
    Sends an SMS using SMS India Hub API or simulates dispatch in dev mode.
    """
    if not phone_number or not message:
        return False

    clean_phone = phone_number.strip().replace(" ", "").replace("+91", "")[-10:]
    
    url = "http://cloud.smsindiahub.in/api/mt/SendSMS"
    params = {
        "APIKey": SMS_API_KEY,
        "senderid": SMS_SENDER_ID,
        "channel": 2, # Transactional
        "DCS": 0,
        "flashsms": 0,
        "number": clean_phone,
        "text": message
    }
    
    try:
        if SMS_API_KEY == "DEMO_API_KEY":
            logger.info(f"[MOCK SMS GATEWAY] >>> To: +91-{clean_phone} | Message: {message}")
            print(f"\n========================================\n[MOCK SMS GATEWAY]\nTo: +91-{clean_phone}\nMessage: {message}\n========================================\n")
            return True
            
        response = requests.get(url, params=params, timeout=5)
        response.raise_for_status()
        logger.info(f"SMS sent to +91-{clean_phone}: {response.text}")
        return True
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to send SMS to {clean_phone}. Error: {e}")
        # In dev mode, don't break flow if SMS gateway is unreachable
        return False

def send_otp_sms(phone_number: str, otp: str, purpose: str = "login") -> bool:
    """
    Sends a formatted OTP verification SMS.
    """
    if purpose == "register":
        message = f"Your verification code for Procurement Portal registration is {otp}. Valid for 5 minutes. Do not share. - Dept of Consumer Affairs"
    else:
        message = f"Your login OTP for Procurement Centre Portal is {otp}. Valid for 5 minutes. Do not share. - Dept of Consumer Affairs"
    
    return send_sms(phone_number, message)

def send_welcome_sms(phone_number: str, full_name: str) -> bool:
    """
    Sends a welcome SMS to a newly registered farmer.
    """
    message = f"Welcome {full_name}! Your registration on the DoCA Smart Procurement Portal is successful. You can now book crop procurement slots. - DoCA"
    return send_sms(phone_number, message)

def send_status_update_sms(phone_number: str, token_number: str, new_status: str) -> bool:
    """
    Sends a status update notification SMS to the farmer.
    """
    message = f"Update: Your procurement slot (Token: {token_number}) status is now '{new_status}'. - Procurement Dept"
    return send_sms(phone_number, message)
