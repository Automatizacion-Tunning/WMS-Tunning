import { QRCodeSVG } from "qrcode.react";

interface QRLabelProps {
  productId: number;
  productName: string;
  sku: string | null;
}

export default function QRLabel({ productId, productName, sku }: QRLabelProps) {
  const url = `${window.location.origin}/producto/${productId}`;

  return (
    <div className="qr-label flex flex-col items-center gap-2 p-4">
      <QRCodeSVG value={url} size={150} level="M" />
      <p className="qr-sku text-sm font-bold font-mono">{sku || "Sin SKU"}</p>
      <p className="qr-name text-xs text-muted-foreground text-center line-clamp-2">
        {productName}
      </p>
    </div>
  );
}
