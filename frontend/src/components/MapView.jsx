/**
 * MapView — Google Maps wrapper component.
 * Loads the Google Maps API and renders a map with markers.
 * Full implementation in Phase 10.
 *
 * Props:
 *   center: { lat, lng } (optional, defaults to US center)
 *   zoom: number (optional, defaults to 5)
 *   markers: Array<{ lat, lng, label, color, onClick }> (optional)
 *   height: string (optional, defaults to "500px")
 */

import React, { useEffect, useRef } from "react";

const DEFAULT_CENTER = { lat: 37.0902, lng: -95.7129 }; // Geographic center of US
const DEFAULT_ZOOM = 5;

export default function MapView({
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  markers = [],
  height = "500px",
}) {
  const mapRef = useRef(null);
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    // Full Google Maps integration coming in Phase 10
    // Placeholder: show map container with a message
  }, [center, zoom, markers, apiKey]);

  if (!apiKey || apiKey === "replace-me") {
    return (
      <div className="map-placeholder" style={{ height }}>
        <div className="map-placeholder-content">
          <span className="map-placeholder-icon">🗺️</span>
          <p>Google Maps integration — Phase 10</p>
          <p className="map-placeholder-hint">
            Add your <code>VITE_GOOGLE_MAPS_API_KEY</code> to <code>.env</code> to enable the map.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mapRef}
      className="map-container"
      style={{ height }}
      id="google-map"
    />
  );
}
