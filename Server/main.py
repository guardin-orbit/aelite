from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, Request, Response, Depends, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext
from pydantic import BaseModel
from pathlib import Path
import uvicorn
from guardin_mind import Mind
import toml
from utils.logger import logger
from utils.strings_utils import count_tokens
import uuid
from utils.ai import AI_Utils
from typing import Dict, Any
from commands.command_executor import execute_script
import asyncio
import aiofiles
from datetime import datetime, timedelta
from jose import jwt, JWTError, ExpiredSignatureError
from contextlib import asynccontextmanager

from databases import Database
from sqlalchemy import create_engine, MetaData, Table, Column, String
from sqlalchemy.sql import select

DATABASE_URL = "sqlite:///./database/users.db"

database = Database(DATABASE_URL)
metadata = MetaData()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

users = Table(
    "users",
    metadata,
    Column("username", String, primary_key=True),
    Column("hashed_password", String, nullable=False),
)

engine = create_engine(DATABASE_URL)
metadata.create_all(engine)  # создаст таблицу при запуске

# Init server
config = toml.load("config.toml")
ai_utils = AI_Utils(config)
mind = Mind() # INIT MIND


# Global
llm = None # LLM model
max_tokens_allowed: int = 900000 # Максимальное количество токенов хранимое чатом (если будет превышено старые записи удалятся)
message_max_tokens: int = 4096 # Максимальное количество токенов в одном сообщении
model_temperature: float = 0.1 # Температура модели (чем меньше, тем более строгая, чем больше, тем более творческая)
ai_model: str = "gemini-2.5-flash" # Модель LLM
system_message: str = config["ai"]["system_prompt"] # Системный промпт


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Код, который выполняется при запуске сервера
    await database.connect()
    yield  # Здесь приложение работает
    # Код, который выполняется при завершении сервера
    await database.disconnect()


app = FastAPI(
    title="AElite Server",
    lifespan=lifespan,
    description="Official AElite Server",
    version="1.1.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # или список доменов, откуда разрешены запросы
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# === Служебные монтирования ===
# Раздаём challenge-файлы для получения сертификата
app.mount("/.well-known/acme-challenge", StaticFiles(directory=".well-known/acme-challenge"), name="acme-challenge")

# Настройки
SECRET_KEY = config["secret"]["key"]  # Замени на безопасный ключ
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

# === Аутентификация ===
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


async def get_user(username: str):
    query = users.select().where(users.c.username == username)
    user = await database.fetch_one(query)
    return user

async def create_user(username: str, password: str):
    hashed_password = pwd_context.hash(password)
    query = users.insert().values(username=username, hashed_password=hashed_password)
    await database.execute(query)


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS))
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str, expected_type: str = "access"):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != expected_type:
            raise HTTPException(status_code=401, detail="Invalid token type")
        return payload
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


class ExtraPayload(BaseModel):
    message: str
    

class UserCreate(BaseModel):
    username: str
    password: str


@app.post("/api/v1/register")
async def register(user: UserCreate):
    existing_user = await get_user(user.username)
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already taken")
    await create_user(user.username, user.password)
    return {"message": "User created successfully"}


@app.post("/api/v1/login")
async def login(user: UserCreate):  # Переиспользуем UserCreate для простоты
    db_user = await get_user(user.username)
    if not db_user or not pwd_context.verify(user.password, db_user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = create_access_token({"sub": user.username})
    refresh_token = create_refresh_token({"sub": user.username})

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }


@app.post("/refresh")
async def refresh(request: Request):
    body = await request.json()
    token = body.get("refresh_token")
    if not token:
        raise HTTPException(status_code=400, detail="Missing refresh token")

    payload = decode_token(token, expected_type="refresh")
    username = payload.get("sub")
    if not username:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    new_access_token = create_access_token({"sub": username})
    return {
        "access_token": new_access_token,
        "token_type": "bearer"
    }


@app.post(
    "/init",
    summary="Установка API ключа на сервере"
)
async def replacing_the_api_key_on_the_server(payload: ExtraPayload, token: str = Depends(oauth2_scheme)):
    global llm
    
    user = decode_token(token)
    
    try:
        api_key = payload.message
    except:
        logger.error("Клиент отправил неверный запрос.")
        return {"error": "INVALID REQUEST. (C) SLET CORP."}
        
    logger.info("Клиент запросил инициализацию LangDock...")
    logger.debug(f"API KEY: {api_key}")
    llm = mind.OrbitLLMGemini(api_key=api_key)
    logger.success("LangDock инициализирован успешно!")

    response_text = f"LANGDOCK INITIALIZED SUCCESSFULLY! (C) SLET CORP."
    
    return {"message": response_text}


