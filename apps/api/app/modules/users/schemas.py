from pydantic import BaseModel, ConfigDict, Field, field_validator


class RegisterRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: str = Field(min_length=5, max_length=255)
    password: str = Field(min_length=8, max_length=128)
    display_name: str = Field(min_length=1, max_length=255)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        if "@" not in normalized:
            raise ValueError("email must be valid")
        return normalized


class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: str = Field(min_length=5, max_length=255)
    password: str = Field(min_length=1, max_length=128)
