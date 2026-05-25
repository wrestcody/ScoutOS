from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable, Optional


@dataclass
class RegistrySecret:
    name: str
    description: str = ""
    env_var: str = ""
    optional: bool = False


class _Registry:
    def register(self, **_kwargs: Any) -> Callable[[Callable[..., Any]], Callable[..., Any]]:
        def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
            return func
        return decorator


registry = _Registry()

