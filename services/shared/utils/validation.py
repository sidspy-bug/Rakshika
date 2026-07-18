"""Reusable validation helpers."""

from __future__ import annotations

import re

EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
PHONE_PATTERN = re.compile(r"^\+?[0-9\-\s()]{7,20}$")


def is_email(value: str) -> bool:
    """Return whether a string looks like an email address."""

    return bool(EMAIL_PATTERN.fullmatch(value.strip()))


def is_phone_number(value: str) -> bool:
    """Return whether a string looks like a phone number."""

    return bool(PHONE_PATTERN.fullmatch(value.strip()))


def password_policy_violations(password: str) -> list[str]:
    """Return password policy violations for the supplied password."""

    violations: list[str] = []
    if len(password) < 8:
        violations.append("Password must be at least 8 characters long.")
    if not any(character.islower() for character in password):
        violations.append("Password must include a lowercase letter.")
    if not any(character.isupper() for character in password):
        violations.append("Password must include an uppercase letter.")
    if not any(character.isdigit() for character in password):
        violations.append("Password must include a digit.")
    if not any(not character.isalnum() for character in password):
        violations.append("Password must include a special character.")
    return violations
