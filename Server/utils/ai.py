from typing import List, Dict
import aiofiles
import json

class AI_Utils:
    def __init__(self, config: dict):
        self.config = config # Конфигурация сервера
        
        self.chat_history_folder = self.config["server"]["chat_history_folder"]
        
    async def update_chat_history(self, chat_history: List[Dict], chat_id: str): # Обновление истории для чата по его ID
        async with aiofiles.open(f"{self.chat_history_folder}/{chat_id}", mode="w", encoding="utf-8") as f:
            await f.write(str(chat_history))
            
    async def get_chat_history(self, chat_id: str) -> None | list: # Получение истории чата по его ID
        try:
            async with aiofiles.open(f"{self.chat_history_folder}/{chat_id}", mode="r", encoding="utf-8") as f:
                content = await f.read()
                return eval(content)  # Преобразуем строку обратно в список
        except FileNotFoundError:
            return None
        except (SyntaxError, ValueError):
            return None