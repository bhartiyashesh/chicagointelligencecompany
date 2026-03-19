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
function WeatherBadge({ fx }: { fx: WeatherFX | null }) {
  if (!fx) return null;
  const icons: Record<string, string> = {
    clear: "\u2600", cloudy: "\u2601", rain: "\u{1F327}", snow: "\u2744", thunder: "\u26A1", fog: "\u{1F32B}",
  };
  return (
    <div className="flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase font-medium animate-fade-in">
      <span className="text-sm">{icons[fx.icon] ?? ""}</span>
      <span className="text-white/30">{fx.temp}°F</span>
      <span className="text-white/15">|</span>
      <span className="text-white/25">{fx.weather}</span>
      <span className="text-white/15">|</span>
      <span className="text-white/20">{fx.wind} mph</span>
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
        <div className="absolute top-20 left-10 z-40 flex flex-col gap-1.5 animate-fade-in">
          <span className="text-[10px] tracking-[0.4em] uppercase font-medium" style={{ color: isNightTime ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.25)" }}>
            {landmarkName}
          </span>
          <WeatherBadge fx={weatherFX} />
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

// ─── Pixel Logo ─────────────────────────────────────────
function PixelLogo({ dark }: { dark?: boolean }) {
  const [phase, setPhase] = useState<"wait" | "type" | "done">("wait");
  const [chars, setChars] = useState(0);
  const name = "CHICAGO INTELLIGENCE COMPANY";

  useEffect(() => { const t = setTimeout(() => setPhase("type"), 600); return () => clearTimeout(t); }, []);
  useEffect(() => {
    if (phase !== "type") return;
    if (chars >= name.length) { setPhase("done"); return; }
    const t = setTimeout(() => setChars(c => c + 1), 22);
    return () => clearTimeout(t);
  }, [phase, chars, name.length]);

  return (
    <span
      className="cursor-pointer hover:opacity-60 transition-opacity"
      style={{ fontFamily: '"Silkscreen", monospace', fontSize: "11px", letterSpacing: "0.2em", color: dark ? "#ffffff" : "#191818", imageRendering: "pixelated" }}
    >
      {phase === "wait" ? "" : name.slice(0, phase === "done" ? name.length : chars)}
      {phase === "type" && <span className="animate-pulse" style={{ color: "#d4ff51" }}>_</span>}
    </span>
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

        {/* Nav — adapts to time of day */}
        <nav className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-10">
          <PixelLogo dark={isDark} />
          <div className="flex items-center gap-8">
            <a href="#capabilities" className={`text-[10px] tracking-[0.2em] uppercase transition-colors hidden md:block ${isDark ? "text-white/30 hover:text-white" : "text-black/30 hover:text-black"}`}>Capabilities</a>
            <a href="#process" className={`text-[10px] tracking-[0.2em] uppercase transition-colors hidden md:block ${isDark ? "text-white/30 hover:text-white" : "text-black/30 hover:text-black"}`}>Process</a>
            <Link href="/dashboard" className={`px-5 py-2.5 rounded-full text-[10px] font-semibold tracking-[0.15em] uppercase transition-all ${isDark ? "bg-white text-[#191818] hover:bg-white/90" : "bg-[#191818] text-white hover:bg-black/80"}`}>
              Launch
            </Link>
          </div>
        </nav>

        {/* ─── Screen 1: Hero headline — text adapts to map brightness ─── */}
        <section className="relative z-10 h-screen flex flex-col items-center justify-center px-8" style={{ marginTop: "-100vh" }}>
          <div className={`transition-all duration-[1200ms] delay-300 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            <p className={`text-center text-[11px] font-semibold tracking-[0.4em] uppercase mb-8 ${isDark ? "text-white/40" : "text-black/30"}`}>
              Autonomous Due Diligence
            </p>

            <h1 className="text-center leading-[0.9] tracking-[-0.04em] mb-10" style={{ fontFamily: "'Inter', sans-serif", textShadow: isDark ? "0 2px 30px rgba(0,0,0,0.5)" : "0 2px 30px rgba(255,255,255,0.5)" }}>
              <span className={`block text-[clamp(3rem,10vw,9rem)] font-black ${isDark ? "text-white" : "text-[#191818]"}`}>
                Intelligence
              </span>
              <span className={`block text-[clamp(3rem,10vw,9rem)] font-black italic ${isDark ? "text-white" : "text-[#191818]"}`}>
                at scale
              </span>
            </h1>

            <p className={`text-center text-lg sm:text-xl font-normal max-w-lg mx-auto leading-relaxed mb-12 ${isDark ? "text-white/50" : "text-black/40"}`}>
              Enter a company. Our AI agent researches, verifies, and delivers a structured investment report in minutes.
            </p>

            <div className="flex items-center justify-center gap-4">
              <Link href="/dashboard" className={`px-8 py-4 font-semibold rounded-full transition-all duration-300 text-[13px] tracking-wide ${isDark ? "bg-white text-[#191818] hover:shadow-[0_8px_30px_rgba(255,255,255,0.15)]" : "bg-[#191818] text-[#f5f5f0] hover:shadow-[0_8px_30px_rgba(0,0,0,0.2)]"}`}>
                Start Analysis
              </Link>
              <Link href="/dashboard?demo=true" className={`px-8 py-4 border font-medium rounded-full transition-all duration-300 text-[13px] tracking-wide ${isDark ? "border-white/15 text-white/50 hover:border-white/30 hover:text-white" : "border-black/10 text-black/50 hover:border-black/30 hover:text-black"}`}>
                Watch Demo
              </Link>
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
                    <path d="M19 20H25" stroke="#d4ff51" strokeWidth="2" strokeLinecap="round" />
                    <path d="M22 17V23" stroke="#d4ff51" strokeWidth="2" strokeLinecap="round" />
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
                    <path d="M29 30l5-5 3 3" stroke="#d4ff51" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
                    <rect x="26" y="26" width="6" height="6" rx="1" fill="#d4ff51" stroke="#191818" strokeWidth="1" />
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
                    <path d="M16 16v12" stroke="#d4ff51" strokeWidth="1.5" />
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
                    <circle cx="9" cy="11" r="1.5" fill="#d4ff51" />
                    <circle cx="14" cy="11" r="1.5" fill="#d4ff51" />
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
                    <path d="M13 17h6M13 21h4" stroke="#d4ff51" strokeWidth="1.5" strokeLinecap="round" />
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
          TWO PRACTICES — McKinsey-style product positioning
         ════════════════════════════════════════════════════ */}
      <section id="capabilities" className="relative z-30 py-32 px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="mb-6">
              <p className="text-[10px] tracking-[0.4em] uppercase text-black/30 font-semibold mb-6">Two practices. One platform.</p>
              <h2 className="text-5xl sm:text-7xl font-black text-[#191818] tracking-[-0.03em] leading-[0.95]">
                The analytical rigor of<br />a senior partner, <span className="italic">automated</span>
              </h2>
            </div>
            <p className="text-lg text-black/35 max-w-2xl leading-relaxed mt-6">
              Whether you are evaluating an acquisition target or pressure-testing your own strategic position, CIC delivers structured, evidence-based intelligence at a fraction of the cost and turnaround of traditional advisory.
            </p>
          </Reveal>

          {/* ─── Practice 1: Investment Due Diligence ─── */}
          <div className="mt-24 mb-28">
            <Reveal>
              <div className="flex items-center gap-4 mb-3">
                <div className="w-8 h-px bg-[#191818]" />
                <span className="text-[10px] tracking-[0.3em] uppercase text-black/40 font-semibold">Practice I</span>
                <span className="text-[9px] tracking-[0.2em] uppercase text-[#191818] bg-[#d4ff51] px-2.5 py-0.5 rounded-full font-semibold">$40 per report</span>
              </div>
              <h3 className="text-3xl sm:text-4xl font-black text-[#191818] tracking-[-0.02em] mb-3">Investment Due Diligence</h3>
              <p className="text-[15px] text-black/35 max-w-xl leading-relaxed">
                Comprehensive target evaluation for fund managers, corporate development teams, and independent sponsors. From initial screening to IC-ready memorandum.
              </p>
            </Reveal>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-px bg-black/[0.05] rounded-2xl overflow-hidden mt-12">
              {[
                { title: "Company Profile", sub: "Business model, history, founding story, corporate structure, and key milestones distilled from public data." },
                { title: "Leadership Audit", sub: "Executive team mapped and verified against LinkedIn. Track records assessed. Key person dependency flagged." },
                { title: "Market Sizing", sub: "TAM, SAM, SOM with top-down and bottom-up methodology. CAGR projections. Addressable market quantified." },
                { title: "Competitive Mapping", sub: "Direct and indirect competitors ranked by market share, funding, and strategic positioning. White space identified." },
                { title: "Traction Analysis", sub: "Revenue signals, growth trajectory, customer acquisition metrics, and product-market fit indicators evaluated." },
                { title: "Financial Assessment", sub: "Funding history, unit economics where available, burn rate signals, and valuation benchmarks cross-referenced." },
                { title: "Risk Matrix", sub: "15+ risk factors scored across market, operational, financial, regulatory, and reputational dimensions." },
                { title: "Competitive Moats", sub: "Defensibility analysis: network effects, switching costs, proprietary data, regulatory barriers, and brand equity." },
                { title: "Recommendation", sub: "Clear verdict: STRONG BUY, BUY, LEAN BUY, or PASS with supporting rationale and conviction level." },
                { title: "Deliverables", sub: "XLSX formatted for IC review. CSV for data integration. JSON for programmatic access. ZIP bundle download." },
              ].map((f, i) => (
                <Reveal key={f.title} delay={i * 50}>
                  <div className="bg-white p-6 hover:bg-[#fafaf8] transition-colors duration-300 cursor-default group h-full">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#d4ff51] mb-3 group-hover:scale-[2] transition-transform" />
                    <h4 className="text-[13px] font-bold text-[#191818] mb-1.5 tracking-[-0.01em]">{f.title}</h4>
                    <p className="text-[12px] text-black/35 leading-relaxed">{f.sub}</p>
                  </div>
                </Reveal>
              ))}
            </div>

            <Reveal delay={200}>
              <div className="mt-8 flex items-center gap-4">
                <Link href="/dashboard" className="px-6 py-3 bg-[#191818] text-white text-[12px] font-semibold rounded-full hover:shadow-lg transition-all tracking-wide">
                  Run Due Diligence
                </Link>
                <Link href="/dashboard?demo=true" className="px-6 py-3 border border-black/10 text-black/40 text-[12px] font-medium rounded-full hover:border-black/25 hover:text-black/60 transition-all tracking-wide">
                  Watch Demo
                </Link>
              </div>
            </Reveal>
          </div>

          {/* ─── Practice 2: Business Strategy Analysis ─── */}
          <div className="mb-8">
            <Reveal>
              <div className="flex items-center gap-4 mb-3">
                <div className="w-8 h-px bg-[#191818]" />
                <span className="text-[10px] tracking-[0.3em] uppercase text-black/40 font-semibold">Practice II</span>
                <span className="text-[9px] tracking-[0.2em] uppercase text-[#191818] bg-[#d4ff51] px-2.5 py-0.5 rounded-full font-semibold">$5 per report</span>
              </div>
              <h3 className="text-3xl sm:text-4xl font-black text-[#191818] tracking-[-0.02em] mb-3">Business Strategy Analysis</h3>
              <p className="text-[15px] text-black/35 max-w-xl leading-relaxed">
                The same analytical depth, turned inward. For founders, operators, and executive teams who need McKinsey-grade strategic clarity on their own business.
              </p>
            </Reveal>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-black/[0.05] rounded-2xl overflow-hidden mt-12">
              {[
                { n: "01", title: "Market Sizing & TAM", sub: "Top-down and bottom-up TAM/SAM/SOM with 5-year CAGR projections, methodology transparency, and assumption tables." },
                { n: "02", title: "Competitive Deep Dive", sub: "10 direct + 5 indirect competitors ranked by share, funding, and strategy. Price-value positioning map. White space analysis." },
                { n: "03", title: "Customer Segmentation", sub: "4 research-backed personas with demographics, psychographics, pain points, buying behavior, and willingness-to-pay analysis." },
                { n: "04", title: "Industry Trend Intelligence", sub: "Macro and micro trends mapped to short/mid/long-term horizons. Technology disruptions. Regulatory shifts. Investment signals." },
                { n: "05", title: "SWOT & Porter's Five Forces", sub: "Combined framework with cross-analysis. SO strategies identified. WT risks quantified. Industry attractiveness scored." },
                { n: "06", title: "Pricing Strategy", sub: "Competitor audit. Value-based and cost-plus models. Price elasticity estimates. Three-tier recommendation with revenue projections." },
                { n: "07", title: "Go-to-Market Playbook", sub: "Pre-launch, launch, post-launch phasing. Channel strategy ranked by ROI. Budget allocation. KPI framework with benchmarks." },
                { n: "08", title: "Customer Journey Map", sub: "Full lifecycle mapping: awareness through churn. Touchpoints, friction points, and optimization opportunities at each stage." },
                { n: "09", title: "Unit Economics & Financials", sub: "CAC by channel, LTV calculation, payback period. 3-year projections with sensitivity analysis across three scenarios." },
                { n: "10", title: "Risk & Scenario Planning", sub: "15 risks scored across 5 categories. Best/base/worst/black-swan scenarios modeled with strategic response playbooks." },
                { n: "11", title: "Market Entry Strategy", sub: "Market attractiveness scoring. Entry mode analysis. Localization requirements. 12-month roadmap with milestones and investment sizing." },
                { n: "12", title: "Executive Strategy Synthesis", sub: "Three strategic paths (conservative, balanced, aggressive) with recommended option. Top 5 priority initiatives for next 90 days." },
              ].map((f, i) => (
                <Reveal key={f.n} delay={i * 40}>
                  <div className="bg-white p-6 hover:bg-[#fafaf8] transition-colors duration-300 cursor-default group h-full">
                    <span className="text-[28px] font-black text-black/[0.06] tracking-[-0.04em] block mb-2 group-hover:text-[#d4ff51]/40 transition-colors duration-500">{f.n}</span>
                    <h4 className="text-[13px] font-bold text-[#191818] mb-1.5 tracking-[-0.01em]">{f.title}</h4>
                    <p className="text-[11px] text-black/35 leading-relaxed">{f.sub}</p>
                  </div>
                </Reveal>
              ))}
            </div>

            <Reveal delay={200}>
              <div className="mt-8 flex items-center gap-4">
                <Link href="/dashboard?type=strategy" className="px-6 py-3 bg-[#191818] text-white text-[12px] font-semibold rounded-full hover:shadow-lg transition-all tracking-wide">
                  Run Strategy Analysis
                </Link>
                <Link href="/dashboard?demo=true&type=strategy" className="px-6 py-3 border border-black/10 text-black/40 text-[12px] font-medium rounded-full hover:border-black/25 hover:text-black/60 transition-all tracking-wide">
                  View Sample
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          METHODOLOGY — How the agent thinks
         ════════════════════════════════════════════════════ */}
      <section id="process" className="relative z-30 py-32 px-8 bg-[#f5f5f0]">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="mb-20">
              <p className="text-[10px] tracking-[0.4em] uppercase text-black/30 font-semibold mb-6">Methodology</p>
              <h2 className="text-5xl sm:text-7xl font-black text-[#191818] tracking-[-0.03em] leading-[0.95]">
                Engineered for<br /><span className="italic">analytical rigor</span>
              </h2>
            </div>
          </Reveal>

          <div className="space-y-0 border-t border-black/[0.06]">
            {[
              { n: "01", title: "Scope the engagement", desc: "The agent defines 5-8 research workstreams mirroring the structure of a senior analyst's first-week plan: company overview, leadership, market, competition, traction, financials, and risks." },
              { n: "02", title: "Primary and secondary research", desc: "20+ targeted web searches per engagement. Each finding is cross-referenced against multiple sources. Claims without corroboration are flagged, not fabricated." },
              { n: "03", title: "Verification layer", desc: "Executive team members are individually verified against LinkedIn. Funding rounds checked against Crunchbase and press coverage. Financial claims validated against SEC filings where available." },
              { n: "04", title: "Synthesis and recommendation", desc: "Research is synthesized into a 10-section structured report with quantified risk scores, competitive positioning, and a clear investment recommendation backed by evidence." },
            ].map((s, i) => (
              <Reveal key={s.n} delay={i * 120}>
                <div className="flex items-start gap-8 sm:gap-16 py-12 border-b border-black/[0.06] group cursor-default">
                  <span className="text-5xl sm:text-6xl font-black text-black/[0.06] tracking-[-0.04em] shrink-0 group-hover:text-[#d4ff51] transition-colors duration-500">{s.n}</span>
                  <div className="pt-2">
                    <h4 className="text-xl sm:text-2xl font-bold text-[#191818] mb-3 tracking-[-0.02em]">{s.title}</h4>
                    <p className="text-[15px] text-black/40 leading-relaxed max-w-xl">{s.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          WHY — Proof points
         ════════════════════════════════════════════════════ */}
      <section className="relative z-30 py-32 px-8 bg-white">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <p className="text-[10px] tracking-[0.4em] uppercase text-black/30 font-semibold mb-6">Why CIC</p>
            <h2 className="text-4xl sm:text-5xl font-black text-[#191818] tracking-[-0.03em] leading-[0.95] mb-16">
              The economics of<br />autonomous intelligence
            </h2>
          </Reveal>
          {/* Pricing cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-20">
            <Reveal delay={0}>
              <div className="border border-black/[0.06] rounded-2xl p-10 hover:border-black/[0.12] transition-all">
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-6xl font-black text-[#191818] tracking-[-0.04em]">$40</span>
                  <span className="text-lg text-black/25 font-medium">per report</span>
                </div>
                <h4 className="text-lg font-bold text-[#191818] mb-2">Investment Due Diligence</h4>
                <p className="text-[14px] text-black/35 leading-relaxed mb-6">10-section VC analysis with leadership verification, market sizing, risk matrix, and actionable recommendation.</p>
                <ul className="space-y-2 text-[13px] text-black/40">
                  <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-[#d4ff51]" />Company profile &amp; business model</li>
                  <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-[#d4ff51]" />LinkedIn-verified leadership audit</li>
                  <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-[#d4ff51]" />TAM / competitive / financial analysis</li>
                  <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-[#d4ff51]" />Risk matrix &amp; investment recommendation</li>
                  <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-[#d4ff51]" />XLSX + CSV + JSON download</li>
                </ul>
                <Link href="/dashboard" className="mt-8 inline-block px-6 py-3 bg-[#191818] text-white text-[12px] font-semibold rounded-full hover:shadow-lg transition-all tracking-wide">
                  Run Due Diligence
                </Link>
              </div>
            </Reveal>
            <Reveal delay={120}>
              <div className="border border-black/[0.06] rounded-2xl p-10 hover:border-black/[0.12] transition-all relative overflow-hidden">
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-6xl font-black text-[#191818] tracking-[-0.04em]">$5</span>
                  <span className="text-lg text-black/25 font-medium">per report</span>
                </div>
                <h4 className="text-lg font-bold text-[#191818] mb-2">Business Strategy Analysis</h4>
                <p className="text-[14px] text-black/35 leading-relaxed mb-6">12-framework strategic deep dive: market sizing, Porter&apos;s Five Forces, pricing strategy, GTM playbook, and executive synthesis.</p>
                <ul className="space-y-2 text-[13px] text-black/40">
                  <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-[#d4ff51]" />TAM/SAM/SOM &amp; customer segmentation</li>
                  <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-[#d4ff51]" />SWOT + Porter&apos;s Five Forces</li>
                  <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-[#d4ff51]" />Pricing, GTM &amp; market entry strategy</li>
                  <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-[#d4ff51]" />Unit economics &amp; financial modeling</li>
                  <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-[#d4ff51]" />Risk scenarios &amp; executive synthesis</li>
                </ul>
                <Link href="/dashboard?type=strategy" className="mt-8 inline-block px-6 py-3 bg-[#191818] text-white text-[12px] font-semibold rounded-full hover:shadow-lg transition-all tracking-wide">
                  Run Strategy Analysis
                </Link>
              </div>
            </Reveal>
          </div>

          {/* Proof points */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-16">
            <Reveal delay={0}>
              <div>
                <div className="text-5xl font-black text-[#191818] tracking-[-0.04em]">1000<span className="text-2xl">x</span></div>
                <div className="text-[11px] text-black/30 mt-2 uppercase tracking-[0.2em] font-medium">Cost reduction</div>
                <p className="text-[14px] text-black/35 mt-4 leading-relaxed">Traditional due diligence engagements run $50K-$500K. CIC delivers comparable analytical depth starting at $40.</p>
              </div>
            </Reveal>
            <Reveal delay={120}>
              <div>
                <div className="text-5xl font-black text-[#191818] tracking-[-0.04em]">5<span className="text-2xl">min</span></div>
                <div className="text-[11px] text-black/30 mt-2 uppercase tracking-[0.2em] font-medium">Average turnaround</div>
                <p className="text-[14px] text-black/35 mt-4 leading-relaxed">What takes a junior analyst 2-3 weeks of desk research is completed in minutes with full source transparency.</p>
              </div>
            </Reveal>
            <Reveal delay={240}>
              <div>
                <div className="text-5xl font-black text-[#191818] tracking-[-0.04em]">0</div>
                <div className="text-[11px] text-black/30 mt-2 uppercase tracking-[0.2em] font-medium">Hallucinated data</div>
                <p className="text-[14px] text-black/35 mt-4 leading-relaxed">Every claim is sourced. Unverifiable data is explicitly marked. The agent declares what it does not know.</p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          CTA — Full-width, dramatic
         ════════════════════════════════════════════════════ */}
      <section className="relative z-30 py-40 px-8 bg-[#191818]">
        <Reveal>
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-[10px] tracking-[0.4em] uppercase text-white/20 font-semibold mb-8">Start now</p>
            <h2 className="text-5xl sm:text-8xl font-black text-[#f5f5f0] tracking-[-0.04em] leading-[0.9] mb-8">
              Intelligence<br />on <span className="italic">demand</span>
            </h2>
            <p className="text-lg text-white/30 mb-12 max-w-lg mx-auto leading-relaxed">
              Enter any company. Receive a structured, evidence-based analysis in minutes. No retainers. No minimums.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link href="/dashboard" className="inline-block px-10 py-5 bg-[#d4ff51] text-[#191818] font-bold rounded-full hover:shadow-[0_8px_40px_rgba(212,255,81,0.3)] transition-all duration-300 text-[14px] tracking-wide">
                Launch Platform
              </Link>
              <Link href="/dashboard?demo=true" className="inline-block px-10 py-5 border border-white/10 text-white/40 font-medium rounded-full hover:border-white/25 hover:text-white/60 transition-all duration-300 text-[14px] tracking-wide">
                Watch Demo
              </Link>
            </div>
            <p className="text-[11px] text-white/15 mt-8 tracking-wide">No signup required. Bring your own Anthropic API key.</p>
          </div>
        </Reveal>
      </section>

      {/* ════════════════════════════════════════════════════
          FOOTER — Minimal
         ════════════════════════════════════════════════════ */}
      <footer className="relative z-30 py-10 px-10 bg-[#191818] border-t border-white/[0.04]">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <span className="text-[10px] tracking-[0.25em] uppercase text-white/20 font-medium">Chicago Intelligence Company</span>
          <span className="text-[10px] text-white/15">Autonomous intelligence for strategic decisions</span>
        </div>
      </footer>
    </div>
  );
}
