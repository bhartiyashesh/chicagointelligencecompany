"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

// ─── Chicago iconic landmark positions ──────────────────
const LANDMARKS = [
  { name: "Willis Tower",        lng: -87.6359, lat: 41.8789, bearing: -25, zoom: 16.5, pitch: 65 },
  { name: "Millennium Park",     lng: -87.6228, lat: 41.8827, bearing: -40, zoom: 16.0, pitch: 60 },
  { name: "Navy Pier",           lng: -87.6065, lat: 41.8917, bearing: 30,  zoom: 15.8, pitch: 55 },
  { name: "Magnificent Mile",    lng: -87.6245, lat: 41.8950, bearing: -60, zoom: 16.2, pitch: 62 },
  { name: "The Loop",            lng: -87.6298, lat: 41.8819, bearing: 15,  zoom: 16.3, pitch: 64 },
  { name: "River North",         lng: -87.6345, lat: 41.8912, bearing: -50, zoom: 16.0, pitch: 58 },
  { name: "Grant Park",          lng: -87.6194, lat: 41.8756, bearing: 45,  zoom: 15.5, pitch: 55 },
  { name: "Wacker Drive",        lng: -87.6367, lat: 41.8868, bearing: -15, zoom: 16.4, pitch: 66 },
];

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

// ─── useScrollReveal hook ───────────────────────────────
function useScrollReveal(threshold = 0.15) {
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

// ─── ScrollReveal wrapper ───────────────────────────────
function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useScrollReveal(0.12);
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

// ─── 3D Map Hero ────────────────────────────────────────
function ChicagoMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const animationRef = useRef<number>(0);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [landmarkName, setLandmarkName] = useState("");

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Pick random landmark on each load
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
      try {
        m.setConfigProperty("basemap", "lightPreset", "night");
        m.setConfigProperty("basemap", "showPlaceLabels", false);
        m.setConfigProperty("basemap", "showPointOfInterestLabels", false);
        m.setConfigProperty("basemap", "showTransitLabels", false);
        m.setConfigProperty("basemap", "showRoadLabels", false);
      } catch { /* fallback */ }

      m.setFog({
        color: "rgb(10, 15, 26)",
        "high-color": "rgb(15, 25, 45)",
        "horizon-blend": 0.06,
        "star-intensity": 0.15,
        "space-color": "rgb(8, 12, 22)",
      });

      setMapLoaded(true);

      // Slow orbit
      let bearing = landmark.bearing;
      const rotateCamera = () => {
        bearing += 0.007;
        m.rotateTo(bearing % 360, { duration: 0 });
        animationRef.current = requestAnimationFrame(rotateCamera);
      };
      rotateCamera();
    });

    // ── Scroll-driven parallax: zoom out + reduce pitch as user scrolls ──
    const handleScroll = () => {
      if (!m) return;
      const scrollY = window.scrollY;
      const vh = window.innerHeight;
      const progress = Math.min(scrollY / vh, 1); // 0 at top, 1 at 1 viewport scroll
      const targetZoom = landmark.zoom - progress * 1.5;
      const targetPitch = landmark.pitch - progress * 20;
      m.jumpTo({ zoom: targetZoom, pitch: Math.max(targetPitch, 30) });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(animationRef.current);
      map.current?.remove();
      map.current = null;
    };
  }, []);

  return (
    <>
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" style={{ minHeight: "100vh" }} />
      {/* Overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0f1a]/70 via-[#0a0f1a]/30 to-[#0a0f1a]/90 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0a0f1a]/60 via-transparent to-[#0a0f1a]/40 pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{
        backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(212,255,81,0.1) 2px, rgba(212,255,81,0.1) 3px)",
      }} />
      {/* Landmark label */}
      {mapLoaded && landmarkName && (
        <div className="absolute top-20 left-8 z-40 flex items-center gap-2 animate-fade-in">
          <div className="w-1.5 h-1.5 rounded-full bg-accent/60 animate-ping" />
          <span className="text-[9px] tracking-[0.3em] uppercase text-white/30 font-medium">
            {landmarkName}
          </span>
        </div>
      )}
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0a0f1a]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-accent animate-ping" />
            <span className="text-[10px] text-white/30 tracking-widest uppercase">Loading Chicago</span>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Animated counter ───────────────────────────────────
