import httpx

BASE_URL = "https://alellliltle.hopto.org"

class AEliteClient:
    def __init__(self, base_url=BASE_URL):
        self.base_url = base_url
        self.client = httpx.AsyncClient(base_url=base_url, timeout=httpx.Timeout(500.0))
        self.access_token = None
        self.refresh_token = None

    async def register(self, username: str, password: str):
        response = await self.client.post("/api/v1/register", json={
            "username": username,
            "password": password
        })
        return response.json()

    async def login(self, username: str, password: str):
        response = await self.client.post("/api/v1/login", json={
            "username": username,
            "password": password
        })
        data = response.json()
        self.access_token = data.get("access_token")
        self.refresh_token = data.get("refresh_token")
        return data

    async def refresh_access_token(self):
        response = await self.client.post("/refresh", json={
            "refresh_token": self.refresh_token
        })
        data = response.json()
        self.access_token = data.get("access_token")
        return data

    def _auth_headers(self):
        if not self.access_token:
            raise ValueError("Access token is missing. Login first.")
        return {"Authorization": f"Bearer {self.access_token}"}

    async def init_llm(self, api_key: str):
        response = await self.client.post("/init", json={
            "message": api_key
        }, headers=self._auth_headers())
        return response.json()

    async def update_model_settings(self, ai_model, system_prompt, temperature, max_tokens_allowed, message_max_tokens):
        payload = "A65BB6###".join([
            ai_model,
            system_prompt.replace("\n", "\\n"),
            str(temperature),
            str(max_tokens_allowed),
            str(message_max_tokens)
        ])
        response = await self.client.post("/update", json={
            "message": payload
        }, headers=self._auth_headers())
        return response.json()

    async def create_chat(self):
        response = await self.client.post("/chat/create", headers=self._auth_headers())
        return response.json()

    async def answer(self, message: str, chat_id: str | None = None, use_processing: bool = True):
        route = "/answer/serverprocessing" if use_processing else "/answer/answer"
        payload = {"message": message}
        if chat_id:
            payload["chatId"] = chat_id
        response = await self.client.post(route, json=payload, headers=self._auth_headers())
        return response.json()
    
    async def create(self, message: str, system_message: str, ai_model: str, ai_temperature: float):
        route = "/answer/create"
        payload = {"message": message}
        payload["systemMessage"] = system_message
        payload["aiModel"] = ai_model
        payload["aiTemperature"] = str(ai_temperature)
        response = await self.client.post(route, json=payload, headers=self._auth_headers())
        return response.json()

    async def get_chat_history(self, chat_id: str):
        response = await self.client.get(f"/chat/history/{chat_id}", headers=self._auth_headers())
        return response.json()

    async def delete_chat(self, chat_id: str):
        response = await self.client.delete(f"/chat/delete/{chat_id}", headers=self._auth_headers())
        return response.status_code == 204

    async def close(self):
        await self.client.aclose()