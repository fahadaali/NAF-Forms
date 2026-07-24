"use client";
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Icon } from "@/components/ui/Icon";

// إصلاح أيقونة العلامة الافتراضية في Leaflet مع الحزم
const icon = L.icon({
  iconUrl:
    "data:image/svg+xml;base64," +
    btoa(
      `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42"><path fill="#44528a" stroke="#fff" stroke-width="2" d="M16 1C8 1 2 7 2 15c0 10 14 26 14 26s14-16 14-26C30 7 24 1 16 1z"/><circle cx="16" cy="15" r="5" fill="#fff"/></svg>`
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

// يعيد توسيط الخريطة عند تغيّر القيمة (إدخال يدوي أو تحديد الموقع الحالي)
function Recenter({ value }: { value: { lat: number; lng: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (value) map.setView([value.lat, value.lng], Math.max(map.getZoom(), 13));
  }, [value?.lat, value?.lng]); // eslint-disable-line react-hooks/exhaustive-deps
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
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoError, setGeoError] = useState("");
  // مسودّات نصية لحقلي الإحداثيات (حتى يتمكن المستخدم من الكتابة بحرية)
  const [latText, setLatText] = useState(value ? String(value.lat) : "");
  const [lngText, setLngText] = useState(value ? String(value.lng) : "");

  useEffect(() => {
    if (value) {
      setLatText(String(value.lat));
      setLngText(String(value.lng));
    }
  }, [value?.lat, value?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  function applyManual(latRaw: string, lngRaw: string) {
    const lat = Number(latRaw);
    const lng = Number(lngRaw);
    if (
      latRaw.trim() === "" ||
      lngRaw.trim() === "" ||
      Number.isNaN(lat) ||
      Number.isNaN(lng)
    )
      return;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setGeoError("إحداثيات خارج النطاق الصحيح");
      return;
    }
    setGeoError("");
    onChange({ lat, lng });
  }

  function useMyLocation() {
    setGeoError("");
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoError("المتصفح لا يدعم تحديد الموقع");
      return;
    }
    setGeoBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoBusy(false);
        onChange({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => {
        setGeoBusy(false);
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? "تم رفض إذن تحديد الموقع"
            : "تعذّر الحصول على موقعك الحالي"
        );
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={useMyLocation}
        disabled={geoBusy}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium hover:border-naf-400 hover:bg-naf-50 disabled:opacity-60"
      >
        <Icon name="map-pin" className="h-4 w-4" />
        {geoBusy ? "جارٍ تحديد موقعك…" : "استخدم موقعي الحالي"}
      </button>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">خط العرض (Lat)</label>
          <input
            dir="ltr"
            inputMode="decimal"
            className="input py-1.5 text-right"
            placeholder="24.7136"
            value={latText}
            onChange={(e) => setLatText(e.target.value)}
            onBlur={() => applyManual(latText, lngText)}
          />
        </div>
        <div>
          <label className="label">خط الطول (Lng)</label>
          <input
            dir="ltr"
            inputMode="decimal"
            className="input py-1.5 text-right"
            placeholder="46.6753"
            value={lngText}
            onChange={(e) => setLngText(e.target.value)}
            onBlur={() => applyManual(latText, lngText)}
          />
        </div>
      </div>
      {geoError && <p className="text-sm text-red-600">{geoError}</p>}

      <div className="overflow-hidden rounded-xl border border-slate-300">
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={value ? 13 : zoom}
          style={{ height: 300, width: "100%" }}
          scrollWheelZoom
        >
          <TileLayer
            attribution="&copy; OpenStreetMap"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onPick={(lat, lng) => onChange({ lat, lng })} />
          <Recenter value={value ?? null} />
          {value && <Marker position={[value.lat, value.lng]} icon={icon} />}
        </MapContainer>
        <div className="bg-slate-50 px-3 py-2 text-xs text-slate-500">
          {value
            ? `الإحداثيات: ${value.lat.toFixed(5)} , ${value.lng.toFixed(5)}`
            : "انقر على الخريطة، أو أدخل الإحداثيات، أو استخدم موقعك الحالي"}
        </div>
      </div>
    </div>
  );
}
