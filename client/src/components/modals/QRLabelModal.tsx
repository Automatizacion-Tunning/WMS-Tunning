import { useEffect, useRef } from "react";

interface QRProduct {
  id: number;
  name: string;
  sku: string | null;
}

interface QRLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: QRProduct[];
  autoPrint?: boolean;
}

// Tamaño fijo: Mediano 62x50mm — rollo continuo 62mm
const LABEL = {
  width: "62mm",
  height: "50mm",
  qrSize: "28mm",
  skuFont: "10pt",
  nameFont: "6pt",
  padding: "3mm 2mm",
};

function printLabels(products: QRProduct[]) {
  const printWindow = window.open("", "_blank", "width=400,height=600");
  if (!printWindow) return;

  const labelsHtml = products.map((p) => {
    const url = `${window.location.origin}/producto/${p.id}`;
    const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;
    return `
      <div class="qr-label">
        <img src="${qrImgUrl}" alt="QR" />
        <p class="qr-sku">${p.sku || "Sin SKU"}</p>
        <p class="qr-name">${p.name}</p>
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
          padding: ${LABEL.padding};
          page-break-after: always;
          background: white;
        }
        .qr-label:last-child {
          page-break-after: avoid;
        }
        .qr-label img {
          width: ${LABEL.qrSize};
          height: ${LABEL.qrSize};
        }
        .qr-sku {
          font-size: ${LABEL.skuFont};
          font-weight: bold;
          font-family: monospace;
          color: black;
          margin-top: 1mm;
        }
        .qr-name {
          font-size: ${LABEL.nameFont};
          color: black;
          text-align: center;
          max-width: calc(${LABEL.width} - 4mm);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      </style>
    </head>
    <body>${labelsHtml}</body>
    </html>
  `);
  printWindow.document.close();

  const images = printWindow.document.querySelectorAll("img");
  let loaded = 0;
  const total = images.length;

  const tryPrint = () => {
    loaded++;
    if (loaded >= total) {
      setTimeout(() => {
        printWindow.print();
        // Cerrar ventana después de imprimir
        setTimeout(() => printWindow.close(), 1000);
      }, 300);
    }
  };

  images.forEach((img) => {
    if (img.complete) {
      tryPrint();
    } else {
      img.onload = tryPrint;
      img.onerror = tryPrint;
    }
  });

  if (total === 0) {
    setTimeout(() => { printWindow.print(); setTimeout(() => printWindow.close(), 1000); }, 300);
  }
}

export { printLabels };

export default function QRLabelModal({ isOpen, onClose, products, autoPrint = false }: QRLabelModalProps) {
  const hasPrinted = useRef(false);

  useEffect(() => {
    if (isOpen && products.length > 0 && !hasPrinted.current) {
      hasPrinted.current = true;
      // Imprimir directo sin mostrar modal
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

  // No renderiza nada — impresión directa
  return null;
}
