export const businessConfig = {
  storeName: process.env.NEXT_PUBLIC_STORE_NAME || "Demo Jewellery",
  whatsappNumber: (process.env.NEXT_PUBLIC_STORE_WHATSAPP || "").replace(/\D/g, ""),
  currency: process.env.NEXT_PUBLIC_CURRENCY || "INR",
  inactivitySeconds: Number(process.env.NEXT_PUBLIC_INACTIVITY_SECONDS || 120),
};

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: businessConfig.currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function buildWhatsAppUrl(productName: string, sku: string) {
  const message = encodeURIComponent(
    `Hi, I tried ${productName} on the Virtual Jewellery Mirror. Product code: ${sku}. I am interested in this product. Please share more details.`
  );

  const phone = businessConfig.whatsappNumber;
  return phone ? `https://wa.me/${phone}?text=${message}` : `https://wa.me/?text=${message}`;
}
