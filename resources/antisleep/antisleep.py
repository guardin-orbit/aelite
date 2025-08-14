import subprocess
import time
import os
import threading


class LoopingSoundPlayer(threading.Thread):
    def __init__(self, sound_path):
        super().__init__()
        self.sound_path = sound_path
        self._running = True
        self.daemon = True

    def run(self):
        while self._running:
            try:
                subprocess.run(["aplay", "-q", self.sound_path])
            except Exception as e:
                print(f"[!] Ошибка воспроизведения: {e}")

    def stop(self):
        self._running = False


def set_volume_100():
    """Устанавливает громкость на максимум (PulseAudio)."""
    try:
        subprocess.run(["pactl", "set-sink-volume", "@DEFAULT_SINK@", "100%"])
    except Exception as e:
        print(f"[!] Не удалось установить громкость: {e}")


def is_on_ac_power():
    """Проверка, подключено ли питание без pydbus."""
    power_supply_path = "/sys/class/power_supply"
    try:
        for device in os.listdir(power_supply_path):
            online_file = os.path.join(power_supply_path, device, "online")
            if os.path.isfile(online_file):
                with open(online_file, "r") as f:
                    status = f.read().strip()
                    if status == "1":
                        return True
        return False
    except Exception as e:
        print(f"[!] Ошибка проверки питания: {e}")
        return True  # По умолчанию считаем, что питание есть


def prevent_sleep():
    alert_sound_path = os.path.join(os.getcwd(), "alert.wav")
    play_sound = os.path.isfile(alert_sound_path)

    if not play_sound:
        print(f"[!] Файл alert.wav не найден по пути: {alert_sound_path}")

    sound_thread = None
    previous_state = None

    # Запуск блокировки сна через systemd-inhibit
    try:
        inhibit_proc = subprocess.Popen([
            "systemd-inhibit",
            "--what=idle:sleep",
            "--mode=block",
            "--why=Power monitoring",
            "bash", "-c", "while true; do sleep 3600; done"
        ])
    except FileNotFoundError:
        print("[!] systemd-inhibit не найден. Попробуйте caffeinate или другой метод.")
        inhibit_proc = None

    print("✅ Защита от сна активна.")
    print("📡 Мониторинг питания запущен. Нажмите Ctrl+C для выхода.\n")

    try:
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
                        sound_thread = LoopingSoundPlayer(alert_sound_path)
                        sound_thread.start()
                else:
                    print("🔌 Питание восстановлено. Остановка сигнала.")
                    if sound_thread:
                        sound_thread.stop()
                        sound_thread.join()
                        sound_thread = None

                previous_state = now_on_ac

            time.sleep(1)

    except KeyboardInterrupt:
        print("\n[✔] Завершение работы...")
        if sound_thread:
            sound_thread.stop()
            sound_thread.join()
        if inhibit_proc:
            inhibit_proc.terminate()
        print("[✔] Режим питания восстановлен. Скрипт завершён.")


if __name__ == "__main__":
    prevent_sleep()
