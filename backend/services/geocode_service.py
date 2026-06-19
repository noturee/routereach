"""Geocoding service helpers."""

from geopy.geocoders import Nominatim
from geopy.exc import GeocoderServiceError


_geocoder = Nominatim(user_agent="routereach-geocoder", timeout=5)


def geocode_address(address: str, city: str, state: str, zip_code: str):
    """
    Convert an address to lat/lng coordinates.
    Returns (latitude, longitude) tuple or (None, None) if geocoding fails.
    """
    parts = [address, city, state, zip_code]
    query = ", ".join([p for p in parts if p])
    if not query:
        return (None, None)
    try:
        result = _geocoder.geocode(query)
        if not result:
            return (None, None)
        return (result.latitude, result.longitude)
    except GeocoderServiceError:
        return (None, None)


def reverse_geocode(lat: float, lng: float):
    """Convert coordinates to a human-readable address."""
    if lat is None or lng is None:
        return None
    try:
        result = _geocoder.reverse((lat, lng), exactly_one=True)
        return result.address if result else None
    except GeocoderServiceError:
        return None


def get_timezone_from_coordinates(lat: float, lng: float):
    """Return a timezone string for given coordinates."""
    if lat is None or lng is None:
        return None
    return "UTC"
