import requests

from puf import SRAMPUF
from hmac_auth import HMACAuth
from config import DEVICE_ID, MESSAGE, GATEWAY_URL


class IoTDevice:

    def __init__(self):

        self.puf = SRAMPUF(DEVICE_ID)

        self.secret = self.puf.generate_response()

        self.auth = HMACAuth(self.secret)

    def authenticate(self):

        signature, timestamp = self.auth.generate_auth_token(MESSAGE)

        payload = {
            "device_id": DEVICE_ID,
            "message": MESSAGE,
            "timestamp": timestamp,
            "hmac": signature
        }

        try:
            response = requests.post(GATEWAY_URL, json=payload, timeout=10)
            print("Server Response:", response.text)
        except requests.RequestException as err:
            print("Authentication request failed:", err)


if __name__ == "__main__":

    device = IoTDevice()

    device.authenticate()