@app.post(
    "/update",
    summary="Установка параметров модели на сервере"
)
async def update_data(payload: ExtraPayload, token: str = Depends(oauth2_scheme)):
    """
    Функция обновления данных AI
    """
    global model_temperature, ai_model, system_message, max_tokens_allowed, message_max_tokens
    
    user = decode_token(token)
    
    try:
        data = payload.message
    except:
        logger.error("Клиент отправил неверный шифр или запрос.")
        return {"error": "INVALID REQUEST. (C) SLET CORP."}
        
    logger.info("Клиент запросил обновление ИИ данных...")
    params = data.split("A65BB6###") # Разделяем данные на параметры в список
    
    
    print(params)
    
    # Устанавливаем параметры
    ai_model = params[0]
    system_message = params[1]
    model_temperature = float(params[2])
    max_tokens_allowed = int(params[3])
    message_max_tokens = int(params[4])
    
    if "\\n" in system_message:
        system_message = system_message.replace("\\n", "\n")
        system_message = system_message.replace("\\", "")
        
    print(system_message)
    
    logger.success("ИИ данные обновлены!")

    response_text = f"DATA UPDATED SUCCESSFULLY! (C) SLET CORP."
    
    return {"message": response_text}


@app.post(
    "/chat/create",
    summary="Создание нового чата",
    description="После создания чата на сервере возвращает его сгенерированный ID"
)
async def create_new_chat(token: str = Depends(oauth2_scheme)):
    """
    Функция создания нового чата
    """
    
    user = decode_token(token)
        
    logger.info("Клиент запросил создание нового чата")
    
    chat_random_id = str(uuid.uuid4()) # Генерируем рандомное ID для чата
    
    # Создаем новый файл который будет хранить историю чата
    async with aiofiles.open(f"{ai_utils.chat_history_folder}/{chat_random_id}", mode="w") as f:
        await f.write("[]")
    
    response_text = f"CHAT_ID={chat_random_id}"
    logger.success(f"Создан новый чат: {response_text}")
    
    return {"message": response_text}


@app.post("/answer/serverprocessing")
async def get_an_ai_response_processed_by_the_server(payload: Dict[str, Any], token: str = Depends(oauth2_scheme)):
    
    user = decode_token(token)
    
    print(payload)
    chat_id = None
    try:
        chat_id = payload.get("chatId")
    except:
        logger.warning("Клиент сделал запрос без chat_id.")
    
    chat_history: list | None = []
    # Если используется chat_id получаем историю чата
    if chat_id:
        chat_history = await ai_utils.get_chat_history(chat_id)
        if not chat_history:
            chat_history = []
    
    try:
        final_response = payload.get("message")
    except:
        logger.error("Клиент отправил неверный шифр или запрос.")
        return {"error": "INVALID REQUEST. (C) SLET CORP."}
    
    if not llm:
        logger.error("LangDock не инициализирован.")
        return {"error": "AI NOT INITIALIZED. (C) SLET CORP."}
    
    logger.info(f"Клиент запросил вопрос AI: {final_response}")
    
    for _ in range(5): # Максимум 5 кругов через ИИ
        # Проверяем что запрос существует
        if not isinstance(final_response, str):
            logger.error("Клиент отправил пустой запрос.")
            return {"error": "REQUEST IS NOT A STRING. (C) SLET CORP."}
        
        if not final_response.strip():
            logger.error("Клиент отправил пустой запрос.")
            return {"error": "EMPTY REQUEST. (C) SLET CORP."}

        # Временно добавим сообщение для оценки, не внося в историю
        chat_history_temp = chat_history + [{"role": "user", "content": final_response}]

        # Обрезаем историю, если лимит превышен
        while (
            count_tokens(chat_history_temp, system_message) > max_tokens_allowed
        ):
            if len(chat_history_temp) >= 2:
                del chat_history_temp[0:2]
            else:
                break

        # Обновим историю после очистки
        chat_history = chat_history_temp
        
        # Запрос к AI
        response = await llm.create(
            model=ai_model,
            messages=chat_history,
            system=system_message,
            temperature=model_temperature,
            max_tokens=message_max_tokens
        )

        # Добавляем user и assistant в историю
        #chat_history.append({"role": "user", "content": final_response})
        chat_history.append({"role": "assistant", "content": response})

        logger.success(f"Ответ ИИ: {response}")
        
        if not isinstance(response, str):
            logger.error("Ответ ИИ не является строкой.")
            return {"error": "AI RESPONSE IS NOT A STRING. (C) SLET CORP."}
        
        response = response.strip()
        response_command_type = response.startswith("get")
        
        try:
            if response_command_type: # Если ИИ отправил get команду
                final_response = f"[automatic_system]\n{execute_script(response, command_type='get')}"
                continue # Переходим на следующую итерацию чтобы передать в ИИ final_response
            else:
                final_response = execute_script(response, command_type="get")
                break # Если это не get команда то останавливаем цикл и отправляем ответ ИИ
                
        except Exception as e:
            if response_command_type: # Если ИИ отправил get команду
                final_response = f"[automatic_system]\nОшибка при выполнении команды: {response}. Описание ошибки: {e}" # Отправляем ИИ сообщение об ошибке
                continue # Переходим на следующую итерацию чтобы передать в ИИ final_response
                
            else: # Если ИИ отправил обычное сообщение
                logger.error("Ошибка при выполнении команды.")
                return {"error": "ERROR EXECUTING COMMAND. (C) SLET CORP."}
        
    if not isinstance(final_response, str):
        logger.error("Результат выполнения не является строкой.")
        return {"error": "FINAL RESPONSE IS NOT A STRING. (C) SLET CORP."}
    
    if not final_response.strip():
        logger.error("Результат выполнения пустой.")
        return {"error": "FINAL RESPONSE IS EMPTY. (C) SLET CORP."}
    
    print(final_response)
    
    # Если все нормально шифруем ответ и возвращаем его
    encrypted_response = {"message": final_response}
    
    if chat_id: # Если используется созданный чат обновляем историю чата
        logger.info(f"Обновляем историю чата {chat_id}...")
        await ai_utils.update_chat_history(chat_history, chat_id)
        
    return encrypted_response


