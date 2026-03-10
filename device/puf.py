import hashlib

class SRAMPUF:

    def __init__(self, device_id):
        self.device_id = device_id

    def generate_response(self):

        fingerprint = hashlib.sha256(self.device_id.encode()).hexdigest()

        return fingerprint