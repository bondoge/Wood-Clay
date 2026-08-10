"use client";

import { useEffect, useRef, useState } from "react";

export type CdekPvz = { code: string; city: string; address: string; name: string; workTime: string };

type CitySuggestion = { name: string; label: string };
type Office = { code: string; name: string; address: string; city: string; workTime: string; lon: number; lat: number };

// Hand-built picker: DaData (app/api/dadata/suggest-cities) resolves fuzzy
// city input to an exact name — СДЭК's own /location/cities only matches
// exact names — and a real Yandex map (JS API v2.1, plain <script> tag, no
// npm dependency) plots pins from coordinates СДЭК's own /deliverypoints
// already returns, so no geocoding call is ever made client-side.
//
// This isn't CDEK's official @cdek-it/widget: that package hard-requires a
// *separately paid* Yandex HTTP Geocoder license (confirmed via its bundled
// source and a live 403 "Invalid api key" against a correctly-configured
// key — Yandex split Geocoder from the JS API into its own commercial
// product in May 2026). The JS API used here for map *display* only is
// still free under standard conditions, and we never call ymaps.geocode()
// or a Suggest control, which is the part that would hit that paywall.
//
// Inline, not a modal — the city field is the first thing visible in this
// checkout step, map + list appear directly beneath it once a city
// resolves. Clicking a pin selects that point immediately, same as
// clicking its list row.

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- no official types package for the plain JS API v2.1; not worth a new dependency for this small a surface.
type YmapsApi = any;

declare global {
  interface Window {
    ymaps?: YmapsApi;
  }
}

