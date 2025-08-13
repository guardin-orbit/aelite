import ctypes
import time
import sys
import os
import threading
import winsound
from pycaw.pycaw import AudioUtilities, IAudioEndpointVolume
from comtypes import CLSCTX_ALL


# Установка громкости на 100%
def set_volume_100():
    devices = AudioUtilities.GetSpeakers()
    interface = devices.Activate(IAudioEndpointVolume._iid_, CLSCTX_ALL, None)
    volume = interface.QueryInterface(IAudioEndpointVolume)
    volume.SetMasterVolumeLevelScalar(1.0, None)  # 1.0 = 100%

# Класс для воспроизведения звука в цикле в отдельном потоке
class LoopingSoundPlayer(threading.Thread):
    def __init__(self, wav_path):
        super().__init__()
        self.wav_path = wav_path
        self._running = True
        self.daemon = True

    def run(self):
        while self._running:
            winsound.PlaySound(self.wav_path, winsound.SND_FILENAME)

    def stop(self):
        self._running = False
        winsound.PlaySound(None, winsound.SND_PURGE)

def prevent_sleep():
    try:
        # Константы Windows API
        ES_CONTINUOUS = 0x80000000
        ES_SYSTEM_REQUIRED = 0x00000001
        ES_DISPLAY_REQUIRED = 0x00000002

        class SYSTEM_POWER_STATUS(ctypes.Structure):
            _fields_ = [
                ("ACLineStatus", ctypes.c_byte),
                ("BatteryFlag", ctypes.c_byte),
                ("BatteryLifePercent", ctypes.c_byte),
                ("SystemStatusFlag", ctypes.c_byte),
                ("BatteryLifeTime", ctypes.c_ulong),
                ("BatteryFullLifeTime", ctypes.c_ulong),
            ]

        def is_on_ac_power():
            status = SYSTEM_POWER_STATUS()
            if ctypes.windll.kernel32.GetSystemPowerStatus(ctypes.byref(status)):
                return status.ACLineStatus == 1
            return False

        alert_wav_path = os.path.join(os.getcwd(), "alert.wav")
        if not os.path.isfile(alert_wav_path):
            print(f"[!] Файл alert.wav не найден по пути: {alert_wav_path}")
            play_sound = False
        else:
            play_sound = True

        sound_thread = None
        previous_state = None

        # Предотвращаем сон и отключение экрана
        ctypes.windll.kernel32.SetThreadExecutionState(
            ES_CONTINUOUS | ES_SYSTEM_REQUIRED | ES_DISPLAY_REQUIRED
        )

        print("✅ Защита от сна активна.")
        print("📡 Мониторинг питания запущен. Нажмите Ctrl+C для выхода.\n")

        while True:
            now_on_ac = is_on_ac_power()

            if previous_state is None:
                previous_state = now_on_ac

            if now_on_ac != previous_state:
                if not now_on_ac:
                    print("⚠️  Питание отключено! Запуск сигнала.")
                    set_volume_100()
                    if play_sound:
                        if sound_thread and sound_thread.is_alive():
                            sound_thread.stop()
                            sound_thread.join()
                        sound_thread = LoopingSoundPlayer(alert_wav_path)
                        sound_thread.start()
                else:
                    print("🔌 Питание восстановлено. Остановка сигнала.")
                    if sound_thread:
                        sound_thread.stop()
                        sound_thread.join()
                        sound_thread = None

                previous_state = now_on_ac

            # Обновляем флаг активности системы каждые 10 секунд
            if int(time.time()) % 10 == 0:
                ctypes.windll.kernel32.SetThreadExecutionState(
                    ES_CONTINUOUS | ES_SYSTEM_REQUIRED | ES_DISPLAY_REQUIRED
                )

            time.sleep(1)

    except KeyboardInterrupt:
        ctypes.windll.kernel32.SetThreadExecutionState(ES_CONTINUOUS)
        if sound_thread:
            sound_thread.stop()
            sound_thread.join()
        print("\nРежим питания восстановлен. Скрипт завершен.")
        sys.exit(0)

if __name__ == "__main__":
    if ctypes.windll.shell32.IsUserAnAdmin():
        prevent_sleep()
    else:
        print("Запустите скрипт от имени администратора!")
        sys.exit(1)