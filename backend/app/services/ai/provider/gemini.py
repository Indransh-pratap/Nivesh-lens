import json
import logging
import time
from typing import Any, Type, TypeVar
import httpx
from pydantic import BaseModel, ValidationError

from app.core.config import settings
from app.services.ai.provider.base import (
    LLMError,
    LLMProvider,
    LLMRateLimitError,
    LLMTimeoutError,
    LLMValidationError,
)
from app.services.ai.security import PROMPT_INJECTION_SYSTEM_GUARD, sanitize_log_message

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)

GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models"


class GeminiProvider(LLMProvider):
    """
    Production-grade Google Gemini provider implementation.
    Interacts with Gemini REST API directly using httpx with timeouts, retries,
    structured output validation, rate limit handling, and privacy-preserving logging.
    """

    def __init__(
        self,
        api_key: str | None = None,
        model_fast: str | None = None,
        model_pro: str | None = None,
        timeout: float | None = None,
        max_retries: int | None = None,
    ):
        self.api_key = api_key or settings.gemini_api_key
        self.model_fast = model_fast or settings.gemini_model_fast
        self.model_pro = model_pro or settings.gemini_model_pro
        self.timeout = timeout or settings.gemini_timeout_seconds
        self.max_retries = max_retries if max_retries is not None else settings.gemini_max_retries

    def _resolve_model(self, tier: str) -> str:
        return self.model_pro if tier == "pro" else self.model_fast

    def _build_payload(
        self,
        prompt: str,
        system_instruction: str | None = None,
        temperature: float = 0.2,
        json_mode: bool = False,
        schema: Type[BaseModel] | None = None,
    ) -> dict[str, Any]:
        combined_system = PROMPT_INJECTION_SYSTEM_GUARD
        if system_instruction:
            combined_system = f"{combined_system}\n\nDOMAIN INSTRUCTION:\n{system_instruction}"

        if json_mode and schema:
            combined_system += (
                f"\n\nYou MUST respond strictly with a valid JSON object conforming to this schema:\n"
                f"{json.dumps(schema.model_json_schema())}\n"
                "Do NOT enclose JSON in markdown backticks or commentary. Return raw JSON only."
            )

        payload: dict[str, Any] = {
            "system_instruction": {
                "parts": [{"text": combined_system}]
            },
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": prompt}],
                }
            ],
            "generationConfig": {
                "temperature": temperature,
            },
        }

        if json_mode:
            payload["generationConfig"]["response_mime_type"] = "application/json"

        return payload

    def _extract_text_response(self, response_data: dict[str, Any]) -> str:
        candidates = response_data.get("candidates", [])
        if not candidates:
            raise LLMError("Gemini returned no candidates in response", code="EMPTY_RESPONSE")
        parts = candidates[0].get("content", {}).get("parts", [])
        if not parts:
            raise LLMError("Gemini candidate content has no text parts", code="EMPTY_PARTS")
        return parts[0].get("text", "")

    def _log_observability(
        self,
        model: str,
        latency_ms: float,
        status_code: int,
        usage: dict[str, Any] | None = None,
    ) -> None:
        token_info = ""
        if usage:
            prompt_tokens = usage.get("promptTokenCount", 0)
            cand_tokens = usage.get("candidatesTokenCount", 0)
            token_info = f" | prompt_tokens={prompt_tokens} completion_tokens={cand_tokens}"
        log_entry = (
            f"[AI Observability] model={model} latency={latency_ms:.1f}ms status={status_code}{token_info}"
        )
        logger.info(sanitize_log_message(log_entry))

    def generate_text(
        self,
        prompt: str,
        system_instruction: str | None = None,
        temperature: float = 0.2,
        model_tier: str = "fast",
    ) -> str:
        model = self._resolve_model(model_tier)
        url = f"{GEMINI_API_BASE}/{model}:generateContent"
        payload = self._build_payload(prompt, system_instruction, temperature, json_mode=False)

        headers = {
            "Content-Type": "application/json",
            "x-goog-api-key": self.api_key,
        }

        retries = 0
        while retries <= self.max_retries:
            start_time = time.perf_counter()
            try:
                with httpx.Client(timeout=self.timeout) as client:
                    resp = client.post(url, json=payload, headers=headers)
                    latency = (time.perf_counter() - start_time) * 1000

                    if resp.status_code == 200:
                        data = resp.json()
                        self._log_observability(model, latency, resp.status_code, data.get("usageMetadata"))
                        return self._extract_text_response(data)

                    if resp.status_code == 429:
                        if retries < self.max_retries:
                            time.sleep(2 ** retries)
                            retries += 1
                            continue
                        raise LLMRateLimitError()

                    if resp.status_code >= 500 and retries < self.max_retries:
                        time.sleep(2 ** retries)
                        retries += 1
                        continue

                    raise LLMError(
                        f"Gemini API returned HTTP {resp.status_code}: {resp.text}",
                        code=f"HTTP_{resp.status_code}",
                        status_code=resp.status_code,
                    )

            except httpx.TimeoutException as exc:
                if retries < self.max_retries:
                    retries += 1
                    time.sleep(1)
                    continue
                raise LLMTimeoutError() from exc
            except (LLMError, LLMRateLimitError, LLMTimeoutError):
                raise
            except Exception as exc:
                raise LLMError(f"Unexpected error communicating with Gemini: {str(exc)}") from exc

        raise LLMError("Exceeded max retries calling Gemini API")

    async def generate_text_async(
        self,
        prompt: str,
        system_instruction: str | None = None,
        temperature: float = 0.2,
        model_tier: str = "fast",
    ) -> str:
        import asyncio
        model = self._resolve_model(model_tier)
        url = f"{GEMINI_API_BASE}/{model}:generateContent"
        payload = self._build_payload(prompt, system_instruction, temperature, json_mode=False)

        headers = {
            "Content-Type": "application/json",
            "x-goog-api-key": self.api_key,
        }

        retries = 0
        while retries <= self.max_retries:
            start_time = time.perf_counter()
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    resp = await client.post(url, json=payload, headers=headers)
                    latency = (time.perf_counter() - start_time) * 1000

                    if resp.status_code == 200:
                        data = resp.json()
                        self._log_observability(model, latency, resp.status_code, data.get("usageMetadata"))
                        return self._extract_text_response(data)

                    if resp.status_code == 429:
                        if retries < self.max_retries:
                            await asyncio.sleep(2 ** retries)
                            retries += 1
                            continue
                        raise LLMRateLimitError()

                    if resp.status_code >= 500 and retries < self.max_retries:
                        await asyncio.sleep(2 ** retries)
                        retries += 1
                        continue

                    raise LLMError(
                        f"Gemini API returned HTTP {resp.status_code}: {resp.text}",
                        code=f"HTTP_{resp.status_code}",
                        status_code=resp.status_code,
                    )

            except httpx.TimeoutException as exc:
                if retries < self.max_retries:
                    retries += 1
                    await asyncio.sleep(1)
                    continue
                raise LLMTimeoutError() from exc
            except (LLMError, LLMRateLimitError, LLMTimeoutError):
                raise
            except Exception as exc:
                raise LLMError(f"Unexpected error communicating with Gemini: {str(exc)}") from exc

        raise LLMError("Exceeded max retries calling Gemini API")

    def generate_structured(
        self,
        prompt: str,
        schema: Type[T],
        system_instruction: str | None = None,
        temperature: float = 0.1,
        model_tier: str = "fast",
    ) -> T:
        model = self._resolve_model(model_tier)
        url = f"{GEMINI_API_BASE}/{model}:generateContent"
        payload = self._build_payload(prompt, system_instruction, temperature, json_mode=True, schema=schema)

        headers = {
            "Content-Type": "application/json",
            "x-goog-api-key": self.api_key,
        }

        retries = 0
        while retries <= self.max_retries:
            start_time = time.perf_counter()
            try:
                with httpx.Client(timeout=self.timeout) as client:
                    resp = client.post(url, json=payload, headers=headers)
                    latency = (time.perf_counter() - start_time) * 1000

                    if resp.status_code == 200:
                        data = resp.json()
                        self._log_observability(model, latency, resp.status_code, data.get("usageMetadata"))
                        raw_text = self._extract_text_response(data).strip()
                        # Strip markdown if model returned it despite instructions
                        if raw_text.startswith("```json"):
                            raw_text = raw_text[7:]
                        if raw_text.startswith("```"):
                            raw_text = raw_text[3:]
                        if raw_text.endswith("```"):
                            raw_text = raw_text[:-3]
                        raw_text = raw_text.strip()

                        try:
                            return schema.model_validate_json(raw_text)
                        except ValidationError as val_err:
                            logger.warning(f"Schema validation error on Gemini output: {val_err}")
                            if retries < self.max_retries:
                                retries += 1
                                continue
                            raise LLMValidationError(f"Gemini output failed schema validation: {str(val_err)}") from val_err

                    if resp.status_code == 429:
                        if retries < self.max_retries:
                            time.sleep(2 ** retries)
                            retries += 1
                            continue
                        raise LLMRateLimitError()

                    if resp.status_code >= 500 and retries < self.max_retries:
                        time.sleep(2 ** retries)
                        retries += 1
                        continue

                    raise LLMError(f"Gemini API returned HTTP {resp.status_code}: {resp.text}", status_code=resp.status_code)

            except httpx.TimeoutException as exc:
                if retries < self.max_retries:
                    retries += 1
                    time.sleep(1)
                    continue
                raise LLMTimeoutError() from exc
            except (LLMError, LLMRateLimitError, LLMTimeoutError, LLMValidationError):
                raise
            except Exception as exc:
                raise LLMError(f"Unexpected error communicating with Gemini: {str(exc)}") from exc

        raise LLMError("Exceeded max retries calling Gemini API")

    async def generate_structured_async(
        self,
        prompt: str,
        schema: Type[T],
        system_instruction: str | None = None,
        temperature: float = 0.1,
        model_tier: str = "fast",
    ) -> T:
        import asyncio
        model = self._resolve_model(model_tier)
        url = f"{GEMINI_API_BASE}/{model}:generateContent"
        payload = self._build_payload(prompt, system_instruction, temperature, json_mode=True, schema=schema)

        headers = {
            "Content-Type": "application/json",
            "x-goog-api-key": self.api_key,
        }

        retries = 0
        while retries <= self.max_retries:
            start_time = time.perf_counter()
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    resp = await client.post(url, json=payload, headers=headers)
                    latency = (time.perf_counter() - start_time) * 1000

                    if resp.status_code == 200:
                        data = resp.json()
                        self._log_observability(model, latency, resp.status_code, data.get("usageMetadata"))
                        raw_text = self._extract_text_response(data).strip()
                        if raw_text.startswith("```json"):
                            raw_text = raw_text[7:]
                        if raw_text.startswith("```"):
                            raw_text = raw_text[3:]
                        if raw_text.endswith("```"):
                            raw_text = raw_text[:-3]
                        raw_text = raw_text.strip()

                        try:
                            return schema.model_validate_json(raw_text)
                        except ValidationError as val_err:
                            logger.warning(f"Schema validation error on Gemini output: {val_err}")
                            if retries < self.max_retries:
                                retries += 1
                                continue
                            raise LLMValidationError(f"Gemini output failed schema validation: {str(val_err)}") from val_err

                    if resp.status_code == 429:
                        if retries < self.max_retries:
                            await asyncio.sleep(2 ** retries)
                            retries += 1
                            continue
                        raise LLMRateLimitError()

                    if resp.status_code >= 500 and retries < self.max_retries:
                        await asyncio.sleep(2 ** retries)
                        retries += 1
                        continue

                    raise LLMError(f"Gemini API returned HTTP {resp.status_code}: {resp.text}", status_code=resp.status_code)

            except httpx.TimeoutException as exc:
                if retries < self.max_retries:
                    retries += 1
                    await asyncio.sleep(1)
                    continue
                raise LLMTimeoutError() from exc
            except (LLMError, LLMRateLimitError, LLMTimeoutError, LLMValidationError):
                raise
            except Exception as exc:
                raise LLMError(f"Unexpected error communicating with Gemini: {str(exc)}") from exc

        raise LLMError("Exceeded max retries calling Gemini API")
