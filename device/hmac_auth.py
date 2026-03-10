import hmac
import hashlib
import time

class HMACAuth:

    def __init__(self, secret):
        self.secret = secret.encode()

    def generate_auth_token(self, message):

        timestamp = str(int(time.time()))

        payload = message + timestamp

        signature = hmac.new(
            self.secret,
            payload.encode(),
            hashlib.sha256
        ).hexdigest()

        return signature, timestamp