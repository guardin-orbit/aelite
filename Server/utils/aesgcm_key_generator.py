import base64
import secrets

# Генерация 32 случайных байт
key_bytes = secrets.token_bytes(32)

# Кодирование в Base64
base64_key = base64.b64encode(key_bytes).decode('utf-8')

print(base64_key)