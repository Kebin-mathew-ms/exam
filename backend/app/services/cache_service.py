import redis
from app.config.settings import settings
from app.utils.logger import logger

class CacheService:
    """Redis cache manager wrapper with simple dict local memory fallback for local tests."""

    def __init__(self):
        self.redis_url = settings.REDIS_URL
        self.client = None
        self.use_redis = False
        self.local_cache = {}

        try:
            # Initialize Redis connection pool
            self.client = redis.Redis.from_url(
                self.redis_url,
                decode_responses=True,
                socket_timeout=2.0
            )
            # Ping test
            self.client.ping()
            self.use_redis = True
            logger.info("Connected to Redis server successfully.")
        except Exception as e:
            logger.warning(f"Could not connect to Redis: {e}. Falling back to in-memory dictionary cache.")
            self.use_redis = False

    def get(self, key: str) -> str:
        """Retrieve key value from Cache."""
        if self.use_redis:
            try:
                return self.client.get(key)
            except Exception as e:
                logger.error(f"Redis get error: {e}")
                return self.local_cache.get(key)
        return self.local_cache.get(key)

    def set(self, key: str, value: str, expire_seconds: int = None) -> bool:
        """Store key value in Cache with expiry timer."""
        if self.use_redis:
            try:
                self.client.set(key, value, ex=expire_seconds)
                return True
            except Exception as e:
                logger.error(f"Redis set error: {e}")
                self.local_cache[key] = value
                return True
        self.local_cache[key] = value
        return True

    def delete(self, key: str) -> bool:
        """Remove key from Cache."""
        if self.use_redis:
            try:
                self.client.delete(key)
                return True
            except Exception as e:
                logger.error(f"Redis delete error: {e}")
                self.local_cache.pop(key, None)
                return True
        self.local_cache.pop(key, None)
        return True

    def blacklist_token(self, jti: str, expire_seconds: int) -> bool:
        """Add JWT ID to blacklisted block logs."""
        return self.set(f"blacklist:{jti}", "1", expire_seconds=expire_seconds)

    def is_token_blacklisted(self, jti: str) -> bool:
        """Check if JWT ID exists in blacklisted items."""
        return self.get(f"blacklist:{jti}") is not None

# Global cache client instance
cache_service = CacheService()
