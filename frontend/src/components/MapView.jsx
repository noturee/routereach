/**
 * MapView — Google Maps wrapper component.
 * Loads Google Maps JS API once, renders map, and updates markers.
 *
 * Props:
 *   center: { lat, lng } (optional, defaults to US center)
 *   zoom: number (optional, defaults to 5)
 *   markers: Array<{ lat, lng, label, color, onClick }> (optional)
 *   height: string (optional, defaults to "500px")
 */

import React, { useEffect, useRef, useState } from "react";
import apiClient from "../api/apiClient.js";

const DEFAULT_CENTER = { lat: 37.0902, lng: -95.7129 }; // Geographic center of US
const DEFAULT_ZOOM = 5;
const GOOGLE_MAPS_SCRIPT_ID = "google-maps-js";

let mapsScriptPromise = null;

function loadGoogleMaps(apiKey) {
  if (window.google?.maps) {
    return Promise.resolve(window.google.maps);
  }

  if (mapsScriptPromise) {
    return mapsScriptPromise;
  }

  mapsScriptPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById(GOOGLE_MAPS_SCRIPT_ID);
    if (existing) {
      existing.addEventListener("load", () => resolve(window.google?.maps));
      existing.addEventListener("error", () => reject(new Error("Failed to load Google Maps script.")));
      return;
    }

    const script = document.createElement("script");
    script.id = GOOGLE_MAPS_SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google?.maps);
    script.onerror = () => {
      mapsScriptPromise = null;
      reject(new Error("Failed to load Google Maps JavaScript API."));
    };
    document.head.appendChild(script);
  });

  return mapsScriptPromise;
}

export default function MapView({
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  markers = [],
  height = "500px",
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRefs = useRef([]);
  const envApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const [apiKey, setApiKey] = useState(envApiKey || "");
  const [configLoading, setConfigLoading] = useState(!envApiKey);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (envApiKey && envApiKey !== "replace-me") {
      setApiKey(envApiKey);
      setConfigLoading(false);
      return;
    }

    let cancelled = false;
    setConfigLoading(true);

    apiClient.get("/public-config")
      .then((res) => {
        if (!cancelled) {
          setApiKey(res.data.google_maps_api_key || "");
          setLoadError("");
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadError(
            error.response?.data?.error ||
            error.message ||
            "Unable to load map configuration."
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setConfigLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [envApiKey]);

  useEffect(() => {
    if (!apiKey || apiKey === "replace-me") {
      return;
    }

    let cancelled = false;

    loadGoogleMaps(apiKey)
      .then((maps) => {
        if (cancelled || !maps || !mapRef.current) {
          return;
        }

        if (!mapInstanceRef.current) {
          mapInstanceRef.current = new maps.Map(mapRef.current, {
            center,
            zoom,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
          });
        } else {
          mapInstanceRef.current.setCenter(center);
          mapInstanceRef.current.setZoom(zoom);
        }

        markerRefs.current.forEach((marker) => marker.setMap(null));
        markerRefs.current = [];

        markers.forEach((markerData) => {
          if (
            typeof markerData?.lat !== "number" ||
            typeof markerData?.lng !== "number"
          ) {
            return;
          }

          const markerConfig = {
            position: { lat: markerData.lat, lng: markerData.lng },
            map: mapInstanceRef.current,
            title: markerData.label || "",
          };

          if (markerData.color) {
            markerConfig.icon = {
              path: maps.SymbolPath.CIRCLE,
              fillColor: markerData.color,
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 2,
              scale: 8,
            };
          }

          const marker = new maps.Marker(markerConfig);

          if (typeof markerData.onClick === "function") {
            marker.addListener("click", () => markerData.onClick(markerData));
          }

          markerRefs.current.push(marker);
        });

        setLoadError("");
      })
      .catch((error) => {
        setLoadError(error.message || "Unable to load Google Maps.");
      });

    return () => {
      cancelled = true;
    };
  }, [apiKey, center, zoom, markers]);

  useEffect(() => {
    return () => {
      markerRefs.current.forEach((marker) => marker.setMap(null));
      markerRefs.current = [];
      mapInstanceRef.current = null;
    };
  }, []);

  if (configLoading) {
    return (
      <div className="map-placeholder" style={{ height }}>
        <div className="map-placeholder-content">
          <span className="map-placeholder-icon">🗺️</span>
          <p>Loading map configuration...</p>
        </div>
      </div>
    );
  }

  if (!apiKey || apiKey === "replace-me") {
    return (
      <div className="map-placeholder" style={{ height }}>
        <div className="map-placeholder-content">
          <span className="map-placeholder-icon">🗺️</span>
          <p>Google Maps is not configured.</p>
          <p className="map-placeholder-hint">
            Add your <code>GOOGLE_MAPS_API_KEY</code> to backend runtime config or set <code>VITE_GOOGLE_MAPS_API_KEY</code> during frontend build.
          </p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="map-placeholder" style={{ height }}>
        <div className="map-placeholder-content">
          <span className="map-placeholder-icon">⚠️</span>
          <p>Unable to load Google Maps.</p>
          <p className="map-placeholder-hint">{loadError}</p>
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