function AnimatedStat({ value, suffix, label, delay = 0 }: { value: number; suffix: string; label: string; delay?: number }) {
  const [count, setCount] = useState(0);
  const { ref, visible } = useScrollReveal(0.3);

  useEffect(() => {
    if (!visible) return;
    const timeout = setTimeout(() => {
      const steps = 40;
      const increment = value / steps;
      let current = 0;
      const timer = setInterval(() => {
        current += increment;
        if (current >= value) { setCount(value); clearInterval(timer); }
        else setCount(Math.floor(current));
      }, 1500 / steps);
      return () => clearInterval(timer);
    }, delay);
    return () => clearTimeout(timeout);
  }, [visible, value, delay]);

  return (
    <div ref={ref} className={`text-center transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`} style={{ transitionDelay: `${delay}ms` }}>
      <div className="text-4xl sm:text-5xl font-light text-accent">
        {count}<span className="text-2xl">{suffix}</span>
      </div>
      <div className="text-xs text-text-dim mt-2 uppercase tracking-[0.2em]">{label}</div>
    </div>
  );
}

// ─── Feature Card ───────────────────────────────────────
function FeatureCard({ icon, title, description, delay = 0 }: { icon: React.ReactNode; title: string; description: string; delay?: number }) {
  return (
    <Reveal delay={delay}>
      <div className="rounded-xl p-6 border border-white/[0.06] bg-[#0a0f1a]/60 backdrop-blur-xl hover:border-accent/20 hover:bg-[#0a0f1a]/80 transition-all duration-300 group cursor-pointer h-full">
        <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 group-hover:scale-110 transition-all duration-300">
          {icon}
        </div>
        <h3 className="text-sm font-semibold text-text-primary mb-2">{title}</h3>
        <p className="text-[13px] text-text-dim leading-relaxed">{description}</p>
      </div>
    </Reveal>
  );
}

// ─── Step ───────────────────────────────────────────────
function Step({ number, title, description, delay = 0 }: { number: string; title: string; description: string; delay?: number }) {
  return (
    <Reveal delay={delay}>
      <div className="flex gap-5">
        <div className="shrink-0 w-10 h-10 rounded-full border border-accent/30 flex items-center justify-center">
          <span className="text-sm font-mono text-accent">{number}</span>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-text-primary mb-1">{title}</h4>
          <p className="text-[13px] text-text-dim leading-relaxed">{description}</p>
        </div>
      </div>
    </Reveal>
  );
}

