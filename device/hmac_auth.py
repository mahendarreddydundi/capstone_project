import hmac
import hashlib
import time
import secrets

class HMACAuth:

    def __init__(self, secret):
        self.secret = secret.encode()

    def generate_auth_token(self, message):

        timestamp = str(int(time.time()))
        nonce = secrets.token_hex(16)

        payload = message + timestamp + nonce

        signature = hmac.new(
            self.secret,
            payload.encode(),
            hashlib.sha256
        ).hexdigest()

        return signature, timestamp, nonce