import argparse
import hashlib
import hmac
import requests
import secrets
import time

from puf import SRAMPUF
from hmac_auth import HMACAuth
from config import DEVICE_ID, MESSAGE, GATEWAY_URL, PUF_MASTER_SECRET


class IoTDevice:

    def __init__(self):

        self.puf = SRAMPUF(DEVICE_ID, PUF_MASTER_SECRET)

        self.secret = self.puf.generate_response()

        self.auth = HMACAuth(self.secret)

    def _sign(self, message, timestamp, nonce):
        payload = f"{message}{timestamp}{nonce}"
        return hmac.new(self.secret.encode(), payload.encode(), hashlib.sha256).hexdigest()

    def _send_payload(self, payload, label):
        try:
            response = requests.post(GATEWAY_URL, json=payload, timeout=10)
            print(f"[{label}] HTTP {response.status_code}: {response.text}")
            return response
        except requests.RequestException as err:
            print(f"[{label}] Authentication request failed: {err}")
            return None

    def _build_payload(self, *, device_id, message, timestamp, nonce, signature):
        return {
            "device_id": device_id,
            "message": message,
            "timestamp": timestamp,
            "nonce": nonce,
            "hmac": signature
        }

    def authenticate(self):

        signature, timestamp, nonce = self.auth.generate_auth_token(MESSAGE)

        payload = self._build_payload(
            device_id=DEVICE_ID,
            message=MESSAGE,
            timestamp=timestamp,
            nonce=nonce,
            signature=signature
        )

        self._send_payload(payload, "VALID_AUTH")

    def run_demo_cases(self):
        # 1) Valid request
        timestamp = str(int(time.time()))
        nonce = secrets.token_hex(16)
        valid_signature = self._sign(MESSAGE, timestamp, nonce)
        valid_payload = self._build_payload(
            device_id=DEVICE_ID,
            message=MESSAGE,
            timestamp=timestamp,
            nonce=nonce,
            signature=valid_signature
        )
        self._send_payload(valid_payload, "VALID_CASE")

        # 2) Replay attack: resend identical payload
        self._send_payload(valid_payload, "REPLAY_ATTACK")

        # 3) Invalid HMAC: tampered signature
        bad_hmac_payload = dict(valid_payload)
        bad_hmac_payload["nonce"] = secrets.token_hex(16)
        bad_hmac_payload["hmac"] = "0" * 64
        self._send_payload(bad_hmac_payload, "INVALID_HMAC")

        # 4) Unregistered device
        unknown_device_payload = dict(valid_payload)
        unknown_device_payload["device_id"] = "unknown_device"
        unknown_device_payload["nonce"] = secrets.token_hex(16)
        unknown_device_payload["hmac"] = "0" * 64
        self._send_payload(unknown_device_payload, "UNREGISTERED_DEVICE")

        # 5) Invalid body: missing nonce
        invalid_payload = {
            "device_id": DEVICE_ID,
            "message": MESSAGE,
            "timestamp": timestamp,
            "hmac": valid_signature
        }
        self._send_payload(invalid_payload, "INVALID_PAYLOAD")


if __name__ == "__main__":

    parser = argparse.ArgumentParser(description="IoT Device Authentication Client")
    parser.add_argument(
        "--demo-cases",
        action="store_true",
        help="Run valid, attack, and invalid authentication scenarios"
    )
    args = parser.parse_args()

    device = IoTDevice()

    if args.demo_cases:
        device.run_demo_cases()
    else:
        device.authenticate()
