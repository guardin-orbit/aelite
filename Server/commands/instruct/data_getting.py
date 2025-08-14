import requests
import wikipedia
import re
from datetime import datetime
from zoneinfo import ZoneInfo  # Python 3.9+


wikipedia.set_lang("ru")


def get_local_time(tz_name: str) -> str | None:
    tz = ZoneInfo(tz_name)

    now = datetime.now(tz)
    return f"Текущее время в {tz_name}: {now.strftime('%Y-%m-%d %H:%M:%S')}"


def get_weather(city: str) -> str:
    def try_geocode(name):
        url = f"https://geocoding-api.open-meteo.com/v1/search?name={name}&language=ru"
        response = requests.get(url)
        data = response.json()
        return data["results"][0] if data.get("results") else None

    try:
        # Варианты написания города для геокодера
        variants = [
            city.strip(),
            re.sub(r"[\-]+", " ", city.strip()),
            re.sub(r"\s+", " ", city.strip()),
        ]

        # Пробуем все варианты, чтобы найти координаты
        loc = None
        for name in variants:
            loc = try_geocode(name)
            if loc:
                break

        if not loc:
            return "Город не найден."

        lat, lon = loc["latitude"], loc["longitude"]
        city_title = loc["name"]

        # Запрашиваем данные о погоде
        weather_resp = requests.get(
            f"https://api.open-meteo.com/v1/forecast?"
            f"latitude={lat}&longitude={lon}&current_weather=true&hourly=surface_pressure,relative_humidity_2m,cloudcover,uv_index,apparent_temperature"
        )
        data = weather_resp.json()

        current = data.get("current_weather", {})
        if not current:
            return "Ошибка при получении текущей погоды."

        current_time = current.get("time", "")
        hourly = data.get("hourly", {})
        hourly_times = hourly.get("time", [])

        # Находим индекс текущего времени в списке hourly time
        if current_time in hourly_times:
            idx = hourly_times.index(current_time)
        else:
            idx = 0  # Если не найдено, берем первый

        # Получаем значения по индексу или None, если не доступны
        def get_hourly_param(param):
            arr = hourly.get(param, [])
            return arr[idx] if idx < len(arr) else None

        pressure = get_hourly_param("surface_pressure")
        humidity = get_hourly_param("relative_humidity_2m")
        clouds = get_hourly_param("cloudcover")
        uv = get_hourly_param("uv_index")
        feels_like = get_hourly_param("apparent_temperature")

        temp = current.get("temperature")
        wind = current.get("windspeed")

        # Формируем результат
        result = (
            f"Погода в {city_title}:\n"
            f"Температура: {temp}°C\n"
            f"Ощущается как: {feels_like}°C\n"
            f"Ветер: {wind} км/ч\n"
            f"Давление: {pressure} гПа\n"
            f"Влажность: {humidity}%\n"
            f"Облачность: {clouds}%\n"
            f"УФ-индекс: {uv}"
        )

        return result

    except Exception as e:
        return f"Ошибка при получении погоды: {e}"
    

def get_wiki_summary(query: str):
    try:
        query = query.replace("_", " ") # Преобразуем в пробелы
        return wikipedia.summary(query, sentences=2)
    except:
        return "Информации не найдено."