# logger.py
import os
import sys
from datetime import datetime
from loguru import logger

# 📁 Папка для логов
os.makedirs("logs", exist_ok=True)

# 🕓 Уникальное имя лог-файла
timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
log_path = f"logs/log_{timestamp}.log"

# ❌ Удалим дефолтный хендлер
logger.remove()


# Патч: добавляем в каждый лог пустой device_id, если его нет
def enrich_device_id(record):
    if "device_id" not in record["extra"]:
        record["extra"]["device_id"] = ""


logger = logger.patch(enrich_device_id)

# Формат для консоли с device_id (будет пустым, если device_id отсутствует)
console_format = (
    "<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | "
    "[{extra[device_id]}] "
    "{message}"
)

# ✅ Консольный лог с цветом
logger.add(sys.stdout, format=console_format, colorize=True)

# 📝 Текстовый лог в файл (без цвета, простой формат)
file_format = (
    "{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | [{extra[device_id]}] {message}"
)
logger.add(
    log_path,
    format=file_format,
    colorize=False,
    encoding="utf-8",
    rotation="2 MB",
    compression="zip",
    enqueue=True,
)

# 🔄 Экспортируем логгер
__all__ = ["logger"]