@app.post("/answer/answer")
async def get_an_ai_response_without_processing(payload: Dict[str, Any], token: str = Depends(oauth2_scheme)):
    
    user = decode_token(token)
    
    chat_id = None
    try:
        chat_id = payload.get("chatId") # Извлекаем chat_id из запроса
    except KeyError:
        logger.warning("Клиент сделал запрос без chat_id.")
        
    chat_history: list | None = []
    # Если используется chat_id получаем историю чата
    if chat_id:
        chat_history = await ai_utils.get_chat_history(chat_id)
        if not chat_history:
            chat_history = []
        
    try:
        user_message = payload.get("message")
    except:
        logger.error("Клиент отправил неверный шифр или запрос.")
        return {"error": "INVALID REQUEST. (C) SLET CORP."}
    
    if not llm:
        logger.error("LangDock не инициализирован.")
        return {"error": "AI NOT INITIALIZED. (C) SLET CORP."}
    
    logger.info(f"Клиент запросил вопрос AI: {user_message}")

    # Проверяем что запрос существует
    if not isinstance(user_message, str):
        logger.error("Клиент отправил пустой запрос.")
        return {"error": "REQUEST IS NOT A STRING. (C) SLET CORP."}
    
    if not user_message.strip():
        logger.error("Клиент отправил пустой запрос.")
        return {"error": "EMPTY REQUEST. (C) SLET CORP."}

    # Временно добавим сообщение для оценки, не внося в историю
    chat_history_temp = chat_history + [{"role": "user", "content": user_message}]

    # Обрезаем историю, если лимит превышен
    while (
        count_tokens(chat_history_temp, system_message) > max_tokens_allowed
    ):
        if len(chat_history_temp) >= 2:
            del chat_history_temp[0:2]
        else:
            break

    # Обновим историю после очистки
    chat_history = chat_history_temp
    
    # Запрос к AI
    response = await llm.create(
        model=ai_model,
        messages=chat_history,
        system=system_message,
        temperature=model_temperature,
        max_tokens=message_max_tokens
    )

    # Добавляем assistant в историю
    chat_history.append({"role": "assistant", "content": response})

    logger.success(f"Ответ ИИ: {response}")
    
    if not isinstance(response, str):
        logger.error("Ответ ИИ не является строкой.")
        return {"error": "AI RESPONSE IS NOT A STRING. (C) SLET CORP."}
    
    response = response.strip()
    
    # Если все нормально шифруем ответ и возвращаем его
    encrypted_response = {"message": response}
    
    if chat_id: # Если используется созданный чат обновляем историю чата
        logger.info(f"Обновляем историю чата {chat_id}...")
        await ai_utils.update_chat_history(chat_history, chat_id)
        
    return encrypted_response