let ymapsPromise: Promise<YmapsApi> | null = null;
function loadYmaps(apiKey: string): Promise<YmapsApi> {
  if (window.ymaps) return Promise.resolve(window.ymaps);
  if (ymapsPromise) return ymapsPromise;
  ymapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${apiKey}&lang=ru_RU`;
    script.async = true;
    script.onload = () => window.ymaps!.ready(() => resolve(window.ymaps!));
    script.onerror = () => reject(new Error("Failed to load Yandex Maps"));
    document.head.appendChild(script);
  });
  return ymapsPromise;
}

export default function CdekPvzPicker({ value, onChange }: { value: CdekPvz | null; onChange: (pvz: CdekPvz) => void }) {
  const [isEditing, setIsEditing] = useState(!value);
  const [cityQuery, setCityQuery] = useState("");
  const [suggestions, setSuggestions] = useState<CitySuggestion[] | null>(null);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [offices, setOffices] = useState<Office[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cityInputRef = useRef<HTMLInputElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<YmapsApi | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  async function loadOffices(city: string) {
    setCityQuery(city);
    setSuggestions(null);
    setOffices(null);
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/cdek/offices?city=${encodeURIComponent(city)}`);
      if (!res.ok) throw new Error();
      const data: Office[] = await res.json();
      if (data.length === 0) {
        setError("В этом городе нет пунктов выдачи СДЭК. Попробуйте другой город.");
      }
      setOffices(data);
    } catch {
      setError("Не получилось загрузить пункты выдачи. Попробуйте ещё раз.");
      setOffices([]);
    } finally {
      setLoading(false);
    }
  }

  function handleEdit() {
    setIsEditing(true);
    setError(null);
    // Reopen where the customer left off — same city, same map, current
    // pickup point still marked — rather than making them search again.
    // Only re-fetch if we somehow don't already have that city's offices
    // (e.g. the picker was handed a value it never itself looked up).
    if (!offices && value?.city) {
      loadOffices(value.city);
    }
    // "Изменить" replaces the summary card with a search field of the same
    // rough size/position — without an explicit scroll, that swap can be
    // easy to miss (autoFocus alone doesn't reliably scroll in every
    // browser), which read as the button "doing nothing".
    requestAnimationFrame(() => {
      cityInputRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
      cityInputRef.current?.focus();
    });
  }

  function handleCityInputChange(input: string) {
    setCityQuery(input);
    setSuggestions(null);
    clearTimeout(debounceRef.current);
    const query = input.trim();
    if (query.length < 2) return;
    debounceRef.current = setTimeout(async () => {
      setSuggestLoading(true);
      try {
        const res = await fetch(`/api/dadata/suggest-cities?query=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error();
        setSuggestions(await res.json());
      } catch {
        setSuggestions([]);
      } finally {
        setSuggestLoading(false);
      }
    }, 300);
  }

  function handleSelectOffice(office: Office) {
    onChange({ code: office.code, city: office.city, address: office.address, name: office.name, workTime: office.workTime });
    // Tear the map down here, synchronously, while its container is still
    // mounted — the container div only exists while isEditing is true, so
    // once we flip that below, React removes it. Leaving the map instance
    // alive and pointed at a now-detached node until some later cleanup
    // got around to destroy()-ing it was throwing inside the Yandex SDK on
    // real mobile browsers (worked fine in automated desktop testing,
    // which is why this shipped unnoticed the first time).
    mapInstanceRef.current?.destroy();
    mapInstanceRef.current = null;
    setIsEditing(false);
  }

  useEffect(() => {
    if (!isEditing || !offices || offices.length === 0) return;
    const apiKey = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY;
    if (!apiKey || !mapContainerRef.current) return;

    let cancelled = false;
    const current = offices.find((o) => o.code === value?.code) ?? offices[0];

    loadYmaps(apiKey)
      .then((ymaps) => {
        if (cancelled || !mapContainerRef.current) return;
        const map = new ymaps.Map(
          mapContainerRef.current,
          { center: [current.lat, current.lon], zoom: 11, controls: ["zoomControl"] },
          { suppressMapOpenBlock: true },
        );
        mapInstanceRef.current = map;

        offices.forEach((office) => {
          const placemark = new ymaps.Placemark(
            [office.lat, office.lon],
            { balloonContentHeader: office.name, balloonContentBody: office.address },
            { preset: office.code === value?.code ? "islands#darkGreenIcon" : "islands#greenDotIcon" },
          );
          placemark.events.add("click", () => handleSelectOffice(office));
          map.geoObjects.add(placemark);
        });

        if (offices.length > 1) {
          map.setBounds(map.geoObjects.getBounds(), { checkZoomRange: true, zoomMargin: 24 });
        }
      })
      .catch((err) => console.error("Failed to load Yandex Maps:", err));

    return () => {
      cancelled = true;
      mapInstanceRef.current?.destroy();
      mapInstanceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handleSelectOffice is stable in effect (only reads/sets state, no external deps that change its behavior per-render)
  }, [offices, isEditing, value?.code]);

  return (
    <div className="cdek-picker">
      {value && !isEditing ? (
        <div className="cdek-picker__summary">
          <div>
            <strong>{value.name || "Пункт выдачи СДЭК"}</strong>
            <span>{value.city ? `${value.city}, ` : ""}{value.address}</span>
            {value.workTime && <small>{value.workTime}</small>}
          </div>
          <button type="button" onClick={handleEdit}>Изменить</button>
        </div>
      ) : (
        <div className="cdek-picker__panel">
          {/* Not a <form> — this picker renders inside CartPageClient's
              own checkout <form>, and nested forms are invalid HTML
              (the browser silently mangles them, breaking submission). */}
          <div className="cdek-city-search">
            <input
              ref={cityInputRef}
              type="text"
              placeholder="Введите город доставки"
              value={cityQuery}
              onChange={(e) => handleCityInputChange(e.target.value)}
            />
            {suggestLoading && <p className="cdek-picker__status">Ищем город…</p>}
            {suggestions && suggestions.length > 0 && (
              <ul className="cdek-city-matches">
                {suggestions.map((city) => (
                  <li key={city.name}>
                    <button type="button" onClick={() => loadOffices(city.name)}>
                      {city.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {suggestions?.length === 0 && !suggestLoading && (
              <p className="cdek-picker__error" role="alert">Город не найден.</p>
            )}
          </div>

          {loading && <p className="cdek-picker__status">Загружаем пункты выдачи…</p>}
          {error && <p className="cdek-picker__error" role="alert">{error}</p>}

          {offices && offices.length > 0 && (
            <div className="cdek-offices-layout">
              <div className="cdek-offices-map" ref={mapContainerRef} aria-hidden="true" />
              <ul className="cdek-office-list">
                {offices.map((office) => (
                  <li key={office.code}>
                    <button
                      type="button"
                      className={office.code === value?.code ? "is-current" : undefined}
                      onClick={() => handleSelectOffice(office)}
                    >
                      <strong>{office.name}</strong>
                      <span>{office.address}</span>
                      {office.workTime && <small>{office.workTime}</small>}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
