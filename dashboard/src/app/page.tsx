"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

// ─── Chicago iconic landmarks ──────────────────────────
// Camera looks UP at the building: center is offset south so the
// building midsection fills the viewport and the top grazes the page top.
// High pitch (78-82°) = nearly ground-level perspective looking up.
const LANDMARKS = [
  { name: "Willis Tower",           lng: -87.63585, lat: 41.87840, bearing: -20,  zoom: 16.4, pitch: 72 },
  { name: "Tribune Tower",          lng: -87.62350, lat: 41.88990, bearing: -35,  zoom: 16.5, pitch: 70 },
  { name: "Marina City",            lng: -87.63165, lat: 41.88840, bearing: 15,   zoom: 16.6, pitch: 68 },
  { name: "Aqua Tower",             lng: -87.61705, lat: 41.88615, bearing: -45,  zoom: 16.5, pitch: 72 },
  { name: "John Hancock Center",    lng: -87.62290, lat: 41.89850, bearing: 25,   zoom: 16.3, pitch: 70 },
  { name: "Merchandise Mart",       lng: -87.63540, lat: 41.88840, bearing: -60,  zoom: 16.2, pitch: 65 },
  { name: "Chase Tower",            lng: -87.63200, lat: 41.88120, bearing: 10,   zoom: 16.5, pitch: 72 },
  { name: "Aon Center",             lng: -87.62160, lat: 41.88500, bearing: -30,  zoom: 16.3, pitch: 70 },
];

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

// ─── Chicago weather → Mapbox light preset + particle FX ──
type WeatherFX = { preset: string; weather: string; temp: number; wind: number; icon: string };
const CHICAGO_COORDS = { lat: 41.8781, lon: -87.6298 };

async function getChicagoWeather(): Promise<WeatherFX> {
  // Determine time-of-day for Mapbox light preset
  const now = new Date();
  const chiHour = parseInt(
    now.toLocaleString("en-US", { timeZone: "America/Chicago", hour: "2-digit", hour12: false })
  );
  let preset: string;
  if (chiHour >= 5 && chiHour < 7) preset = "dawn";
  else if (chiHour >= 7 && chiHour < 17) preset = "day";
  else if (chiHour >= 17 && chiHour < 20) preset = "dusk";
  else preset = "night";

  try {
    // Open-Meteo: free, no API key, real-time Chicago weather
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${CHICAGO_COORDS.lat}&longitude=${CHICAGO_COORDS.lon}&current=temperature_2m,weather_code,wind_speed_10m&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America/Chicago`
    );
    const data = await res.json();
    const code = data.current?.weather_code ?? 0;
    const temp = Math.round(data.current?.temperature_2m ?? 50);
    const wind = Math.round(data.current?.wind_speed_10m ?? 5);

    // WMO weather codes → weather type
    let weather = "clear";
    let icon = "clear";
    if ([71, 73, 75, 77, 85, 86].includes(code)) { weather = "snow"; icon = "snow"; }
    else if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) { weather = "rain"; icon = "rain"; }
    else if ([95, 96, 99].includes(code)) { weather = "thunder"; icon = "thunder"; }
    else if ([1, 2, 3].includes(code)) { weather = "cloudy"; icon = "cloudy"; }
    else if ([45, 48].includes(code)) { weather = "fog"; icon = "fog"; }

    return { preset, weather, temp, wind, icon };
  } catch {
    return { preset, weather: "clear", temp: 50, wind: 10, icon: "clear" };
  }
}

// ─── Canvas weather particle overlay ────────────────────
function WeatherParticles({ weather, wind }: { weather: string; wind: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || weather === "clear" || weather === "cloudy" || weather === "fog") return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);

    const isSnow = weather === "snow";
    const isThunder = weather === "thunder";
    const count = isSnow ? 200 : 300;
    const particles: { x: number; y: number; speed: number; size: number; opacity: number }[] = [];

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        speed: isSnow ? 0.5 + Math.random() * 1.5 : 4 + Math.random() * 8,
        size: isSnow ? 1.5 + Math.random() * 2.5 : 0.8 + Math.random() * 1.2,
        opacity: 0.2 + Math.random() * 0.5,
      });
    }

    let flashTimer = 0;
    let flashOpacity = 0;
    let frame: number;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Thunder flash
      if (isThunder && Math.random() < 0.003) {
        flashOpacity = 0.3 + Math.random() * 0.3;
        flashTimer = 4;
      }
      if (flashTimer > 0) {
        ctx.fillStyle = `rgba(200, 220, 255, ${flashOpacity})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        flashTimer--;
        flashOpacity *= 0.7;
      }

      const windOffset = wind * 0.15;

      for (const p of particles) {
        if (isSnow) {
          // Snow: white dots drifting
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
          ctx.fill();
          p.y += p.speed;
          p.x += Math.sin(p.y * 0.01) * 0.5 + windOffset * 0.3;
        } else {
          // Rain: angled streaks
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + windOffset, p.y + p.speed * 2.5);
          ctx.strokeStyle = `rgba(180, 200, 230, ${p.opacity * 0.6})`;
          ctx.lineWidth = p.size * 0.6;
          ctx.stroke();
          p.y += p.speed;
          p.x += windOffset;
        }

        // Wrap
        if (p.y > canvas.height) { p.y = -10; p.x = Math.random() * canvas.width; }
        if (p.x > canvas.width) p.x = 0;
        if (p.x < 0) p.x = canvas.width;
      }

      frame = requestAnimationFrame(draw);
    };
    draw();

    return () => { cancelAnimationFrame(frame); window.removeEventListener("resize", resize); };
  }, [weather, wind]);

  if (weather === "clear" || weather === "cloudy") return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-30 pointer-events-none"
      style={{ mixBlendMode: weather === "fog" ? "screen" : "normal" }}
    />
  );
}

// ─── Weather badge ──────────────────────────────────────
function WeatherBadge({ fx, dark }: { fx: WeatherFX | null; dark?: boolean }) {
  if (!fx) return null;
  const icons: Record<string, string> = {
    clear: "\u2600", cloudy: "\u2601", rain: "\u{1F327}", snow: "\u2744", thunder: "\u26A1", fog: "\u{1F32B}",
  };
  const t = dark ? "text-white" : "text-black";
  return (
    <div className="flex items-center gap-2 text-[10px] tracking-[0.15em] uppercase font-light animate-fade-in">
      <span className="text-xs">{icons[fx.icon] ?? ""}</span>
      <span className={`${t}/30`}>{fx.temp}°F</span>
      <span className={`${t}/15`}>|</span>
      <span className={`${t}/25`}>{fx.weather}</span>
      <span className={`${t}/15`}>|</span>
      <span className={`${t}/20`}>{fx.wind} mph</span>
    </div>
  );
}

