import logging
from app.core.config import settings
from app.services.ai.provider.base import LLMProvider
from app.services.ai.provider.gemini import GeminiProvider
from app.services.ai.provider.mock import MockLLMProvider

logger = logging.getLogger(__name__)

_provider_instance: LLMProvider | None = None


def get_llm_provider(force_refresh: bool = False) -> LLMProvider:
    """
    Dependency / factory provider for LLM operations.
    Returns GeminiProvider when GEMINI_API_KEY is configured and AI_ENABLED is True;
    otherwise gracefully falls back to MockLLMProvider.
    """
    global _provider_instance
    from app.core.config import get_settings
    current_settings = get_settings()

    should_use_gemini = (
        not current_settings.mock_ai
        and current_settings.ai_enabled
        and bool(current_settings.gemini_api_key and current_settings.gemini_api_key.strip())
    )

    if _provider_instance is not None and not force_refresh:
        is_gemini = isinstance(_provider_instance, GeminiProvider)
        if (should_use_gemini and is_gemini) or (not should_use_gemini and isinstance(_provider_instance, MockLLMProvider)):
            return _provider_instance

    if should_use_gemini:
        logger.info("Initializing active Google Gemini LLM Provider")
        _provider_instance = GeminiProvider(
            api_key=current_settings.gemini_api_key,
            model_fast=current_settings.gemini_model_fast,
            model_pro=current_settings.gemini_model_pro,
            timeout=current_settings.gemini_timeout_seconds,
            max_retries=current_settings.gemini_max_retries,
        )
    else:
        logger.info("Initializing Mock/Deterministic LLM Provider (MOCK_AI=True or AI_ENABLED=False or key unset)")
        _provider_instance = MockLLMProvider()

    return _provider_instance


def set_llm_provider(provider: LLMProvider | None) -> None:
    """Allow test fixtures to inject custom or mock providers cleanly."""
    global _provider_instance
    _provider_instance = provider
