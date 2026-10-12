import httpx
from app.core.config import settings

class SetuClient:
    def __init__(self): self.base_url=settings.setu_aa_base_url.rstrip("/"); self.token_url=settings.setu_token_url
    def _configured(self):
        if not all((settings.setu_client_id, settings.setu_client_secret, settings.setu_product_instance_id)): raise RuntimeError("Setu Account Aggregator is not configured. Configure its client credentials and product instance ID.")
    async def get_access_token(self):
        self._configured()
        async with httpx.AsyncClient(timeout=20.0) as c: r=await c.post(self.token_url,json={"clientID":settings.setu_client_id,"secret":settings.setu_client_secret})
        if r.is_error: raise RuntimeError("Setu authentication failed")
        token=(r.json().get("data") or {}).get("token")
        if not token: raise RuntimeError("Setu did not return an access token")
        return token
    async def _request(self, method, path, payload=None, params=None):
        token=await self.get_access_token(); headers={"Authorization":f"Bearer {token}","x-product-instance-id":settings.setu_product_instance_id}
        async with httpx.AsyncClient(timeout=20.0) as c: r=await c.request(method,f"{self.base_url}{path}",json=payload,params=params,headers=headers)
        if r.is_error: raise RuntimeError(f"Setu request failed ({r.status_code})")
        return r.json()
    async def create_consent(self,payload): return await self._request("POST","/v2/consents",payload)
    async def get_consent(self,consent_id): return await self._request("GET",f"/v2/consents/{consent_id}",params={"expanded":"true"})
    async def create_data_session(self,consent_id,data_from,data_to): return await self._request("POST","/v2/sessions",{"consentId":consent_id,"dataRange":{"from":data_from,"to":data_to},"format":"json"})
    async def get_data_session(self,session_id): return await self._request("GET",f"/v2/sessions/{session_id}")
