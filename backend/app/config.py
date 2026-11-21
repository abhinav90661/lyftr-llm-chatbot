import os
from typing import List, Tuple
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    LLM_API_KEYS: str = "mock-key-1,mock-key-2"
    LLM_MODEL: str = "gemini/gemini-3.8-flash"
    DATABASE_URL: str = "sqlite:///./data/app.db"
    ALLOWED_ORIGINS: str = "*"
    ENABLE_FAILURE_SIMULATION: bool = True
    DEFAULT_SYSTEM_PROMPT: str = "You are a helpful, concise AI assistant."

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    def get_key_pool(self) -> List[Tuple[str, str]]:
        """
        Parses comma-separated LLM_API_KEYS into [('key_1', val1), ('key_2', val2), ...]
        """
        raw_keys = [k.strip() for k in self.LLM_API_KEYS.split(",") if k.strip()]
        if not raw_keys:
            raw_keys = ["mock-key-1", "mock-key-2"]
        return [(f"key_{i+1}", key) for i, key in enumerate(raw_keys)]

    def get_db_path(self) -> str:
        """
        Extracts file path from DATABASE_URL. e.g. sqlite:////data/app.db or sqlite:///./data/app.db
        """
        url = self.DATABASE_URL
        if url.startswith("sqlite:///"):
            path = url.replace("sqlite:///", "", 1)
        elif url.startswith("sqlite://"):
            path = url.replace("sqlite://", "", 1)
        else:
            path = url
        os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
        return path

settings = Settings()
