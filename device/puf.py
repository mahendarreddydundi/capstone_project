import hashlib
import hmac

class SRAMPUF:

    def __init__(self, device_id, master_secret):
        self.device_id = device_id
        self.master_secret = master_secret.encode()

    def generate_response(self):

        fingerprint = hmac.new(
            self.master_secret,
            self.device_id.encode(),
            hashlib.sha256
        ).hexdigest()

        return fingerprint