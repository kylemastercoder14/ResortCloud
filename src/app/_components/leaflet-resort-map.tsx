"use client";

import { useEffect, useRef } from "react";

export type ResortMapPoint = {
  title: string;
  price: string;
  lat: number;
  lng: number;
};

type LeafletMapInstance = {
  fitBounds: (bounds: unknown, options?: unknown) => void;
  invalidateSize: () => void;
  remove: () => void;
  setView: (center: [number, number], zoom: number) => void;
};

export function LeafletResortMap({ points }: { points: ResortMapPoint[] }) {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let map: LeafletMapInstance | undefined;
    let cancelled = false;
    let resizeObserver: ResizeObserver | undefined;

    async function mountMap() {
      const L = await import("leaflet");
      if (cancelled || !mapRef.current) return;

      map = L.map(mapRef.current, {
        attributionControl: true,
        scrollWheelZoom: false,
        zoomControl: true,
      }) as LeafletMapInstance;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      const bounds = L.latLngBounds(points.map((point) => [point.lat, point.lng]));

      points.forEach((point) => {
        L.marker([point.lat, point.lng], {
          icon: L.divIcon({
            className: "resort-price-marker",
            html: `<span class="resort-price-marker__label">${point.price.replace("₱", "₱")}</span>`,
            iconAnchor: [35, 34],
            iconSize: [70, 34],
          }),
          title: point.title,
        }).addTo(map);
      });

      if (points.length > 1) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 11 });
      } else if (points[0]) {
        map.setView([points[0].lat, points[0].lng], 12);
      } else {
        map.setView([14.3, 120.9], 10);
      }

      const refreshMapSize = () => map?.invalidateSize();
      requestAnimationFrame(refreshMapSize);
      window.setTimeout(refreshMapSize, 100);
      window.setTimeout(refreshMapSize, 300);

      resizeObserver = new ResizeObserver(refreshMapSize);
      resizeObserver.observe(mapRef.current);
    }

    mountMap();

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      map?.remove();
    };
  }, [points]);

  return <div ref={mapRef} className="absolute inset-0 h-full w-full" />;
}