// ─── Pixel Logo ─────────────────────────────────────────
// Black block bounces, CIC pixel art inside, then full name types out in pixel font
function PixelLogo() {
  const [phase, setPhase] = useState<"bounce" | "reveal" | "type" | "done">("bounce");
  const [typedChars, setTypedChars] = useState(0);
  const fullName = "CHICAGO INTELLIGENCE COMPANY";

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("reveal"), 800);
    const t2 = setTimeout(() => setPhase("type"), 1800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // Typewriter for the full name
  useEffect(() => {
    if (phase !== "type") return;
    if (typedChars >= fullName.length) { setPhase("done"); return; }
    const t = setTimeout(() => setTypedChars((c) => c + 1), 25);
    return () => clearTimeout(t);
  }, [phase, typedChars, fullName.length]);

  // 5x7 pixel font bitmaps for C, I, C
  const C1: [number, number][] = [[0,0],[1,0],[2,0],[3,0],[0,1],[0,2],[0,3],[0,4],[0,5],[1,6],[2,6],[3,6]];
  const I:  [number, number][] = [[0,0],[1,0],[2,0],[1,1],[1,2],[1,3],[1,4],[1,5],[0,6],[1,6],[2,6]];
  const C2: [number, number][] = [[0,0],[1,0],[2,0],[3,0],[0,1],[0,2],[0,3],[0,4],[0,5],[1,6],[2,6],[3,6]];

  const renderLetter = (pixels: [number, number][], offsetX: number, baseDelay: number) =>
    pixels.map(([x, y], i) => (
      <div
        key={`${offsetX}-${x}-${y}`}
        className="absolute pixel-cell"
        style={{
          left: `${(offsetX + x) * 3}px`,
          top: `${y * 3}px`,
          width: "2.5px",
          height: "2.5px",
          backgroundColor: "#d4ff51",
          animationDelay: `${baseDelay + i * 30}ms`,
          borderRadius: "0.5px",
        }}
      />
    ));

  return (
    <div className="flex items-center cursor-pointer group">
      <span
        className="font-semibold uppercase group-hover:text-accent transition-colors"
        style={{
          fontFamily: '"Silkscreen", "Press Start 2P", "Courier New", monospace',
          fontSize: "12px",
          letterSpacing: "0.18em",
          color: phase === "done" ? "#c8d6e5" : "#d4ff51",
          textShadow: phase !== "done" ? "0 0 8px rgba(212,255,81,0.4)" : "none",
          transition: "color 0.5s, text-shadow 0.5s",
          imageRendering: "pixelated",
        }}
      >
        {phase === "bounce" ? "" : fullName.slice(0, phase === "done" ? fullName.length : typedChars)}
        {phase === "type" && <span className="animate-pulse text-accent">_</span>}
      </span>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────
export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="min-h-screen relative bg-[#0a0f1a]">
      {/* Global scroll-driven style */}
      <style jsx global>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fade-in 1s ease-out forwards; }
        @keyframes logo-bounce {
          0% { transform: translateY(-30px) scale(0.8); opacity: 0; }
          40% { transform: translateY(4px) scale(1.05); opacity: 1; }
          60% { transform: translateY(-2px) scale(0.98); }
          80% { transform: translateY(1px) scale(1.01); }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes pixel-reveal {
          0% { opacity: 0; transform: scale(0); }
          60% { opacity: 1; transform: scale(1.15); }
          100% { opacity: 1; transform: scale(1); }
        }
        .logo-bounce { animation: logo-bounce 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .pixel-cell { animation: pixel-reveal 0.15s ease-out forwards; opacity: 0; }
      `}</style>

      {/* ═══ HERO ═══ */}
      <section className="relative h-screen overflow-hidden">
        <ChicagoMap />

        <nav className="absolute top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-8 bg-[#0a0f1a]/40 backdrop-blur-md border-b border-white/[0.06]">
          <PixelLogo />
          <div className="flex items-center gap-6">
            <a href="#features" className="text-[11px] tracking-[0.15em] uppercase text-text-dim hover:text-accent transition-colors hidden sm:block">Features</a>
            <a href="#how-it-works" className="text-[11px] tracking-[0.15em] uppercase text-text-dim hover:text-accent transition-colors hidden sm:block">Process</a>
            <a href="#report" className="text-[11px] tracking-[0.15em] uppercase text-text-dim hover:text-accent transition-colors hidden sm:block">Output</a>
            <Link href="/dashboard" className="px-4 py-1.5 rounded-lg bg-accent text-bg-primary text-[11px] font-semibold tracking-wider uppercase hover:shadow-[0_0_20px_rgba(212,255,81,0.3)] transition-all duration-200">
              Launch Platform
            </Link>
          </div>
        </nav>

        <div className={`absolute inset-0 flex items-center justify-center z-10 px-6 transition-all duration-1000 delay-500 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <div className="max-w-4xl text-center">
            <div className="inline-flex items-center gap-3 mb-8">
              <div className="w-2 h-2 rounded-full bg-accent animate-dot-pulse" />
              <span className="text-[11px] font-medium tracking-[0.3em] uppercase text-white/60">Autonomous Intelligence — Chicago, IL</span>
              <div className="w-2 h-2 rounded-full bg-accent animate-dot-pulse" />
            </div>
            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-light tracking-tight text-white leading-[1.05] mb-6">
              AI that performs<br />
              <span className="text-accent font-normal">due diligence</span><br />
              <span className="text-white/80">like a senior analyst</span>
            </h1>
            <p className="text-lg sm:text-xl text-white/50 font-light max-w-2xl mx-auto mb-10 leading-relaxed">
              Enter a company name. Our autonomous agent researches across multiple
              dimensions, verifies data, and produces a structured investment report in minutes.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link href="/dashboard" className="px-8 py-3.5 bg-accent text-[#0a0f1a] font-semibold rounded-lg hover:shadow-[0_0_40px_rgba(212,255,81,0.4)] transition-all duration-300 text-sm tracking-wide">
                Start Analysis
              </Link>
              <Link href="/dashboard?demo=true" className="px-8 py-3.5 border border-white/15 text-white/70 rounded-lg hover:border-accent/40 hover:text-accent backdrop-blur-sm transition-all duration-300 text-sm tracking-wide">
                Watch Demo
              </Link>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0a0f1a] to-transparent z-20 pointer-events-none" />
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2 animate-bounce">
          <span className="text-[9px] uppercase tracking-[0.3em] text-white/30">Scroll</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/30"><path d="M12 5v14M5 12l7 7 7-7" /></svg>
        </div>
      </section>

      {/* ═══ STATS ═══ */}
      <section className="relative z-30 py-16 px-6 border-y border-white/[0.06] bg-[#0a0f1a]">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8">
          <AnimatedStat value={10} suffix="" label="Report Sections" delay={0} />
          <AnimatedStat value={20} suffix="+" label="Web Searches" delay={100} />
          <AnimatedStat value={8} suffix="" label="Research Tasks" delay={200} />
          <AnimatedStat value={3} suffix="" label="Output Formats" delay={300} />
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section id="features" className="relative z-30 py-20 px-6 bg-[#0a0f1a]">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="text-center mb-14">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="w-8 h-px bg-accent/40" />
                <span className="text-[10px] font-medium tracking-[0.3em] uppercase text-text-dim">Capabilities</span>
                <div className="w-8 h-px bg-accent/40" />
              </div>
              <h2 className="text-3xl font-light text-text-primary">
                Comprehensive <span className="text-accent font-normal">analysis engine</span>
              </h2>
            </div>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FeatureCard delay={0}   icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-accent"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>} title="Autonomous Web Research" description="The agent searches across multiple data sources, cross-references claims, and builds a comprehensive picture without human intervention." />
            <FeatureCard delay={100} icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-accent"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4-4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>} title="LinkedIn Team Verification" description="Each executive is searched and verified against LinkedIn profiles. Unverified claims are flagged — no fabricated data, ever." />
            <FeatureCard delay={200} icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-accent"><path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z"/><path d="M14 2v6h6"/></svg>} title="Structured Report Output" description="10-section investment report delivered as XLSX, CSV, and JSON. Formatted for immediate use in investment committee decks." />
            <FeatureCard delay={300} icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-accent"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>} title="Risk Assessment Matrix" description="Systematic evaluation of key person dependency, market risks, competitive threats, and technology disruption with severity ratings." />
            <FeatureCard delay={400} icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-accent"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>} title="Pitch Deck Analysis" description="Upload a pitch deck alongside the company name. The agent cross-references pitch claims against publicly available data." />
            <FeatureCard delay={500} icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-accent"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>} title="Real-time Dashboard" description="Watch the agent work in real-time. See every web search, every research file, every task completion as it happens." />
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section id="how-it-works" className="relative z-30 py-20 px-6 border-t border-white/[0.06] bg-[#0a0f1a]">
        <div className="max-w-3xl mx-auto">
          <Reveal>
            <div className="text-center mb-14">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="w-8 h-px bg-accent/40" />
                <span className="text-[10px] font-medium tracking-[0.3em] uppercase text-text-dim">Process</span>
                <div className="w-8 h-px bg-accent/40" />
              </div>
              <h2 className="text-3xl font-light text-text-primary">How the <span className="text-accent font-normal">agent works</span></h2>
            </div>
          </Reveal>
          <div className="space-y-6">
            <Step delay={0}   number="01" title="You enter a company name" description="Type the target company. Optionally upload a pitch deck, sales deck, or financial document for cross-referencing." />
            <Reveal delay={50}><div className="ml-5 w-px h-6 bg-white/10" /></Reveal>
            <Step delay={150} number="02" title="Agent creates a research plan" description="The AI analyst generates 5-8 research objectives covering company overview, leadership, market size, competitors, traction, financials, and risks." />
            <Reveal delay={200}><div className="ml-5 w-px h-6 bg-white/10" /></Reveal>
            <Step delay={300} number="03" title="Autonomous deep research" description="For each task, the agent conducts web searches, verifies team members on LinkedIn, analyzes market data, and saves findings to a structured scratchpad." />
            <Reveal delay={350}><div className="ml-5 w-px h-6 bg-white/10" /></Reveal>
            <Step delay={450} number="04" title="Investment report delivered" description="A 10-section VC analysis report is compiled with a clear recommendation (BUY / LEAN BUY / PASS) and downloadable as XLSX, CSV, and JSON." />
          </div>
        </div>
      </section>

      {/* ═══ REPORT PREVIEW ═══ */}
      <section id="report" className="relative z-30 py-20 px-6 border-t border-white/[0.06] bg-[#0a0f1a]">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="text-center mb-14">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="w-8 h-px bg-accent/40" />
                <span className="text-[10px] font-medium tracking-[0.3em] uppercase text-text-dim">Output</span>
                <div className="w-8 h-px bg-accent/40" />
              </div>
              <h2 className="text-3xl font-light text-text-primary">10-section <span className="text-accent font-normal">investment report</span></h2>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <div className="rounded-xl p-8 grid grid-cols-2 md:grid-cols-5 gap-3 border border-white/[0.06] bg-[#0a0f1a]/60 backdrop-blur-xl">
              {[
                "Executive Summary", "Leadership Team", "Market Analysis",
                "Product & Positioning", "Traction Metrics", "Competitive Landscape",
                "Financial Analysis", "Risk Assessment", "Investment Recommendation", "Download All",
              ].map((section, i) => (
                <div key={section} className={`px-3 py-3 rounded-lg border text-center text-[11px] font-medium tracking-wide transition-all duration-300 cursor-pointer hover:scale-[1.03] ${
                  i === 9
                    ? "border-accent/40 text-accent bg-accent/5 hover:bg-accent/10"
                    : "border-white/[0.06] text-text-dim hover:border-accent/20 hover:text-text-secondary"
                }`}>
                  {section}
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="relative z-30 py-24 px-6 border-t border-white/[0.06] bg-[#0a0f1a]">
        <Reveal>
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-light text-text-primary mb-4">Ready to <span className="text-accent font-normal">analyze?</span></h2>
            <p className="text-text-dim mb-8">Enter any company. Get a structured VC analysis in minutes.</p>
            <Link href="/dashboard" className="inline-block px-10 py-4 bg-accent text-[#0a0f1a] font-semibold rounded-lg hover:shadow-[0_0_40px_rgba(212,255,81,0.4)] transition-all duration-300 text-sm tracking-wide">
              Launch Platform
            </Link>
            <p className="text-[11px] text-text-dim mt-4">No signup required. Bring your own Anthropic API key.</p>
          </div>
        </Reveal>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="relative z-30 py-8 px-6 border-t border-white/[0.06] bg-[#0a0f1a]">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1 h-3 bg-accent rounded-full" />
            <span className="text-[10px] tracking-[0.2em] uppercase text-text-dim">Chicago Intelligence Company</span>
          </div>
          <span className="text-[10px] text-text-dim">AI-powered due diligence</span>
        </div>
      </footer>
      <div className="accent-line relative z-30" />
    </div>
  );
}
