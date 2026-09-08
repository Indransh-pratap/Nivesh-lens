from abc import ABC, abstractmethod
from typing import Any, Type, TypeVar
from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)


class LLMError(Exception):
    """Base exception for all LLM provider operations."""
    def __init__(self, message: str, code: str = "LLM_ERROR", status_code: int = 500):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code


class LLMTimeoutError(LLMError):
    """Raised when LLM request times out."""
    def __init__(self, message: str = "LLM provider request timed out"):
        super().__init__(message, code="LLM_TIMEOUT", status_code=504)


class LLMRateLimitError(LLMError):
    """Raised when rate limit is encountered."""
    def __init__(self, message: str = "LLM rate limit reached. Please try again shortly."):
        super().__init__(message, code="LLM_RATE_LIMIT", status_code=429)


class LLMValidationError(LLMError):
    """Raised when LLM output cannot be parsed into the expected schema."""
    def __init__(self, message: str = "LLM output failed schema validation"):
        super().__init__(message, code="LLM_VALIDATION_FAILED", status_code=502)


class LLMProvider(ABC):
    """Abstract interface for LLM operations to keep business logic provider-agnostic."""

    @abstractmethod
    def generate_text(
        self,
        prompt: str,
        system_instruction: str | None = None,
        temperature: float = 0.2,
        model_tier: str = "fast",
    ) -> str:
        """Generate unstructured text from a prompt."""
        pass

    @abstractmethod
    async def generate_text_async(
        self,
        prompt: str,
        system_instruction: str | None = None,
        temperature: float = 0.2,
        model_tier: str = "fast",
    ) -> str:
        """Generate unstructured text from a prompt asynchronously."""
        pass

    @abstractmethod
    def generate_structured(
        self,
        prompt: str,
        schema: Type[T],
        system_instruction: str | None = None,
        temperature: float = 0.1,
        model_tier: str = "fast",
    ) -> T:
        """Generate and parse structured data adhering to a Pydantic schema."""
        pass

    @abstractmethod
    async def generate_structured_async(
        self,
        prompt: str,
        schema: Type[T],
        system_instruction: str | None = None,
        temperature: float = 0.1,
        model_tier: str = "fast",
    ) -> T:
        """Generate and parse structured data adhering to a Pydantic schema asynchronously."""
        pass
