"""
weather_service.py
Minimal backend weather service for JalRakshak AI using Open-Meteo Forecast API.

Provides live weather-derived precipitation and temperature metrics:
- rainfall_last_7_days_mm (sum of past 7 complete days)
- rainfall_forecast_48h_mm (sum of upcoming 48 hours)
- temperature_current_c (current 2m air temperature in Celsius)
"""

import time
from datetime import datetime, timezone
from typing import Optional, Dict, Any, Tuple, List
import httpx


OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
OPEN_METEO_GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search"
HTTP_TIMEOUT_SECONDS = 10.0
CACHE_TTL_SECONDS = 3600.0  # 60-minute in-memory TTL
GEOCODING_CACHE_TTL_SECONDS = 86400.0  # 24-hour in-memory TTL

# In-memory cache keyed by (rounded_lat, rounded_lng) -> (normalized_data, expiry_timestamp)
_WEATHER_CACHE: Dict[Tuple[float, float], Tuple[Dict[str, Any], float]] = {}

# In-memory cache keyed by normalized query -> (normalized_results_list, expiry_timestamp)
_GEOCODING_CACHE: Dict[str, Tuple[List[Dict[str, Any]], float]] = {}


class WeatherServiceError(Exception):
    """Controlled exception for weather service errors, timeouts, or invalid responses."""
    pass


def _validate_coordinates(latitude: Any, longitude: Any) -> Tuple[float, float]:
    """Validate latitude and longitude ranges (-90..90, -180..180)."""
    try:
        lat = float(latitude)
        lng = float(longitude)
    except (TypeError, ValueError):
        raise WeatherServiceError(
            f"Invalid coordinates format: latitude={latitude}, longitude={longitude}. Must be numeric."
        )

    if not (-90.0 <= lat <= 90.0 and -180.0 <= lng <= 180.0):
        raise WeatherServiceError(
            f"Coordinates out of range: lat={lat} (must be -90..90), lng={lng} (must be -180..180)."
        )

    return lat, lng


def clear_weather_cache() -> None:
    """Clear the in-memory weather cache."""
    _WEATHER_CACHE.clear()


def clear_geocoding_cache() -> None:
    """Clear the in-memory geocoding cache."""
    _GEOCODING_CACHE.clear()


def get_weather_data(
    latitude: float,
    longitude: float,
    force_refresh: bool = False
) -> Dict[str, Any]:
    """
    Fetch and normalize live weather metrics from Open-Meteo Forecast API.

    Returns:
        {
          "rainfall_last_7_days_mm": float,
          "rainfall_forecast_48h_mm": float,
          "temperature_current_c": float | None,
          "weather_source": "open-meteo",
          "weather_fetched_at": ISO UTC timestamp,
          "data_mode": "live"
        }

    Raises:
        WeatherServiceError on timeout, invalid response, or provider failure.
    """
    lat, lng = _validate_coordinates(latitude, longitude)

    # Cache key rounded to 2 decimal places (~1.1 km resolution)
    cache_key = (round(lat, 2), round(lng, 2))
    current_monotonic = time.monotonic()

    if not force_refresh and cache_key in _WEATHER_CACHE:
        cached_data, expiry = _WEATHER_CACHE[cache_key]
        if current_monotonic < expiry:
            return cached_data.copy()

    # Query Open-Meteo with 7 past days and 3 forecast days in UTC
    params = {
        "latitude": cache_key[0],
        "longitude": cache_key[1],
        "daily": "precipitation_sum",
        "hourly": "precipitation",
        "current": "temperature_2m",
        "past_days": 7,
        "forecast_days": 3,
        "timezone": "UTC"
    }

    try:
        with httpx.Client(timeout=HTTP_TIMEOUT_SECONDS) as client:
            response = client.get(OPEN_METEO_FORECAST_URL, params=params)
            response.raise_for_status()
            payload = response.json()
    except httpx.TimeoutException as exc:
        raise WeatherServiceError(
            f"Open-Meteo API request timed out after {HTTP_TIMEOUT_SECONDS}s: {str(exc)}"
        ) from exc
    except httpx.HTTPStatusError as exc:
        raise WeatherServiceError(
            f"Open-Meteo API returned HTTP {exc.response.status_code}: {exc.response.text}"
        ) from exc
    except httpx.RequestError as exc:
        raise WeatherServiceError(
            f"Open-Meteo API connection failed: {str(exc)}"
        ) from exc
    except Exception as exc:
        raise WeatherServiceError(
            f"Open-Meteo response parsing failed: {str(exc)}"
        ) from exc

    daily = payload.get("daily")
    hourly = payload.get("hourly")
    if not isinstance(daily, dict) or "time" not in daily or "precipitation_sum" not in daily:
        raise WeatherServiceError("Open-Meteo response missing required daily precipitation data.")
    if not isinstance(hourly, dict) or "time" not in hourly or "precipitation" not in hourly:
        raise WeatherServiceError("Open-Meteo response missing required hourly precipitation data.")

    now_utc = datetime.now(timezone.utc)
    today_utc_str = now_utc.strftime("%Y-%m-%d")

    # 1. Sum past 7 complete days of daily precipitation (strictly prior to today UTC)
    past_daily_precip = [
        float(precip or 0.0)
        for date_str, precip in zip(daily["time"], daily["precipitation_sum"])
        if date_str < today_utc_str
    ]
    # Take the most recent 7 complete days
    past_7_days = past_daily_precip[-7:] if len(past_daily_precip) >= 7 else past_daily_precip
    rainfall_last_7_days_mm = round(sum(past_7_days), 2)

    # 2. Sum upcoming 48 hours of hourly precipitation (starting at current UTC hour)
    current_hour_str = now_utc.replace(minute=0, second=0, microsecond=0).strftime("%Y-%m-%dT%H:00")
    upcoming_hourly_precip = [
        float(precip or 0.0)
        for time_str, precip in zip(hourly["time"], hourly["precipitation"])
        if time_str >= current_hour_str
    ][:48]
    rainfall_forecast_48h_mm = round(sum(upcoming_hourly_precip), 2)

    # 3. Current 2m air temperature in Celsius
    current_data = payload.get("current", {})
    raw_temp = current_data.get("temperature_2m") if isinstance(current_data, dict) else None
    temp_c = round(float(raw_temp), 1) if raw_temp is not None else None

    normalized_result: Dict[str, Any] = {
        "rainfall_last_7_days_mm": rainfall_last_7_days_mm,
        "rainfall_forecast_48h_mm": rainfall_forecast_48h_mm,
        "temperature_current_c": temp_c,
        "weather_source": "open-meteo",
        "weather_fetched_at": now_utc.isoformat(),
        "data_mode": "live"
    }

    # Store in cache with 60-minute TTL
    _WEATHER_CACHE[cache_key] = (normalized_result.copy(), current_monotonic + CACHE_TTL_SECONDS)

    return normalized_result


