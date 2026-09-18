import os
import firebase_admin
from firebase_admin import credentials, messaging
import logging

logger = logging.getLogger(__name__)

# Initialize Firebase only once
# In production, point GOOGLE_APPLICATION_CREDENTIALS to the service account JSON
try:
    if not firebase_admin._apps:
        # Mock initialization for prototype if creds not found
        cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        if cred_path and os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
            logger.info("Firebase Admin initialized successfully.")
        else:
            logger.warning("Firebase credentials not found. Push notifications will be mocked.")
except Exception as e:
    logger.error(f"Error initializing Firebase: {e}")

def send_push_notification(device_token: str, title: str, body: str, data: dict = None) -> bool:
    """
    Sends a push notification using Firebase Cloud Messaging (FCM).
    """
    if not firebase_admin._apps:
        # Fallback to mock behavior if no credentials
        logger.info(f"[MOCK PUSH] To: {device_token} | Title: {title} | Body: {body}")
        print(f"[MOCK PUSH] To: {device_token} | Title: {title} | Body: {body}")
        return True
        
    try:
        message = messaging.Message(
            notification=messaging.Notification(
                title=title,
                body=body
            ),
            data=data or {},
            token=device_token
        )
        response = messaging.send(message)
        logger.info(f"Successfully sent FCM message: {response}")
        return True
    except Exception as e:
        logger.error(f"Error sending FCM message: {e}")
        return False
