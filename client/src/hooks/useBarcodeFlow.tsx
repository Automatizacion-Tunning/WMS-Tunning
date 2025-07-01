import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Product } from "@shared/schema";

type BarcodeFlowState = 
  | "idle"
  | "scanning" 
  | "searching"
  | "product-found"
  | "product-not-found"
  | "creating-new"
  | "associating-existing";

interface UseBarcodeFlowReturn {
  state: BarcodeFlowState;
  barcode: string | null;
  product: Product | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  startScanning: () => void;
  handleBarcodeScanned: (barcode: string) => void;
  handleCreateNew: () => void;
  handleAssociateExisting: () => void;
  handleProductCreated: (product: Product) => void;
  handleProductAssociated: (product: Product) => void;
  handleCancel: () => void;
  reset: () => void;
}

export function useBarcodeFlow(): UseBarcodeFlowReturn {
  const [state, setState] = useState<BarcodeFlowState>("idle");
  const [barcode, setBarcode] = useState<string | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Query para buscar producto por código de barras
  const { isLoading: isSearching, error: queryError } = useQuery({
    queryKey: ["/api/products", "barcode", barcode],
    queryFn: async () => {
      console.log("🔍 Buscando producto con código:", barcode);
      const response = await fetch(`/api/products?barcode=${encodeURIComponent(barcode!)}`);
      
      console.log("📡 Respuesta del servidor:", response.status);
      
      if (response.status === 404) {
        console.log("❌ Producto no encontrado");
        setState("product-not-found");
        return null;
      }
      
      if (!response.ok) {
        throw new Error('Error al buscar producto');
      }
      
      const product = await response.json();
      console.log("✅ Producto encontrado:", product);
      setProduct(product);
      setState("product-found");
      return product;
    },
    enabled: !!barcode && state === "searching",
    retry: false,
    staleTime: 0, // No usar caché para búsquedas de códigos de barras
  });

  const startScanning = useCallback(() => {
    setState("scanning");
    setError(null);
    setBarcode(null);
    setProduct(null);
  }, []);

  const handleBarcodeScanned = useCallback((scannedBarcode: string) => {
    console.log("📱 Código escaneado recibido:", scannedBarcode);
    setBarcode(scannedBarcode);
    setState("searching");
    setError(null);
    setProduct(null);
  }, []);

  const handleCreateNew = useCallback(() => {
    setState("creating-new");
  }, []);

  const handleAssociateExisting = useCallback(() => {
    setState("associating-existing");
  }, []);

  const handleProductCreated = useCallback((newProduct: Product) => {
    setProduct(newProduct);
    setState("product-found");
  }, []);

  const handleProductAssociated = useCallback((associatedProduct: Product) => {
    setProduct(associatedProduct);
    setState("product-found");
  }, []);

  const handleCancel = useCallback(() => {
    setState("idle");
    setBarcode(null);
    setProduct(null);
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setState("idle");
    setBarcode(null);
    setProduct(null);
    setError(null);
  }, []);

  return {
    state,
    barcode,
    product,
    isLoading: isSearching,
    error,
    
    startScanning,
    handleBarcodeScanned,
    handleCreateNew,
    handleAssociateExisting,
    handleProductCreated,
    handleProductAssociated,
    handleCancel,
    reset,
  };
}