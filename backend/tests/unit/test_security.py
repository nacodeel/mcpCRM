from app.core.security import create_access_token, decode_access_token, hash_password, verify_password


def test_password_hashing_roundtrip() -> None:
    hashed = hash_password("very-secret-password")
    assert verify_password("very-secret-password", hashed)
    assert not verify_password("wrong", hashed)


def test_jwt_roundtrip() -> None:
    token = create_access_token(subject=123)
    payload = decode_access_token(token)
    assert payload["sub"] == "123"
