import { useEffect, useRef } from "react";
import ReactDOMServer from "react-dom/server";
import { QRCodeSVG } from "qrcode.react";
import React from "react";

interface QRProduct {
  id: number;
  name: string;
  sku: string | null;
  serialNumber?: string;
  costCenter?: string;
  purchaseOrder?: string;
  warrantyExpiry?: string;
}

interface QRLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: QRProduct[];
  autoPrint?: boolean;
}

// Tamaño fijo: 62x62mm — rollo continuo 62mm
const LABEL = {
  width: "62mm",
  height: "62mm",
  qrSize: "28mm",
};

function generateQRSvg(url: string): string {
  return ReactDOMServer.renderToStaticMarkup(
    React.createElement(QRCodeSVG, { value: url, size: 200, level: "M" })
  );
}

function printLabels(products: QRProduct[]) {
  const printWindow = window.open("", "_blank", "width=400,height=600");
  if (!printWindow) return;

  const labelsHtml = products.map((p) => {
    // Si tiene serialNumber, apuntar a /serie/{serial}. Si no, a /producto/{id}
    const url = p.serialNumber
      ? `${window.location.origin}/serie/${encodeURIComponent(p.serialNumber)}`
      : `${window.location.origin}/producto/${p.id}`;
    const qrSvg = generateQRSvg(url);
    return `
      <div class="qr-label">
        <div class="qr-svg">${qrSvg}</div>
        <table>
          <tr><td class="lbl">S/N</td><td>${p.serialNumber || p.sku || "—"}</td></tr>
          <tr><td class="lbl">CC</td><td>${p.costCenter || "—"}</td></tr>
          <tr><td class="lbl">OC</td><td>${p.purchaseOrder || "—"}</td></tr>
          <tr><td class="lbl">Gtia</td><td>${p.warrantyExpiry || "—"}</td></tr>
        </table>
      </div>
    `;
  }).join("");

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Etiquetas QR</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: white; }
        @page {
          size: ${LABEL.width} ${LABEL.height};
          margin: 0;
        }
        .qr-label {
          width: ${LABEL.width};
          height: ${LABEL.height};
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1mm;
          padding: 2mm;
          page-break-after: always;
          background: white;
        }
        .qr-label:last-child {
          page-break-after: avoid;
        }
        .qr-svg svg {
          width: ${LABEL.qrSize};
          height: ${LABEL.qrSize};
        }
        table {
          width: 56mm;
          border-collapse: collapse;
          margin-top: 1mm;
        }
        td {
          font-size: 6pt;
          font-family: Arial, sans-serif;
          color: black;
          padding: 0.3mm 1mm;
          border: 0.2mm solid #999;
        }
        td.lbl {
          font-weight: bold;
          width: 10mm;
          background: #eee;
          font-size: 5pt;
        }
      </style>
    </head>
    <body>${labelsHtml}</body>
    </html>
  `);
  printWindow.document.close();

  // SVG no necesita esperar carga — imprimir directo
  setTimeout(() => {
    printWindow.print();
    setTimeout(() => printWindow.close(), 1000);
  }, 200);
}

export { printLabels };
export type { QRProduct };

export default function QRLabelModal({ isOpen, onClose, products }: QRLabelModalProps) {
  const hasPrinted = useRef(false);

  useEffect(() => {
    if (isOpen && products.length > 0 && !hasPrinted.current) {
      hasPrinted.current = true;
      const timer = setTimeout(() => {
        printLabels(products);
        onClose();
      }, 100);
      return () => clearTimeout(timer);
    }
    if (!isOpen) {
      hasPrinted.current = false;
    }
  }, [isOpen, products, onClose]);

  return null;
}
