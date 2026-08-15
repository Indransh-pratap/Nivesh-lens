"""Authentication dependency exports for API routes.

Better Auth remains the identity provider in Next.js; this backend only verifies
the signed server-to-server identity forwarded by the Next.js proxy.
"""

from app.core.security import get_current_user_id

__all__ = ["get_current_user_id"]
