"""Geocoding service — Phase 7/10."""


def geocode_address(address: str, city: str, state: str, zip_code: str):
    """
    Convert an address to lat/lng coordinates using Google Maps Geocoding API.
    Returns (latitude, longitude) tuple or (None, None) if geocoding fails.
    Phase 7.
    """
    raise NotImplementedError("Geocoding service coming in Phase 7.")


def reverse_geocode(lat: float, lng: float):
    """Convert coordinates to a human-readable address. Phase 10."""
    raise NotImplementedError("Geocoding service coming in Phase 10.")


def get_timezone_from_coordinates(lat: float, lng: float):
    """Return a timezone string for given coordinates. Phase 7."""
    raise NotImplementedError("Timezone lookup coming in Phase 7.")
