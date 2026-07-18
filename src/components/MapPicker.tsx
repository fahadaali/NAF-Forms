"use client";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// إصلاح أيقونة العلامة الافتراضية في Leaflet مع الحزم
const icon = L.icon({
  iconUrl:
    "data:image/svg+xml;base64," +
    btoa(
      `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42"><path fill="#1c59f5" stroke="#fff" stroke-width="2" d="M16 1C8 1 2 7 2 15c0 10 14 26 14 26s14-16 14-26C30 7 24 1 16 1z"/><circle cx="16" cy="15" r="5" fill="#fff"/></svg>`
    ),
  iconSize: [32, 42],
  iconAnchor: [16, 42],
});

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function MapPicker({
  value,
  defaultCenter,
  zoom = 5,
  onChange,
}: {
  value?: { lat: number; lng: number } | null;
  defaultCenter: { lat: number; lng: number };
  zoom?: number;
  onChange: (v: { lat: number; lng: number }) => void;
}) {
  const center = value ?? defaultCenter;
  return (
    <div className="overflow-hidden rounded-xl border border-slate-300">
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={value ? 13 : zoom}
        style={{ height: 320, width: "100%" }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onPick={(lat, lng) => onChange({ lat, lng })} />
        {value && <Marker position={[value.lat, value.lng]} icon={icon} />}
      </MapContainer>
      <div className="bg-slate-50 px-3 py-2 text-xs text-slate-500">
        {value
          ? `الإحداثيات: ${value.lat.toFixed(5)} , ${value.lng.toFixed(5)}`
          : "انقر على الخريطة لتحديد الموقع"}
      </div>
    </div>
  );
}