// ─── useScrollReveal ────────────────────────────────────
function useScrollReveal(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useScrollReveal(0.08);
  return (
    <div
      ref={ref}
      className={`transition-all duration-[900ms] ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

// ─── 3D Map ─────────────────────────────────────────────
function ChicagoMap({ weatherFX }: { weatherFX: WeatherFX | null }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const animationRef = useRef<number>(0);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [landmarkName, setLandmarkName] = useState("");

  useEffect(() => {
    if (!mapContainer.current || map.current) return;
    const landmark = LANDMARKS[Math.floor(Math.random() * LANDMARKS.length)];
    setLandmarkName(landmark.name);
    mapboxgl.accessToken = MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/standard",
      center: [landmark.lng, landmark.lat],
      zoom: landmark.zoom,
      pitch: landmark.pitch,
      bearing: landmark.bearing,
      antialias: true,
      interactive: false,
      attributionControl: false,
    });

    const m = map.current;
    m.on("style.load", () => {
      // ── Standard style: real-time Chicago light + 3D landmarks ──
      const lightPreset = weatherFX?.preset ?? getChicagoTimePreset();
      const configs: [string, string, unknown][] = [
        // Light preset from real Chicago time of day
        ["basemap", "lightPreset", lightPreset],
        // 3D textured landmark models
        ["basemap", "show3dObjects", true],
        // Hide labels for cinematic view
        ["basemap", "showPlaceLabels", false],
        ["basemap", "showPointOfInterestLabels", false],
        ["basemap", "showTransitLabels", false],
        ["basemap", "showRoadLabels", false],
        // Color theme: cool tone for deep blue water
        ["basemap", "theme", "default"],
      ];
      for (const [importId, key, value] of configs) {
        try { m.setConfigProperty(importId, key, value); } catch { /* skip */ }
      }

      // ── Water + land colors adapt to time of day ──
      const isNightPreset = lightPreset === "night" || lightPreset === "dusk";
      const waterColor = isNightPreset ? "hsl(215, 80%, 18%)" : "hsl(210, 65%, 45%)";
      const landColor = isNightPreset ? "hsl(220, 15%, 12%)" : "hsl(40, 10%, 88%)";
      const colorOverrides: [string, string, string][] = [
        ["basemap", "waterColor", waterColor],
        ["basemap", "landColor", landColor],
      ];
      for (const [importId, key, value] of colorOverrides) {
        try { m.setConfigProperty(importId, key, value); } catch { /* not all configs supported */ }
      }

      // Atmospheric fog — adapts to time of day and weather
      const isNight = lightPreset === "night" || lightPreset === "dusk";
      const isFoggy = weatherFX?.weather === "fog";
      const isStormy = weatherFX?.weather === "rain" || weatherFX?.weather === "thunder";
      try {
        m.setFog({
          color: isNight ? "rgb(18, 22, 38)" : isFoggy ? "rgb(180, 185, 195)" : isStormy ? "rgb(60, 65, 75)" : "rgb(220, 225, 235)",
          "high-color": isNight ? "rgb(60, 80, 140)" : isFoggy ? "rgb(200, 205, 215)" : isStormy ? "rgb(100, 110, 130)" : "rgb(160, 180, 220)",
          "horizon-blend": isFoggy ? 0.25 : isStormy ? 0.15 : 0.08,
          "star-intensity": isNight ? 0.3 : 0,
          "space-color": isNight ? "rgb(10, 14, 28)" : isStormy ? "rgb(40, 45, 55)" : "rgb(180, 200, 230)",
        });
      } catch { /* ignore */ }

      setMapLoaded(true);

      // Slow cinematic rotation
      let b = landmark.bearing;
      const rotate = () => {
        b += 0.004;
        m.rotateTo(b % 360, { duration: 0 });
        animationRef.current = requestAnimationFrame(rotate);
      };
      rotate();
    });

    // Cinematic scroll: pull back from street-level to aerial
    const handleScroll = () => {
      const p = Math.min(window.scrollY / (window.innerHeight * 2), 1);
      m.jumpTo({
        center: [landmark.lng, landmark.lat],
        zoom: landmark.zoom - p * 4,
        pitch: Math.max(landmark.pitch - p * 50, 20),
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => { window.removeEventListener("scroll", handleScroll); cancelAnimationFrame(animationRef.current); map.current?.remove(); map.current = null; };
  }, []);

  const isNightTime = weatherFX?.preset === "night" || weatherFX?.preset === "dusk";

  return (
    <>
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" />
      {/* Weather particle overlay (rain, snow, thunder) */}
      {weatherFX && <WeatherParticles weather={weatherFX.weather} wind={weatherFX.wind} />}
      {/* Gradient overlay — adapts to time of day */}
      <div className={`absolute inset-0 pointer-events-none ${isNightTime ? "bg-gradient-to-b from-[#0c1020]/40 via-transparent to-[#f5f5f0]" : "bg-gradient-to-b from-transparent via-transparent to-[#f5f5f0]"}`} />
      {mapLoaded && (
        <div className="absolute bottom-6 left-6 z-40 flex flex-col gap-1.5 animate-fade-in">
          <span className="text-[10px] tracking-[0.4em] uppercase font-medium" style={{ color: isNightTime ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.25)" }}>
            {landmarkName}
          </span>
          <WeatherBadge fx={weatherFX} dark={isNightTime} />
        </div>
      )}
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#f5f5f0]">
          <span className="text-[11px] text-black/20 tracking-[0.3em] uppercase">Loading</span>
        </div>
      )}
    </>
  );
}

// ─── Bold Serif Logo (like the reference image) ─────────
function BrandLogo({ dark }: { dark?: boolean }) {
  const c = dark ? "#fff" : "#191818";
  return (
    <Link href="/" className="flex items-center gap-1 cursor-pointer group">
      {/* Giant forward slash — slightly raised */}
      <span
        className="text-[clamp(36px,4vw,48px)] font-extralight leading-none -mt-2 group-hover:opacity-60 transition-opacity"
        style={{ color: "#F97316" }}
      >
        /
      </span>
      <div className="flex flex-col leading-[1.08]">
        <span className="text-[clamp(14px,1.6vw,17px)] font-black tracking-[-0.03em] group-hover:opacity-80 transition-opacity" style={{ color: c }}>Chicago</span>
        <span className="text-[clamp(14px,1.6vw,17px)] font-black tracking-[-0.03em] group-hover:opacity-80 transition-opacity" style={{ color: c }}>Intelligence</span>
        <span className="text-[clamp(14px,1.6vw,17px)] font-black tracking-[-0.03em] group-hover:opacity-80 transition-opacity" style={{ color: c }}>Company</span>
      </div>
    </Link>
  );
}

// ─── Raccoon Easter Egg ─────────────────────────────────
function RaccoonEasterEgg() {
  const [clicks, setClicks] = useState(0);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (clicks >= 7) { setShow(true); setTimeout(() => { setShow(false); setClicks(0); }, 4000); }
  }, [clicks]);

  return (
    <>
      {/* Hidden click target in footer copyright */}
      <span onClick={() => setClicks(c => c + 1)} className="cursor-default select-none">&copy;</span>
      {show && (
        <div className="fixed bottom-6 right-6 z-[100] animate-fade-in" style={{ animation: "fade-in 0.5s ease-out, slide-up 0.5s ease-out" }}>
          <div className="relative">
            {/* Raccoon SVG — detective with Chicago hot dog */}
            <svg width="100" height="110" viewBox="0 0 200 220" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-xl">
              {/* Body */}
              <ellipse cx="100" cy="130" rx="55" ry="50" fill="#888" stroke="#333" strokeWidth="3"/>
              {/* Head */}
              <circle cx="100" cy="75" r="35" fill="#999" stroke="#333" strokeWidth="3"/>
              {/* Mask */}
              <ellipse cx="85" cy="72" rx="12" ry="8" fill="#333"/>
              <ellipse cx="115" cy="72" rx="12" ry="8" fill="#333"/>
              {/* Eyes */}
              <circle cx="85" cy="72" r="5" fill="white"/>
              <circle cx="115" cy="72" r="5" fill="white"/>
              <circle cx="87" cy="72" r="2.5" fill="#333"/>
              <circle cx="117" cy="72" r="2.5" fill="#333"/>
              {/* Nose */}
              <circle cx="100" cy="85" r="4" fill="#333"/>
              {/* Hat */}
              <ellipse cx="100" cy="50" rx="40" ry="8" fill="#555" stroke="#333" strokeWidth="2"/>
              <rect x="75" y="25" width="50" height="27" rx="5" fill="#555" stroke="#333" strokeWidth="2"/>
              {/* Tail */}
              <path d="M45 140 C20 120, 15 160, 35 170 C15 150, 25 130, 45 140" fill="#999" stroke="#333" strokeWidth="2"/>
              <path d="M35 155 C25 148, 28 138, 38 142" fill="#333"/>
              <path d="M28 162 C20 158, 22 148, 32 152" fill="#333"/>
              {/* Hot dog */}
              <ellipse cx="140" cy="175" rx="40" ry="12" fill="#e8a840" stroke="#333" strokeWidth="2"/>
              <ellipse cx="140" cy="170" rx="30" ry="8" fill="#cc4444" stroke="#333" strokeWidth="1.5"/>
              <path d="M115 168 Q125 162 135 168 Q145 162 155 168" stroke="#ccaa00" strokeWidth="2" fill="none"/>
              {/* Phone */}
              <rect x="150" y="95" width="20" height="30" rx="3" fill="#ddd" stroke="#333" strokeWidth="2"/>
              <rect x="153" y="100" width="14" height="16" rx="1" fill="#88ccff"/>
            </svg>
            <p className="text-[10px] text-white/60 text-center mt-1 font-light">Chief Intelligence Officer</p>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Sync time-of-day check (no async, instant) ─────────
function getChicagoTimePreset(): string {
  const now = new Date();
  const chiHour = parseInt(
    now.toLocaleString("en-US", { timeZone: "America/Chicago", hour: "2-digit", hour12: false })
  );
  if (chiHour >= 5 && chiHour < 7) return "dawn";
  if (chiHour >= 7 && chiHour < 17) return "day";
  if (chiHour >= 17 && chiHour < 20) return "dusk";
  return "night";
}

// ─── Page ───────────────────────────────────────────────
export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const [weatherFX, setWeatherFX] = useState<WeatherFX | null>(null);
  // Sync check — isDark is correct from very first render
  const [timePreset] = useState(() => getChicagoTimePreset());
  useEffect(() => setMounted(true), []);
  useEffect(() => { getChicagoWeather().then(setWeatherFX); }, []);

  const isDark = weatherFX
    ? (weatherFX.preset === "night" || weatherFX.preset === "dusk")
    : (timePreset === "night" || timePreset === "dusk");

  return (
    <div className="min-h-screen bg-[#f5f5f0]">
      <style jsx global>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fade-in 0.8s ease-out forwards; }
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .marquee-track { animation: marquee 40s linear infinite; }
        .marquee-track:hover { animation-play-state: paused; }
        @keyframes slide-up { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @media (prefers-reduced-motion: reduce) { .marquee-track { animation: none; } }
      `}</style>

      {/* ════════════════════════════════════════════════════
          HERO + CAPABILITIES — Map continues behind both sections
          Cinematic scroll: map zooms out as user scrolls through
         ════════════════════════════════════════════════════ */}
      <div className="relative" style={{ minHeight: "200vh" }}>
        {/* Map spans the entire hero + capabilities zone */}
        <div className="sticky top-0 h-screen overflow-hidden -z-0">
          <ChicagoMap weatherFX={weatherFX} />
        </div>

        {/* Nav — Glass UI, floated with blur */}
        <nav className={`fixed top-4 left-4 right-4 z-50 h-[72px] flex items-center justify-between px-8 rounded-2xl border transition-colors duration-300 ${isDark ? "bg-black/30 border-white/[0.06] backdrop-blur-xl" : "bg-white/60 border-black/[0.06] backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.06)]"}`}>
          <div className="py-2">
            <BrandLogo dark={isDark} />
          </div>
          <div className="flex items-center gap-6">
            <a href="#capabilities" className={`text-[12px] tracking-[-0.01em] transition-colors hidden md:block ${isDark ? "text-white/40 hover:text-white" : "text-neutral-400 hover:text-neutral-800"}`}>Capabilities</a>
            <a href="#process" className={`text-[12px] tracking-[-0.01em] transition-colors hidden md:block ${isDark ? "text-white/40 hover:text-white" : "text-neutral-400 hover:text-neutral-800"}`}>Process</a>
            <a href="#pricing" className={`text-[12px] tracking-[-0.01em] transition-colors hidden md:block ${isDark ? "text-white/40 hover:text-white" : "text-neutral-400 hover:text-neutral-800"}`}>Pricing</a>
            <Link href="/dashboard" className="px-5 py-2 bg-[#F97316] text-white text-[12px] font-medium rounded-lg hover:shadow-[0_2px_12px_rgba(249,115,22,0.3)] transition-all duration-150">
              Launch Platform
            </Link>
          </div>
        </nav>

        {/* ─── Screen 1: Hero — text floats directly over the map ─── */}
        <section className="relative z-10 h-screen flex flex-col items-center justify-center px-8" style={{ marginTop: "-100vh" }}>
          <div className={`max-w-3xl mx-auto text-center transition-all duration-[1200ms] delay-300 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            <p className={`text-[11px] font-medium tracking-[0.3em] uppercase mb-8 ${isDark ? "text-white/50" : "text-neutral-500"}`} style={{ textShadow: isDark ? "0 1px 8px rgba(0,0,0,0.8)" : "0 1px 8px rgba(255,255,255,0.9)" }}>
              Autonomous Due Diligence
            </p>

            <h1 className="leading-[0.95] tracking-[-0.05em] mb-8" style={{ textShadow: isDark ? "0 2px 40px rgba(0,0,0,0.7), 0 0px 80px rgba(0,0,0,0.4)" : "0 2px 40px rgba(255,255,255,0.8), 0 0px 80px rgba(255,255,255,0.5)" }}>
              <span className={`block text-[clamp(2.2rem,6vw,4.5rem)] font-black ${isDark ? "text-white" : "text-[#191818]"}`}>
                Every great deal
              </span>
              <span className={`block text-[clamp(2.2rem,6vw,4.5rem)] font-black italic ${isDark ? "text-white" : "text-[#191818]"}`}>
                starts with clarity.
              </span>
            </h1>

            <p className={`text-[clamp(1rem,1.3vw,1.2rem)] font-light max-w-lg mx-auto leading-[1.6] mb-10 ${isDark ? "text-white/60" : "text-neutral-500"}`} style={{ textShadow: isDark ? "0 1px 12px rgba(0,0,0,0.7)" : "0 1px 12px rgba(255,255,255,0.9)" }}>
              The research tools to make <span className="text-[#F97316] font-medium">confident decisions</span> for your next venture. AI-powered <span className="text-[#F97316] font-medium">due diligence</span> and <span className="text-[#F97316] font-medium">strategy analysis</span>, delivered in minutes.
            </p>

            <div className="flex items-center justify-center gap-3">
              <Link href="/dashboard" className="px-8 py-4 bg-[#F97316] text-white text-[14px] font-semibold rounded-xl hover:shadow-[0_4px_24px_rgba(249,115,22,0.4)] transition-all duration-150 tracking-[-0.01em]">
                Start Analysis
              </Link>
              <Link href="/dashboard?demo=true" className={`px-8 py-4 text-[14px] font-light rounded-xl backdrop-blur-md transition-all duration-150 ${isDark ? "text-white/60 hover:text-white bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.08]" : "text-neutral-600 hover:text-neutral-900 bg-white/40 hover:bg-white/60 border border-white/50"}`}>
                Watch Demo
              </Link>
            </div>

            {/* Scroll indicator */}
            <div className={`mt-14 flex flex-col items-center gap-2 ${isDark ? "text-white/25" : "text-neutral-400"}`} style={{ textShadow: isDark ? "0 1px 6px rgba(0,0,0,0.5)" : "0 1px 6px rgba(255,255,255,0.8)" }}>
              <span className="text-[10px] tracking-[0.2em] uppercase font-light">Scroll</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="animate-bounce"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
            </div>
          </div>
        </section>

        {/* ─── Screen 2: What it does — SVG cards over the map ─── */}
        <section className="relative z-10 min-h-screen flex items-center px-8 py-24">
          <div className="max-w-6xl mx-auto w-full">
            <Reveal>
              <p className={`text-[10px] tracking-[0.4em] uppercase font-semibold mb-4 ${isDark ? "text-white/40" : "text-black/40"}`}>What it does</p>
              <h2 className={`text-4xl sm:text-5xl font-black tracking-[-0.03em] leading-[0.95] mb-16 ${isDark ? "text-white" : "text-[#191818]"}`}>
                From company name<br />to investment report
              </h2>
            </Reveal>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Card 1: Research */}
              <Reveal delay={0}>
                <div className="bg-white/70 backdrop-blur-xl border border-black/[0.06] rounded-2xl p-8 shadow-sm hover:shadow-lg hover:bg-white/85 transition-all duration-300 group cursor-pointer">
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="mb-6">
                    <rect x="4" y="4" width="40" height="40" rx="12" stroke="#191818" strokeWidth="1.5" fill="none" />
                    <circle cx="22" cy="22" r="8" stroke="#191818" strokeWidth="1.5" />
                    <path d="M28 28L36 36" stroke="#191818" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M19 20H25" stroke="#F97316" strokeWidth="2" strokeLinecap="round" />
                    <path d="M22 17V23" stroke="#F97316" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  <h3 className="text-xl font-bold text-[#191818] mb-2 tracking-[-0.01em]">Deep Research</h3>
                  <p className="text-[14px] text-black/40 leading-relaxed mb-5">20+ autonomous web searches across company data, news, financials, and competitive landscape.</p>
                  <Link href="/dashboard?demo=true" className="inline-flex items-center gap-2 text-[12px] font-semibold text-[#191818] group-hover:text-black/70 transition-colors">
                    <span>Watch it research</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </Link>
                </div>
              </Reveal>

              {/* Card 2: Verify */}
              <Reveal delay={120}>
                <div className="bg-white/70 backdrop-blur-xl border border-black/[0.06] rounded-2xl p-8 shadow-sm hover:shadow-lg hover:bg-white/85 transition-all duration-300 group cursor-pointer">
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="mb-6">
                    <rect x="4" y="4" width="40" height="40" rx="12" stroke="#191818" strokeWidth="1.5" fill="none" />
                    <circle cx="20" cy="18" r="5" stroke="#191818" strokeWidth="1.5" />
                    <path d="M12 36c0-5 4-8 8-8s8 3 8 8" stroke="#191818" strokeWidth="1.5" strokeLinecap="round" />
                    <circle cx="32" cy="18" r="4" stroke="#191818" strokeWidth="1.5" />
                    <path d="M29 30l5-5 3 3" stroke="#F97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <h3 className="text-xl font-bold text-[#191818] mb-2 tracking-[-0.01em]">Team Verification</h3>
                  <p className="text-[14px] text-black/40 leading-relaxed mb-5">Every executive verified against LinkedIn. Unverified claims flagged. No hallucinated data, ever.</p>
                  <Link href="/dashboard?demo=true" className="inline-flex items-center gap-2 text-[12px] font-semibold text-[#191818] group-hover:text-black/70 transition-colors">
                    <span>See verification</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </Link>
                </div>
              </Reveal>

              {/* Card 3: Report */}
              <Reveal delay={240}>
                <div className="bg-white/70 backdrop-blur-xl border border-black/[0.06] rounded-2xl p-8 shadow-sm hover:shadow-lg hover:bg-white/85 transition-all duration-300 group cursor-pointer">
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="mb-6">
                    <rect x="4" y="4" width="40" height="40" rx="12" stroke="#191818" strokeWidth="1.5" fill="none" />
                    <rect x="14" y="12" width="20" height="24" rx="3" stroke="#191818" strokeWidth="1.5" fill="none" />
                    <path d="M18 18H30" stroke="#191818" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M18 23H26" stroke="#191818" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M18 28H22" stroke="#191818" strokeWidth="1.5" strokeLinecap="round" />
                    <rect x="26" y="26" width="6" height="6" rx="1" fill="#F97316" stroke="#191818" strokeWidth="1" />
                    <path d="M28 29l1 1 2-2" stroke="#191818" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <h3 className="text-xl font-bold text-[#191818] mb-2 tracking-[-0.01em]">Investment Report</h3>
                  <p className="text-[14px] text-black/40 leading-relaxed mb-5">10-section structured analysis with BUY/LEAN BUY/PASS recommendation. Download as XLSX, CSV, or JSON.</p>
                  <Link href="/dashboard?demo=true" className="inline-flex items-center gap-2 text-[12px] font-semibold text-[#191818] group-hover:text-black/70 transition-colors">
                    <span>View sample report</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </Link>
                </div>
              </Reveal>
            </div>

            {/* Bottom row — smaller detail cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-5">
              <Reveal delay={360}>
                <div className="bg-white/50 backdrop-blur-lg border border-black/[0.04] rounded-xl px-6 py-5 flex items-center gap-4">
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                    <path d="M16 4L4 10v12l12 6 12-6V10L16 4z" stroke="#191818" strokeWidth="1.2" fill="none" />
                    <path d="M4 10l12 6 12-6" stroke="#191818" strokeWidth="1.2" />
                    <path d="M16 16v12" stroke="#F97316" strokeWidth="1.5" />
                  </svg>
                  <div>
                    <div className="text-sm font-bold text-[#191818]">Risk Matrix</div>
                    <div className="text-[12px] text-black/35">Severity-scored threats</div>
                  </div>
                </div>
              </Reveal>
              <Reveal delay={420}>
                <div className="bg-white/50 backdrop-blur-lg border border-black/[0.04] rounded-xl px-6 py-5 flex items-center gap-4">
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                    <rect x="4" y="8" width="24" height="18" rx="3" stroke="#191818" strokeWidth="1.2" fill="none" />
                    <path d="M4 14h24" stroke="#191818" strokeWidth="1.2" />
                    <circle cx="9" cy="11" r="1.5" fill="#F97316" />
                    <circle cx="14" cy="11" r="1.5" fill="#F97316" />
                  </svg>
                  <div>
                    <div className="text-sm font-bold text-[#191818]">Live Dashboard</div>
                    <div className="text-[12px] text-black/35">Watch every step live</div>
                  </div>
                </div>
              </Reveal>
              <Reveal delay={480}>
                <div className="bg-white/50 backdrop-blur-lg border border-black/[0.04] rounded-xl px-6 py-5 flex items-center gap-4">
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                    <path d="M8 26V12l6-6h10a2 2 0 012 2v18a2 2 0 01-2 2H10a2 2 0 01-2-2z" stroke="#191818" strokeWidth="1.2" fill="none" />
                    <path d="M14 6v6H8" stroke="#191818" strokeWidth="1.2" />
                    <path d="M13 17h6M13 21h4" stroke="#F97316" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  <div>
                    <div className="text-sm font-bold text-[#191818]">Pitch Deck Upload</div>
                    <div className="text-[12px] text-black/35">Cross-reference claims</div>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>
      </div>

      {/* ════════════════════════════════════════════════════
          PRACTICES — Maze-inspired: light weight, tight tracking,
          lime pills, thin dividers, generous whitespace
         ════════════════════════════════════════════════════ */}
      <section id="capabilities" className="relative z-30 bg-white">
        <div className="max-w-[72rem] mx-auto px-8">
          {/* Section intro */}
          <div className="py-[clamp(4rem,10vh,6rem)] border-b border-neutral-200">
            <Reveal>
              <h2 className="text-[clamp(2.5rem,6vw,5rem)] font-light text-[#191818] tracking-[-0.06em] leading-[1]">
                Three practices.<br />One platform.
              </h2>
              <p className="text-[clamp(1rem,1.2vw,1.25rem)] text-neutral-400 max-w-xl leading-[1.6] mt-6 font-light">
                Whether evaluating an acquisition target or pressure-testing your own strategic position.
              </p>
            </Reveal>
          </div>

          {/* ─── Practice 1: Due Diligence ─── */}
          <div className="py-[clamp(3rem,8vh,5rem)] border-b border-neutral-200">
            <Reveal>
              <div className="flex items-center gap-3 mb-8">
                <span className="text-[clamp(0.75rem,1vw,0.875rem)] text-neutral-400 font-light tracking-[-0.02em]">Practice I</span>
                <span className="text-[11px] text-white bg-[#F97316] px-3 py-1 rounded-full font-medium tracking-[-0.01em]">$40 / report</span>
              </div>
              <h3 className="text-[clamp(2rem,4vw,3.5rem)] font-light text-[#191818] tracking-[-0.05em] leading-[1.05] mb-4">
                Investment Due Diligence
              </h3>
              <p className="text-[clamp(0.9rem,1.1vw,1.1rem)] text-neutral-400 max-w-lg leading-[1.6] font-light">
                From initial screening to IC-ready memorandum. Comprehensive target evaluation for fund managers and corporate development.
              </p>
            </Reveal>

            <div className="mt-12 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-8 gap-y-10">
              {[
                "Company Profile", "Leadership Audit", "Market Sizing", "Competitive Mapping", "Traction Analysis",
                "Financial Assessment", "Risk Matrix", "Competitive Moats", "Recommendation", "Deliverables",
              ].map((t, i) => (
                <Reveal key={t} delay={i * 40}>
                  <div className="group cursor-default">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#F97316] mb-3 group-hover:scale-[2.5] transition-transform duration-300" />
                    <h4 className="text-[14px] text-[#191818] font-normal tracking-[-0.02em] mb-1">{t}</h4>
                  </div>
                </Reveal>
              ))}
            </div>

            <Reveal delay={200}>
              <div className="mt-10 flex items-center gap-3">
                <Link href="/dashboard" className="px-6 py-2.5 bg-neutral-800 text-white text-[13px] font-normal rounded-lg hover:bg-neutral-700 transition-colors duration-150 tracking-[-0.02em]">
                  Run Due Diligence
                </Link>
                <Link href="/dashboard?demo=true" className="px-6 py-2.5 text-neutral-400 text-[13px] font-normal rounded-lg hover:text-neutral-800 transition-colors duration-150 tracking-[-0.02em]">
                  Watch demo
                </Link>
              </div>
            </Reveal>
          </div>

          {/* ─── Practice 2: Strategy Analysis ─── */}
          <div className="py-[clamp(3rem,8vh,5rem)] border-b border-neutral-200">
            <Reveal>
              <div className="flex items-center gap-3 mb-8">
                <span className="text-[clamp(0.75rem,1vw,0.875rem)] text-neutral-400 font-light tracking-[-0.02em]">Practice II</span>
                <span className="text-[11px] text-white bg-[#F97316] px-3 py-1 rounded-full font-medium tracking-[-0.01em]">$5 / report</span>
              </div>
              <h3 className="text-[clamp(2rem,4vw,3.5rem)] font-light text-[#191818] tracking-[-0.05em] leading-[1.05] mb-4">
                Business Strategy Analysis
              </h3>
              <p className="text-[clamp(0.9rem,1.1vw,1.1rem)] text-neutral-400 max-w-lg leading-[1.6] font-light">
                The same analytical depth, turned inward. For founders who need McKinsey-grade strategic clarity on their own business.
              </p>
            </Reveal>

            <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-1">
              {[
                { n: "01", t: "Market Sizing & TAM" },
                { n: "02", t: "Competitive Deep Dive" },
                { n: "03", t: "Customer Segmentation" },
                { n: "04", t: "Industry Trends" },
                { n: "05", t: "SWOT & Porter\u2019s Five Forces" },
                { n: "06", t: "Pricing Strategy" },
                { n: "07", t: "Go-to-Market Playbook" },
                { n: "08", t: "Customer Journey Map" },
                { n: "09", t: "Unit Economics & Financials" },
                { n: "10", t: "Risk & Scenario Planning" },
                { n: "11", t: "Market Entry Strategy" },
                { n: "12", t: "Executive Synthesis" },
              ].map((f, i) => (
                <Reveal key={f.n} delay={i * 30}>
                  <div className="flex items-center gap-4 py-3 group cursor-default">
                    <span className="text-[13px] text-neutral-300 font-light tabular-nums w-6 shrink-0 group-hover:text-[#F97316] transition-colors duration-300">{f.n}</span>
                    <span className="text-[14px] text-[#191818] font-normal tracking-[-0.02em]">{f.t}</span>
                  </div>
                </Reveal>
              ))}
            </div>

            <Reveal delay={200}>
              <div className="mt-10 flex items-center gap-3">
                <Link href="/dashboard?type=strategy" className="px-6 py-2.5 bg-neutral-800 text-white text-[13px] font-normal rounded-lg hover:bg-neutral-700 transition-colors duration-150 tracking-[-0.02em]">
                  Run Strategy Analysis
                </Link>
                <Link href="/dashboard?demo=true&type=strategy" className="px-6 py-2.5 text-neutral-400 text-[13px] font-normal rounded-lg hover:text-neutral-800 transition-colors duration-150 tracking-[-0.02em]">
                  View sample
                </Link>
              </div>
            </Reveal>
          </div>

          {/* ─── Practice 3: Supply Chain Intelligence ─── */}
          <div className="py-[clamp(3rem,8vh,5rem)] border-b border-neutral-200">
            <Reveal>
              <div className="flex items-center gap-3 mb-8">
                <span className="text-[clamp(0.75rem,1vw,0.875rem)] text-neutral-400 font-light tracking-[-0.02em]">Practice III</span>
                <span className="text-[11px] text-white bg-[#F97316] px-3 py-1 rounded-full font-medium tracking-[-0.01em]">$75 / report</span>
              </div>
              <h3 className="text-[clamp(2rem,4vw,3.5rem)] font-light text-[#191818] tracking-[-0.05em] leading-[1.05] mb-4">
                Supply Chain Intelligence
              </h3>
              <p className="text-[clamp(0.9rem,1.1vw,1.1rem)] text-neutral-400 max-w-lg leading-[1.6] font-light">
                Cross-referencing global logistics chains with real-time financial sentiment analysis. Supplier mapping, geographic risk, competitive displacement detection.
              </p>
            </Reveal>

            <div className="mt-12 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-8 gap-y-10">
              {[
                "Supplier Mapping", "Geographic Risk", "Vulnerability Detection", "Logistics Analysis", "Trade & Tariff Risk",
                "Commodity Sensitivity", "Displacement Signals", "Financial Sentiment", "Disruption Monitoring", "Scenario Modeling",
              ].map((t, i) => (
                <Reveal key={t} delay={i * 40}>
                  <div className="group cursor-default">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#F97316] mb-3 group-hover:scale-[2.5] transition-transform duration-300" />
                    <h4 className="text-[14px] text-[#191818] font-normal tracking-[-0.02em] mb-1">{t}</h4>
                  </div>
                </Reveal>
              ))}
            </div>

            <Reveal delay={200}>
              <div className="mt-10 flex items-center gap-3">
                <Link href="/dashboard/supply-chain" className="px-6 py-2.5 bg-neutral-800 text-white text-[13px] font-normal rounded-lg hover:bg-neutral-700 transition-colors duration-150 tracking-[-0.02em]">
                  Run SC Intelligence
                </Link>
                <Link href="/dashboard/supply-chain?demo=true" className="px-6 py-2.5 text-neutral-400 text-[13px] font-normal rounded-lg hover:text-neutral-800 transition-colors duration-150 tracking-[-0.02em]">
                  Watch demo
                </Link>
              </div>
            </Reveal>
          </div>

          {/* ─── Methodology ─── */}
          <div id="process" className="py-[clamp(4rem,10vh,6rem)] border-b border-neutral-200">
            <Reveal>
              <h2 className="text-[clamp(2rem,4.5vw,3.5rem)] font-light text-[#191818] tracking-[-0.05em] leading-[1.05] mb-16">
                How it works
              </h2>
            </Reveal>
            {[
              { n: "01", t: "Scope", d: "5-8 research workstreams defined automatically: company, leadership, market, competition, traction, financials, risks." },
              { n: "02", t: "Research", d: "20+ targeted web searches. Each finding cross-referenced. Claims without corroboration are flagged, not fabricated." },
              { n: "03", t: "Verify", d: "Executives verified against LinkedIn. Funding rounds checked against press. Financial claims validated where possible." },
              { n: "04", t: "Deliver", d: "10-section structured report with risk scores, competitive positioning, and a clear recommendation backed by evidence." },
            ].map((s, i) => (
              <Reveal key={s.n} delay={i * 100}>
                <div className="flex items-baseline gap-6 sm:gap-12 py-8 border-t border-neutral-100 group">
                  <span className="text-[clamp(2rem,3vw,2.5rem)] font-light text-neutral-200 tracking-[-0.04em] shrink-0 tabular-nums group-hover:text-[#F97316] transition-colors duration-300">{s.n}</span>
                  <div>
                    <h4 className="text-[clamp(1.1rem,1.5vw,1.375rem)] font-normal text-[#191818] tracking-[-0.03em] mb-1">{s.t}</h4>
                    <p className="text-[clamp(0.85rem,1vw,0.95rem)] text-neutral-400 leading-[1.6] font-light max-w-lg">{s.d}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          {/* ─── Pricing ─── */}
          <div id="pricing" className="py-[clamp(4rem,10vh,6rem)]">
            <Reveal>
              <h2 className="text-[clamp(2rem,4.5vw,3.5rem)] font-light text-[#191818] tracking-[-0.05em] leading-[1.05] mb-12">
                Simple pricing
              </h2>
            </Reveal>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Reveal delay={0}>
                <div className="rounded-xl border border-neutral-200 p-8 hover:border-neutral-300 transition-colors duration-150">
                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-[clamp(2.5rem,5vw,3.5rem)] font-light text-[#191818] tracking-[-0.04em]">$40</span>
                    <span className="text-neutral-300 font-light text-[15px]">/ report</span>
                  </div>
                  <h4 className="text-[17px] text-[#191818] font-normal tracking-[-0.02em] mb-2">Investment Due Diligence</h4>
                  <p className="text-[14px] text-neutral-400 leading-[1.6] font-light mb-6">10-section VC analysis. Leadership verification, market sizing, risk matrix, actionable recommendation.</p>
                  <Link href="/dashboard" className="inline-block px-5 py-2.5 bg-neutral-800 text-white text-[13px] font-normal rounded-lg hover:bg-neutral-700 transition-colors duration-150">
                    Get started
                  </Link>
                </div>
              </Reveal>
              <Reveal delay={80}>
                <div className="rounded-xl border border-neutral-200 p-8 hover:border-neutral-300 transition-colors duration-150">
                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-[clamp(2.5rem,5vw,3.5rem)] font-light text-[#191818] tracking-[-0.04em]">$5</span>
                    <span className="text-neutral-300 font-light text-[15px]">/ report</span>
                  </div>
                  <h4 className="text-[17px] text-[#191818] font-normal tracking-[-0.02em] mb-2">Business Strategy Analysis</h4>
                  <p className="text-[14px] text-neutral-400 leading-[1.6] font-light mb-6">12-framework strategic deep dive. Market sizing, Porter&apos;s Five Forces, GTM playbook, executive synthesis.</p>
                  <Link href="/dashboard?type=strategy" className="inline-block px-5 py-2.5 bg-neutral-800 text-white text-[13px] font-normal rounded-lg hover:bg-neutral-700 transition-colors duration-150">
                    Get started
                  </Link>
                </div>
              </Reveal>
            </div>

            {/* Stats row */}
            <div className="mt-16 grid grid-cols-3 gap-8 border-t border-neutral-100 pt-12">
              <Reveal delay={0}>
                <div>
                  <div className="text-[clamp(2rem,4vw,3rem)] font-light text-[#191818] tracking-[-0.04em]">1000x</div>
                  <p className="text-[13px] text-neutral-400 font-light mt-1">cheaper than traditional advisory</p>
                </div>
              </Reveal>
              <Reveal delay={80}>
                <div>
                  <div className="text-[clamp(2rem,4vw,3rem)] font-light text-[#191818] tracking-[-0.04em]">5 min</div>
                  <p className="text-[13px] text-neutral-400 font-light mt-1">average turnaround time</p>
                </div>
              </Reveal>
              <Reveal delay={160}>
                <div>
                  <div className="text-[clamp(2rem,4vw,3rem)] font-light text-[#191818] tracking-[-0.04em]">Zero</div>
                  <p className="text-[13px] text-neutral-400 font-light mt-1">hallucinated data points</p>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          FOOTER — Typographic, animated, reflective
         ════════════════════════════════════════════════════ */}
      <footer className="relative z-30 bg-[#0a0a0a] overflow-hidden">
        {/* Marquee styles injected inline to avoid jsx tag issues */}

        {/* ─── CTA row ─── */}
        <div className="max-w-[72rem] mx-auto px-8 pt-[clamp(5rem,12vh,8rem)] pb-16">
          <Reveal>
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8">
              <div className="max-w-xl">
                <h2 className="text-[clamp(2.5rem,6vw,4.5rem)] font-light text-white tracking-[-0.06em] leading-[1]">
                  Ready to see it<br />in action?
                </h2>
                <p className="text-[clamp(0.95rem,1.1vw,1.125rem)] text-white/25 leading-[1.6] mt-5 font-light">
                  No signup. No retainers. Enter a company, get a structured report.
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Link href="/dashboard" className="px-7 py-3.5 bg-[#F97316] text-white text-[14px] font-medium rounded-lg hover:shadow-[0_4px_24px_rgba(249,115,22,0.25)] transition-all duration-150 tracking-[-0.01em]">
                  Launch platform
                </Link>
                <Link href="/dashboard?demo=true" className="px-7 py-3.5 text-white/25 text-[14px] font-light rounded-lg hover:text-white/50 transition-colors duration-150">
                  Watch demo
                </Link>
              </div>
            </div>
          </Reveal>
        </div>

        {/* ─── Giant marquee with reflection ─── */}
        <div className="relative select-none cursor-default">
          {/* Main marquee */}
          <div className="overflow-hidden whitespace-nowrap border-t border-white/[0.04] py-6">
            <div className="marquee-track inline-flex">
              {[...Array(2)].map((_, copy) => (
                <span key={copy} className="inline-flex items-center">
                  {["Due Diligence", "Market Sizing", "Leadership Audit", "Risk Matrix", "Strategy Analysis", "Supply Chain", "Competitive Mapping", "Financial Assessment"].map((text, i) => (
                    <span key={`${copy}-${i}`} className="inline-flex items-center">
                      <span className="text-[clamp(3rem,8vw,7rem)] font-light text-white/[0.07] tracking-[-0.05em] leading-none hover:text-white/20 transition-colors duration-500 cursor-default px-2">
                        {text}
                      </span>
                      <span className="w-2 h-2 rounded-full bg-[#F97316]/30 mx-6 shrink-0" />
                    </span>
                  ))}
                </span>
              ))}
            </div>
          </div>

          {/* Reflection — flipped, fading */}
          <div className="overflow-hidden whitespace-nowrap h-16 pointer-events-none" style={{ transform: "scaleY(-1)", maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, transparent 100%)", WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, transparent 100%)" }}>
            <div className="marquee-track inline-flex">
              {[...Array(2)].map((_, copy) => (
                <span key={copy} className="inline-flex items-center">
                  {["Due Diligence", "Market Sizing", "Leadership Audit", "Risk Matrix", "Strategy Analysis", "Supply Chain", "Competitive Mapping", "Financial Assessment"].map((text, i) => (
                    <span key={`r-${copy}-${i}`} className="inline-flex items-center">
                      <span className="text-[clamp(3rem,8vw,7rem)] font-light text-white/[0.04] tracking-[-0.05em] leading-none px-2">
                        {text}
                      </span>
                      <span className="w-2 h-2 rounded-full bg-[#F97316]/10 mx-6 shrink-0" />
                    </span>
                  ))}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ─── Info columns ─── */}
        <div className="max-w-[72rem] mx-auto px-8 py-12 border-t border-white/[0.04]">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {/* Offerings */}
            <div>
              <h4 className="text-[11px] text-white/20 font-medium tracking-[0.1em] uppercase mb-5">Practices</h4>
              <ul className="space-y-3">
                <li><Link href="/dashboard" className="text-[13px] text-white/40 font-light hover:text-[#F97316] transition-colors duration-150">Investment Due Diligence</Link></li>
                <li><Link href="/dashboard?type=strategy" className="text-[13px] text-white/40 font-light hover:text-[#F97316] transition-colors duration-150">Business Strategy</Link></li>
                <li><Link href="/dashboard/supply-chain" className="text-[13px] text-white/40 font-light hover:text-[#F97316] transition-colors duration-150">Supply Chain Intelligence</Link></li>
              </ul>
            </div>
            {/* Analysis */}
            <div>
              <h4 className="text-[11px] text-white/20 font-medium tracking-[0.1em] uppercase mb-5">Analysis</h4>
              <ul className="space-y-3">
                {["Company Profile", "Leadership Audit", "Market Sizing", "Risk Matrix", "Competitive Mapping"].map(t => (
                  <li key={t}><span className="text-[13px] text-white/25 font-light">{t}</span></li>
                ))}
              </ul>
            </div>
            {/* Frameworks */}
            <div>
              <h4 className="text-[11px] text-white/20 font-medium tracking-[0.1em] uppercase mb-5">Frameworks</h4>
              <ul className="space-y-3">
                {["TAM/SAM/SOM", "Porter\u2019s Five Forces", "SWOT Analysis", "Unit Economics", "GTM Playbook"].map(t => (
                  <li key={t}><span className="text-[13px] text-white/25 font-light">{t}</span></li>
                ))}
              </ul>
            </div>
            {/* Output */}
            <div>
              <h4 className="text-[11px] text-white/20 font-medium tracking-[0.1em] uppercase mb-5">Output</h4>
              <ul className="space-y-3">
                {["XLSX Report", "CSV Export", "JSON API", "ZIP Bundle", "Real-time Dashboard"].map(t => (
                  <li key={t}><span className="text-[13px] text-white/25 font-light">{t}</span></li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* ─── Bottom bar ─── */}
        <div className="max-w-[72rem] mx-auto px-8 pb-8 pt-4 border-t border-white/[0.03] flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-[12px] text-white/15 font-light">Chicago Intelligence Company</span>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="text-[11px] text-white/15 font-light hover:text-white/30 transition-colors">Privacy</Link>
            <Link href="/terms" className="text-[11px] text-white/15 font-light hover:text-white/30 transition-colors">Terms</Link>
            <span className="text-[11px] text-white/10 font-light"><RaccoonEasterEgg /> {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
