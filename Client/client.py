from aelite_client import AEliteClient
import asyncio

# ✅ Пример использования
async def main():
    client = AEliteClient()

    print("Авторизация...")
    await client.login("esolment", "20132113esO")

    print("Инициализация LLM...")
    await client.init_llm("AIzaSyAxxbcHisBERkmy8-6V8BuymFUg9Qkv4zI")

    print("Настройка модели...")
    await client.update_model_settings(
        ai_model="gemini-2.5-flash",
        system_prompt="You are an assistant.",
        temperature=0.2,
        max_tokens_allowed=100000,
        message_max_tokens=2048
    )

    print("Отправка сообщения Create...")
    response = await client.create(message="Привет, что ты умеешь?", system_message="Ты полезный ассистент.", ai_model="gemini-2.5-flash", ai_temperature=0.5)
    print("Ответ:", response)

    await client.close()


if __name__ == "__main__":
    asyncio.run(main())


"""
# ✅ Пример использования
async def main():
    client = AEliteClient()

    print("Регистрация...")
    await client.register("testuser", "testpass123")

    print("Авторизация...")
    await client.login("testuser", "testpass123")

    print("Инициализация LLM...")
    await client.init_llm("AIzaSyAxxbcHisBERkmy8-6V8BuymFUg9Qkv4zI")

    print("Настройка модели...")
    await client.update_model_settings(
        ai_model="gemini-2.5-flash",
        system_prompt="You are an assistant.",
        temperature=0.2,
        max_tokens_allowed=100000,
        message_max_tokens=2048
    )

    print("Создание чата...")
    chat = await client.create_chat()
    chat_id = chat["message"].split("=")[-1]

    print("Отправка сообщения...")
    response = await client.answer("Привет, как дела?", chat_id=chat_id, use_processing=False)
    print("Ответ:", response)

    print("Получение истории чата...")
    history = await client.get_chat_history(chat_id)
    print(history)

    print("Удаление чата...")
    await client.delete_chat(chat_id)

    await client.close()


if __name__ == "__main__":
    asyncio.run(main())
"""
