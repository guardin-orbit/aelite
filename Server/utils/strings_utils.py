"""
Утилиты для строк и т. д.
"""

from vertexai.preview import tokenization

# Инициализация токенизатора для модели Gemini
model_name = "gemini-1.5-flash-001"  # или другая версия
tokenizer = tokenization.get_tokenizer_for_model(model_name)


def count_tokens_claude(messages: list[dict], system: str = "") -> int:
    return len(system) + sum(len(msg["role"]) + len(msg["content"]) for msg in messages)


# Gemini
def count_tokens(messages: list[dict], system: str = "") -> int:
    total_tokens = 0

    # Считаем токены в system-промпте, если он есть
    if system:
        total_tokens += tokenizer.count_tokens(system).total_tokens

    # Считаем токены во всех сообщениях
    for msg in messages:
        role_tokens = tokenizer.count_tokens(msg["role"]).total_tokens
        content_tokens = tokenizer.count_tokens(msg["content"]).total_tokens
        total_tokens += role_tokens + content_tokens

    return total_tokens