@app.post("/answer/create") # create запросы не сохраняют историю, и получают всю информацию о AI за раз
async def get_an_ai_response_without_processing_with_create(payload: Dict[str, Any], token: str = Depends(oauth2_scheme)):
    
    user = decode_token(token)
    
    # Обязательные параметры для Create
    try:
        user_message = payload.get("message")
        user_system_message = payload.get("systemMessage")
        user_ai_model = payload.get("aiModel")
        user_ai_temperature = float(payload.get("aiTemperature"))
    except:
        logger.error("Клиент отправил не все обязательные данные для Create запроса.")
        return {"error": "INVALID REQUEST. (C) SLET CORP."}
    
    if not llm:
        logger.error("LangDock не инициализирован.")
        return {"error": "AI NOT INITIALIZED. (C) SLET CORP."}
    
    logger.info(f"Клиент запросил вопрос AI: {user_message}")

    # Проверяем что запрос существует
    if not isinstance(user_message, str) or not isinstance(user_system_message, str) or not isinstance(user_ai_model, str):
        logger.error("Клиент отправил пустой запрос.")
        return {"error": "REQUEST IS NOT A STRING. (C) SLET CORP."}
    
    if not user_message.strip() or not user_system_message.strip() or not user_ai_model.strip():
        logger.error("Клиент отправил пустой запрос.")
        return {"error": "EMPTY REQUEST. (C) SLET CORP."}

    chat_history = [{"role": "user", "content": user_message}]
    
    # Обрезаем историю, если лимит превышен
    if count_tokens(chat_history, user_system_message) > max_tokens_allowed:
        logger.error("Клиент отправил слишком большой запрос.")
        return {"error": "REQUEST IS TOO LONG. (C) SLET CORP."}
    
    
    # Запрос к AI
    response = await llm.create(
        model=ai_model,
        messages=chat_history,
        system=system_message,
        temperature=user_ai_temperature,
        max_tokens=message_max_tokens
    )

    logger.success(f"Ответ ИИ: {response}")
    
    if not isinstance(response, str):
        logger.error("Ответ ИИ не является строкой.")
        return {"error": "AI RESPONSE IS NOT A STRING. (C) SLET CORP."}
    
    response = response.strip()
    
    # Если все нормально шифруем ответ и возвращаем его
    encrypted_response = {"message": response}
        
    return encrypted_response


@app.get("/chat/history/{chat_id}") # Получение истории чата по его ID
async def get_chat_history_via_the_chat_id(chat_id: str, token: str = Depends(oauth2_scheme)):
    user = decode_token(token)
    
    if not chat_id:
        logger.error("Клиент отправил пустой chat_id.")
        return {"error": "EMPTY CHAT_ID. (C) SLET CORP."}
    
    try:
        chat_history = str(await ai_utils.get_chat_history(chat_id))
    except Exception as e:
        logger.error(f"Ошибка при получении истории чата: {e}")
        return {"error": "ERROR GETTING CHAT HISTORY. (C) SLET CORP."}
    
    # Шифруем историю чата и отправляем
    encrypted_response = {"message": chat_history}
    
    return encrypted_response


@app.delete(
    "/chat/delete/{chat_id}",
    summary="Удаление истории чата по его ID"
) # Получение истории чата по его ID
async def delete_chat_history(chat_id: str, token: str = Depends(oauth2_scheme)):
    user = decode_token(token)
    
    if not chat_id:
        logger.error("Клиент отправил пустой chat_id.")
        return {"error": "EMPTY CHAT_ID. (C) SLET CORP."}
    
    try:
        # Путь к папке
        folder_path = Path(ai_utils.chat_history_folder)

        # Полный путь к файлу
        file_path = folder_path / chat_id

        # Проверяем и удаляем
        if file_path.exists():
            file_path.unlink()
            logger.success(f"Чат {chat_id} успешно удалён.")
            
            return Response(status_code=204)
        
        else:
            logger.error(f"Чат {chat_id} не найден для удаления.")
            return {"error": "CHAT NOT FOUND. (C) SLET CORP."}

    except Exception as e:
        logger.error(f"Ошибка при получении истории чата: {e}")
        return {"error": "ERROR DELETING CHAT HISTORY. (C) SLET CORP."}


@app.get("/test")
async def protected_test_route(token: str = Depends(oauth2_scheme)):
    user = decode_token(token)
    return {"message": f"Hello, {user['sub']}! This is protected data."}


if __name__ == "__main__":
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8050
    )
    
# Запуск для связки с Nginx: python -m uvicorn main:app --host 0.0.0.0 --port 8050 --reload