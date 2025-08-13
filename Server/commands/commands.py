import time
from .devices import DEVICES
from utils.logger import logger

def speak(text: str):
    pass # Заглушка

def cmd_message(args):
    text = " ".join(args)
    return text # Просто возвращаем текст назад


def cmd_enable(args):
    device = DEVICES.get(args[0])
    if device:
        device.enable()
        logger.success(f"Устройство {device.name} включено")
    else:
        speak("Неизвестное устройство")


def cmd_disable(args):
    device = DEVICES.get(args[0])
    if device:
        device.disable()
        logger.success(f"Устройство {device.name} отключено")
    else:
        speak("Неизвестное устройство")


def cmd_restart(args):
    device = DEVICES.get(args[0])
    if device:
        device.restart()
        logger.success(f"Устройство {device.name} перезагружено")
    else:
        speak("Неизвестное устройство")
        

def cmd_get(args):
    device = DEVICES.get(args[0])
    if device:
        return device.get(args[1])
    else:
        speak("Неизвестное устройство")


def cmd_set(args):
    if len(args) < 3:
        speak("Недостаточно аргументов для set")
        return
    device = DEVICES.get(args[0])
    if device:
        parameter = args[1]
        value = args[2]
        device.set(parameter, value)
    else:
        speak("Неизвестное устройство")


def cmd_timesleep(args):
    try:
        duration = float(args[0])
        time.sleep(duration)
    except Exception:
        speak("Неверный формат времени")


# Регистр команд
COMMANDS = {
    "message": cmd_message,
    "enable": cmd_enable,
    "disable": cmd_disable,
    "restart": cmd_restart,
    "get": cmd_get,
    "set": cmd_set,
    "timesleep": cmd_timesleep,
}
