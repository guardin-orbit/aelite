from typing import Callable, Optional

class Device:
    def __init__(
        self,
        name: str,
        type: str = "device",
        enable_method: Optional[Callable[[], None]] = None,
        disable_method: Optional[Callable[[], None]] = None,
        restart_method: Optional[Callable[[], None]] = None,
        set_method: Optional[Callable[[str, object], None]] = None,
        get_method: Optional[Callable[[object], None]] = None
    ):
        self.name = name
        self.type = type
        
        self.enable_method = enable_method
        self.disable_method = disable_method
        self.restart_method = restart_method
        self.set_method = set_method
        self.get_method = get_method

    def enable(self):
        if self.enable_method:
            self.enable_method(self.name)
        else:
            print(f"{self.name} не имеет события включения")

    def disable(self):
        if self.disable_method:
            self.disable_method(self.name)
        else:
            print(f"{self.name} не имеет события выключения")
            
    def restart(self):
        if self.restart_method:
            self.restart_method()
        else:
            print(f"{self.name} не имеет события перезагрузки")
            

    def get(self, parameter: str | None = None):
        if self.get_method:
            return self.get_method(parameter)
        else:
            print(f"{self.name} не имеет события получения данных")
            

    def set(self, parameter: str, value: str | None = None):
        if self.set_method:
            self.set_method(parameter, value)
        else:
            print(f"{self.name} не имеет события настройки")


import commands.instruct.data_getting as dg


# Регистр устройств
DEVICES = {
    "calendar": Device("calendar", type="group", get_method=dg.get_local_time),
    "meteostation": Device("weather", type="group", get_method=dg.get_weather),
    "searcher": Device("searcher", type="group", get_method=dg.get_wiki_summary)
}
