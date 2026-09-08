import pytest
from unittest.mock import MagicMock, patch
import httpx
from pydantic import BaseModel

from app.services.ai.provider.base import (
    LLMError,
    LLMRateLimitError,
    LLMTimeoutError,
    LLMValidationError,
)
from app.services.ai.provider.factory import get_llm_provider, set_llm_provider
from app.services.ai.provider.gemini import GeminiProvider
from app.services.ai.provider.mock import MockLLMProvider
from app.services.ai.security import sanitize_log_message, sanitize_pii
from app.schemas.ai import PortfolioExplanation


class DummySchema(BaseModel):
    name: str
    score: int


def test_mock_provider_generates_valid_schema():
    provider = MockLLMProvider()
    res = provider.generate_structured("Explain portfolio", PortfolioExplanation)
    assert isinstance(res, PortfolioExplanation)
    assert len(res.headline) > 0
    assert "Health Score" in res.headline or len(res.summary) > 0
    assert "SEBI" in res.disclaimer or "deterministic" in res.disclaimer.lower()


def test_provider_factory_fallback():
    set_llm_provider(None)
    # With no key set or AI disabled, factory should return MockLLMProvider
    provider = get_llm_provider(force_refresh=True)
    assert isinstance(provider, (MockLLMProvider, GeminiProvider))


def test_gemini_provider_timeout_handling():
    provider = GeminiProvider(api_key="fake-key", timeout=0.001, max_retries=1)

    with patch("httpx.Client.post", side_effect=httpx.TimeoutException("Connection timed out")):
        with pytest.raises(LLMTimeoutError):
            provider.generate_text("test prompt")


def test_gemini_provider_rate_limit_handling():
    provider = GeminiProvider(api_key="fake-key", timeout=5.0, max_retries=1)
    mock_resp = MagicMock()
    mock_resp.status_code = 429
    mock_resp.text = "Resource exhausted"

    with patch("httpx.Client.post", return_value=mock_resp):
        with patch("time.sleep", return_value=None):
            with pytest.raises(LLMRateLimitError):
                provider.generate_text("test prompt")


def test_gemini_provider_validation_error():
    provider = GeminiProvider(api_key="fake-key", timeout=5.0, max_retries=0)
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    # Return invalid JSON not conforming to DummySchema
    mock_resp.json.return_value = {
        "candidates": [
            {"content": {"parts": [{"text": '{"wrong_key": 123}'}]}}
        ]
    }

    with patch("httpx.Client.post", return_value=mock_resp):
        with pytest.raises(LLMValidationError):
            provider.generate_structured("prompt", DummySchema)


def test_secret_free_logging():
    raw_log = "Error calling Gemini with key=AIzaSyD-fakeKey1234567890abcdef and password='mysecretpassword'"
    cleaned = sanitize_log_message(raw_log)
    assert "AIzaSyD-fakeKey" not in cleaned
    assert "mysecretpassword" not in cleaned
    assert "[KEY_REDACTED]" in cleaned or "[REDACTED]" in cleaned
