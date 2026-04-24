import os


GATEWAY_URL = os.getenv("GATEWAY_URL", "http://localhost:3000/auth")

DEVICE_ID = os.getenv("DEVICE_ID", "iot_device_01")

PUF_MASTER_SECRET = os.getenv("PUF_MASTER_SECRET", "CHANGE_THIS_DEV_SECRET_IN_PRODUCTION")

MESSAGE = os.getenv("MESSAGE", "device_authentication")