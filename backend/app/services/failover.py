from typing import Dict, Optional

def parse_simulate_failure_header(header_value: Optional[str]) -> Dict[str, int]:
    """
    Parses the X-Simulate-Failure header into a mapping of key_id -> status_code.
    Example formats:
      'key_1=429' -> {'key_1': 429}
      'key_1=429,key_2=500' -> {'key_1': 429, 'key_2': 500}
      '*=429' -> {'*': 429}
    Allowed statuses: 429, 500, 502, 503.
    """
    if not header_value:
        return {}

    result: Dict[str, int] = {}
    tokens = [t.strip() for t in header_value.split(",") if t.strip()]
    allowed_statuses = {429, 500, 502, 503}

    for token in tokens:
        if "=" in token:
            key_id, status_str = token.split("=", 1)
            key_id = key_id.strip()
            status_str = status_str.strip()
            try:
                status_code = int(status_str)
                if status_code in allowed_statuses:
                    result[key_id] = status_code
            except ValueError:
                continue

    return result