def search_locations(query: str) -> List[Dict[str, Any]]:
    """
    Search location candidates using Open-Meteo Geocoding API.
    Returns up to 5 normalized results cached for 24 hours.

    Output format:
    [
      {
        "name": "string",
        "admin1": "string | null",
        "country": "string",
        "latitude": number,
        "longitude": number,
        "timezone": "string | null",
        "display_name": "string"
      }
    ]
    """
    cleaned_query = (query or "").strip()
    normalized_key = " ".join(cleaned_query.lower().split())
    current_monotonic = time.monotonic()

    if normalized_key in _GEOCODING_CACHE:
        cached_results, expiry = _GEOCODING_CACHE[normalized_key]
        if current_monotonic < expiry:
            return [dict(item) for item in cached_results]

    params = {
        "name": cleaned_query,
        "count": 5,
        "language": "en",
        "format": "json"
    }

    try:
        with httpx.Client(timeout=HTTP_TIMEOUT_SECONDS) as client:
            response = client.get(OPEN_METEO_GEOCODING_URL, params=params)
            response.raise_for_status()
            payload = response.json()
    except httpx.TimeoutException as exc:
        raise WeatherServiceError(
            f"Geocoding request timed out after {HTTP_TIMEOUT_SECONDS}s: {str(exc)}"
        ) from exc
    except httpx.HTTPStatusError as exc:
        raise WeatherServiceError(
            f"Geocoding provider returned HTTP {exc.response.status_code}: {exc.response.text}"
        ) from exc
    except httpx.RequestError as exc:
        raise WeatherServiceError(
            f"Geocoding provider connection failed: {str(exc)}"
        ) from exc
    except Exception as exc:
        raise WeatherServiceError(
            f"Geocoding response parsing failed: {str(exc)}"
        ) from exc

    raw_results = payload.get("results") or []
    normalized_results: List[Dict[str, Any]] = []

    for item in raw_results[:5]:
        name = str(item.get("name", "")).strip()
        admin1 = str(item["admin1"]).strip() if item.get("admin1") else None
        country = str(item.get("country", "")).strip()
        lat = float(item["latitude"])
        lng = float(item["longitude"])
        tz = str(item["timezone"]).strip() if item.get("timezone") else None

        # Build display_name from returned fields without inventing missing location parts
        parts = []
        if name:
            parts.append(name)
        if admin1 and (not parts or parts[-1].lower() != admin1.lower()):
            parts.append(admin1)
        if country and (not parts or parts[-1].lower() != country.lower()):
            parts.append(country)
        display_name = ", ".join(parts)

        normalized_results.append({
            "name": name,
            "admin1": admin1,
            "country": country,
            "latitude": lat,
            "longitude": lng,
            "timezone": tz,
            "display_name": display_name
        })

    # Cache by normalized query for 24 hours in memory
    _GEOCODING_CACHE[normalized_key] = (normalized_results, current_monotonic + GEOCODING_CACHE_TTL_SECONDS)

    return [dict(item) for item in normalized_results]


if __name__ == "__main__":
    sample_lat = 23.24
    sample_lng = 69.66
    print(f"Fetching weather for lat={sample_lat}, lng={sample_lng}...")
    try:
        data = get_weather_data(sample_lat, sample_lng)
        print("Success! Normalized response:")
        import json
        print(json.dumps(data, indent=2))
    except WeatherServiceError as err:
        print(f"WeatherServiceError: {err}")

    print("\nSearching location 'Anjar'...")
    try:
        locs = search_locations("Anjar")
        import json
        print("Success! Geocoding results:")
        print(json.dumps({"results": locs}, indent=2))
    except WeatherServiceError as err:
        print(f"Geocoding error: {err}")
