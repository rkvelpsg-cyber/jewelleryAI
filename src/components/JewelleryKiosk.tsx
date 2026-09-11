"use client";

import { useEffect, useMemo, useState } from "react";
import { Gem, Heart, MessageCircle, QrCode, RotateCcw, Sparkles, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { jewelleryProducts } from "@/data/jewellery";
import { buildWhatsAppUrl, businessConfig, formatCurrency } from "@/lib/config";
import type { JewelleryProduct, JewelleryType } from "@/types";
import FullscreenButton from "./FullscreenButton";
import JewelleryMirror from "./JewelleryMirror";

type Screen = "welcome" | "mirror";

const categories: { type: JewelleryType; label: string }[] = [
  { type: "necklace", label: "Necklaces" },
  { type: "choker", label: "Chokers" },
  { type: "earrings", label: "Earrings" },
];

export default function JewelleryKiosk() {
  const products = jewelleryProducts.filter((p) => p.active);
  const [screen, setScreen] = useState<Screen>("welcome");
  const [category, setCategory] = useState<JewelleryType>("necklace");
  const [selectedId, setSelectedId] = useState(products[0]?.id || "");
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [showShare, setShowShare] = useState(false);

  const categoryProducts = useMemo(() => products.filter((p) => p.type === category), [category, products]);
  const selected = products.find((p) => p.id === selectedId) || categoryProducts[0] || products[0];

  useEffect(() => {
    if (!categoryProducts.some((p) => p.id === selectedId) && categoryProducts[0]) {
      setSelectedId(categoryProducts[0].id);
    }
  }, [category, categoryProducts, selectedId]);

  useEffect(() => {
    if (screen !== "mirror") return;
    const reset = () => {
      window.clearTimeout((window as unknown as { __lotusIdle?: number }).__lotusIdle);
      (window as unknown as { __lotusIdle?: number }).__lotusIdle = window.setTimeout(() => {
        setScreen("welcome");
        setSnapshot(null);
        setShowShare(false);
      }, businessConfig.inactivitySeconds * 1000);
    };
    ["pointerdown", "mousemove", "keydown", "touchstart"].forEach((event) => window.addEventListener(event, reset, { passive: true }));
    reset();
    return () => {
      ["pointerdown", "mousemove", "keydown", "touchstart"].forEach((event) => window.removeEventListener(event, reset));
      window.clearTimeout((window as unknown as { __lotusIdle?: number }).__lotusIdle);
    };
  }, [screen]);

  const start = () => setScreen("mirror");
  const shareUrl = typeof window !== "undefined" ? window.location.href : "https://example.com";

  if (!selected) return <main className="app"><p>No active jewellery products found.</p></main>;

  return (
    <main className="app">
      <header className="topbar">
        <div className="brandBlock">
          <div className="lotusMark"><Gem size={22} /></div>
          <div>
            <div className="brandName">LOTUS PRIME</div>
            <div className="brandSub">AI JEWELLERY MIRROR</div>
          </div>
        </div>
        <div className="topbarRight">
          <span className="storeName">{businessConfig.storeName}</span>
          <FullscreenButton />
        </div>
      </header>

      {screen === "welcome" ? (
        <section className="welcomeScreen">
          <div className="welcomeGlow" />
          <div className="welcomeCard">
            <div className="eyebrow"><Sparkles size={16} /> LIVE VIRTUAL TRY-ON</div>
            <h1>See the jewellery.<br /><span>See it on you.</span></h1>
            <p>Try necklaces, chokers and earrings instantly using our live AI/AR mirror.</p>
            <button className="heroButton" onClick={start}>Start Virtual Try-On <span>→</span></button>
            <div className="welcomeFeatures">
              <span>Live camera mirror</span><span>Instant switching</span><span>No app download</span>
            </div>
          </div>
        </section>
      ) : (
        <section className="kioskGrid">
          <aside className="catalogPanel">
            <div className="panelTitle">Choose Jewellery</div>
            <div className="categoryTabs">
              {categories.map((item) => (
                <button key={item.type} className={category === item.type ? "categoryTab active" : "categoryTab"} onClick={() => setCategory(item.type)}>{item.label}</button>
              ))}
            </div>
            <div className="productList">
              {categoryProducts.map((product) => (
                <button key={product.id} className={selected.id === product.id ? "productCard active" : "productCard"} onClick={() => setSelectedId(product.id)}>
                  <div className="productThumb"><img src={product.imageUrl} alt="" /></div>
                  <div className="productCardText"><strong>{product.name}</strong><span>{product.sku}</span><b>{formatCurrency(product.price ?? 0)}</b></div>
                </button>
              ))}
            </div>
            <button className="resetButton" onClick={() => setScreen("welcome")}><RotateCcw size={18} /> Start Again</button>
          </aside>

          <section className="mirrorPanel">
            <JewelleryMirror product={selected} onSnapshot={(data) => { setSnapshot(data); setShowShare(true); }} />
          </section>

          <aside className="detailPanel">
            <div className="detailType">{selected.type.toUpperCase()}</div>
            <h2>{selected.name}</h2>
            <div className="detailSku">SKU {selected.sku}</div>
            <div className="price">{formatCurrency(selected.price ?? 0)}</div>
            <div className="specGrid">
              {selected.purity && <div><span>Purity</span><strong>{selected.purity}</strong></div>}
              {selected.weight && <div><span>Weight</span><strong>{selected.weight}</strong></div>}
            </div>
            <div className="infoNote">Virtual preview for style visualization. Actual appearance and scale can vary slightly.</div>
            <button className="whatsappButton" onClick={() => window.open(buildWhatsAppUrl(selected.name, selected.sku), "_blank", "noopener,noreferrer")}><MessageCircle size={20} /> WhatsApp Store</button>
            <button className="shareButton" onClick={() => setShowShare(true)}><QrCode size={20} /> Scan / Save Look</button>
            <div className="poweredBy"><Sparkles size={15} /> Powered by Lotus Prime Digital Solutions</div>
          </aside>
        </section>
      )}

      {showShare && (
        <div className="modalBackdrop" onClick={() => setShowShare(false)}>
          <div className="shareModal" onClick={(e) => e.stopPropagation()}>
            <button className="modalClose" onClick={() => setShowShare(false)}><X /></button>
            <div className="modalIcon"><Heart /></div>
            <h3>Take this look with you</h3>
            <p>{selected.name} · {selected.sku}</p>
            {snapshot && <img className="snapshotPreview" src={snapshot} alt="Saved virtual jewellery look" />}
            <div className="qrWrap"><QRCodeSVG value={shareUrl} size={150} bgColor="#fff" fgColor="#111" /></div>
            <small>Scan the QR code or send an enquiry on WhatsApp.</small>
            <button className="whatsappButton wide" onClick={() => window.open(buildWhatsAppUrl(selected.name, selected.sku), "_blank", "noopener,noreferrer")}><MessageCircle size={20} /> Enquire on WhatsApp</button>
          </div>
        </div>
      )}
    </main>
  );
}
