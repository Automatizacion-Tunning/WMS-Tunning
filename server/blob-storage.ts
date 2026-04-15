import { BlobServiceClient, ContainerClient, BlobSASPermissions, generateBlobSASQueryParameters, StorageSharedKeyCredential } from '@azure/storage-blob';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

// Configuración de Azure Blob Storage
const connectionString = process.env.Azure_Key_Cadena;
const containerName = 'innovaoper-inventario';

if (!connectionString) {
  console.warn('⚠️ Azure Blob Storage: Azure_Key_Cadena no está configurada');
}

let blobServiceClient: BlobServiceClient | null = null;
let containerClient: ContainerClient | null = null;
let sharedKeyCredential: StorageSharedKeyCredential | null = null;
let accountName: string | null = null;

function parseConnectionString(connString: string): { accountName: string; accountKey: string } {
  const parts = connString.split(';');
  let name = '';
  let key = '';
  for (const part of parts) {
    if (part.startsWith('AccountName=')) name = part.substring('AccountName='.length);
    else if (part.startsWith('AccountKey=')) key = part.substring('AccountKey='.length);
  }
  if (!name || !key) throw new Error('Connection string inválido: falta AccountName o AccountKey');
  return { accountName: name, accountKey: key };
}

function initializeBlobClient(): ContainerClient {
  if (!connectionString) throw new Error('Azure_Key_Cadena no está configurada');
  if (!blobServiceClient) {
    blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const { accountName: name, accountKey } = parseConnectionString(connectionString);
    accountName = name;
    sharedKeyCredential = new StorageSharedKeyCredential(name, accountKey);
  }
  if (!containerClient) {
    containerClient = blobServiceClient.getContainerClient(containerName);
  }
  return containerClient;
}

export const ALLOWED_FILE_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'text/plain': 'txt',
  'application/zip': 'zip',
};

export const MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1GB

export interface UploadedFile {
  id: string;
  originalName: string;
  blobName: string;
  url: string;
  contentType: string;
  size: number;
  uploadedAt: Date;
  category?: string;
  entityType?: string;
  entityId?: string | number;
  description?: string;
}

export interface FileMetadata {
  originalName: string;
  contentType: string;
  size: number;
  category?: string;
  entityType?: string;
  entityId?: string;
  uploadedAt: string;
  uploadedBy?: string;
  description?: string;
}

/**
 * Sube un archivo a Azure Blob Storage
 * Estructura de carpetas para WMS:
 * - productos/{productId}/{yyyy-MM}/archivo
 * - ordenes-compra/{ocNumber}/archivo
 * - bodegas/{warehouseId}/{yyyy-MM}/archivo
 * - general/{yyyy-MM}/archivo
 */
export async function uploadFile(
  buffer: Buffer,
  originalName: string,
  contentType: string,
  options?: {
    category?: string;
    entityType?: string;
    entityId?: string | number;
    uploadedBy?: string;
    description?: string;
  }
): Promise<UploadedFile> {
  const container = initializeBlobClient();

  if (!ALLOWED_FILE_TYPES[contentType]) {
    throw new Error(`Tipo de archivo no permitido: ${contentType}`);
  }
  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error(`El archivo excede el tamaño máximo de ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }

  const fileId = uuidv4();
  const extension = ALLOWED_FILE_TYPES[contentType];
  const uploadDate = new Date();
  const yearMonth = uploadDate.toISOString().substring(0, 7);
  const datePrefix = uploadDate.toISOString().substring(0, 10);

  const cleanName = originalName
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ\-_]/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50);

  let folderPath = '';

  if (options?.entityType === 'product' && options?.entityId) {
    folderPath = `productos/${options.entityId}/${yearMonth}/${datePrefix}_${cleanName}_${fileId.substring(0, 8)}.${extension}`;
  } else if (options?.entityType === 'purchase-order' && options?.entityId) {
    folderPath = `ordenes-compra/${options.entityId}/${datePrefix}_${cleanName}_${fileId.substring(0, 8)}.${extension}`;
  } else if (options?.entityType === 'warehouse' && options?.entityId) {
    folderPath = `bodegas/${options.entityId}/${yearMonth}/${datePrefix}_${cleanName}_${fileId.substring(0, 8)}.${extension}`;
  } else {
    folderPath = `general/${yearMonth}/${datePrefix}_${cleanName}_${fileId.substring(0, 8)}.${extension}`;
  }

  const blobName = folderPath;
  const blockBlobClient = container.getBlockBlobClient(blobName);

  const metadata: Record<string, string> = {
    originalName: encodeURIComponent(originalName),
    contentType: encodeURIComponent(contentType),
    size: buffer.length.toString(),
    uploadedAt: new Date().toISOString(),
  };
  if (options?.category) metadata.category = encodeURIComponent(options.category);
  if (options?.entityType) metadata.entityType = encodeURIComponent(options.entityType);
  if (options?.entityId) metadata.entityId = options.entityId.toString();
  if (options?.uploadedBy) metadata.uploadedBy = encodeURIComponent(options.uploadedBy);
  if (options?.description) metadata.description = encodeURIComponent(options.description);

  await blockBlobClient.upload(buffer, buffer.length, {
    blobHTTPHeaders: {
      blobContentType: contentType,
      blobContentDisposition: `inline; filename="${encodeURIComponent(originalName)}"`,
    },
    metadata,
  });

  return {
    id: fileId,
    originalName,
    blobName,
    url: blockBlobClient.url,
    contentType,
    size: buffer.length,
    uploadedAt: new Date(),
    category: options?.category,
    entityType: options?.entityType,
    entityId: options?.entityId,
    description: options?.description,
  };
}

export async function getFileUrl(blobName: string, expiresInMinutes: number = 60): Promise<string> {
  const container = initializeBlobClient();
  const blockBlobClient = container.getBlockBlobClient(blobName);

  const exists = await blockBlobClient.exists();
  if (!exists) throw new Error(`Archivo no encontrado: ${blobName}`);
  if (!sharedKeyCredential || !accountName) throw new Error('Credenciales no disponibles');

  const permissions = BlobSASPermissions.parse('r');
  const sasToken = generateBlobSASQueryParameters({
    containerName,
    blobName,
    permissions,
    startsOn: new Date(Date.now() - 5 * 60 * 1000),
    expiresOn: new Date(Date.now() + expiresInMinutes * 60 * 1000),
  }, sharedKeyCredential).toString();

  return `${blockBlobClient.url}?${sasToken}`;
}

export async function downloadFile(blobName: string): Promise<{ buffer: Buffer; metadata: FileMetadata }> {
  const container = initializeBlobClient();
  const blockBlobClient = container.getBlockBlobClient(blobName);

  const exists = await blockBlobClient.exists();
  if (!exists) throw new Error(`Archivo no encontrado: ${blobName}`);

  const downloadResponse = await blockBlobClient.download(0);
  const chunks: Buffer[] = [];
  for await (const chunk of downloadResponse.readableStreamBody as NodeJS.ReadableStream) {
    chunks.push(Buffer.from(chunk));
  }

  const buffer = Buffer.concat(chunks);
  const properties = await blockBlobClient.getProperties();

  return {
    buffer,
    metadata: {
      originalName: decodeURIComponent(properties.metadata?.originalName || 'unknown'),
      contentType: properties.contentType || 'application/octet-stream',
      size: buffer.length,
      category: properties.metadata?.category,
      entityType: properties.metadata?.entityType,
      entityId: properties.metadata?.entityId,
      uploadedAt: properties.metadata?.uploadedAt || new Date().toISOString(),
      uploadedBy: properties.metadata?.uploadedBy,
    },
  };
}

export async function deleteFile(blobName: string): Promise<void> {
  const container = initializeBlobClient();
  const blockBlobClient = container.getBlockBlobClient(blobName);
  const exists = await blockBlobClient.exists();
  if (!exists) throw new Error(`Archivo no encontrado: ${blobName}`);
  await blockBlobClient.delete();
}

export async function listFilesByEntity(
  entityType: string,
  entityId?: number | string
): Promise<Array<{ blobName: string; metadata: FileMetadata; url: string; id: string }>> {
  const container = initializeBlobClient();
  const folderMap: Record<string, string> = {
    'product': 'productos',
    'purchase-order': 'ordenes-compra',
    'warehouse': 'bodegas',
    'general': 'general',
  };
  const folderName = folderMap[entityType] || entityType;
  const prefix = entityId ? `${folderName}/${entityId}/` : `${folderName}/`;

  const files: Array<{ blobName: string; metadata: FileMetadata; url: string; id: string }> = [];

  for await (const blob of container.listBlobsFlat({ prefix, includeMetadata: true })) {
    const blockBlobClient = container.getBlockBlobClient(blob.name);
    if (!sharedKeyCredential || !accountName) throw new Error('Credenciales no disponibles');

    const sasToken = generateBlobSASQueryParameters({
      containerName,
      blobName: blob.name,
      permissions: BlobSASPermissions.parse('r'),
      startsOn: new Date(Date.now() - 5 * 60 * 1000),
      expiresOn: new Date(Date.now() + 60 * 60 * 1000),
    }, sharedKeyCredential).toString();

    const blobNameParts = blob.name.split('_');
    const lastPart = blobNameParts[blobNameParts.length - 1];
    const fileId = lastPart.split('.')[0];

    files.push({
      id: fileId,
      blobName: blob.name,
      metadata: {
        originalName: decodeURIComponent(blob.metadata?.originalName || 'unknown'),
        contentType: decodeURIComponent(blob.metadata?.contentType || blob.properties.contentType || 'application/octet-stream'),
        size: blob.properties.contentLength || 0,
        category: blob.metadata?.category ? decodeURIComponent(blob.metadata.category) : undefined,
        entityType: blob.metadata?.entityType ? decodeURIComponent(blob.metadata.entityType) : undefined,
        entityId: blob.metadata?.entityId,
        uploadedAt: blob.metadata?.uploadedAt || blob.properties.createdOn?.toISOString() || '',
        uploadedBy: blob.metadata?.uploadedBy ? decodeURIComponent(blob.metadata.uploadedBy) : undefined,
      },
      url: `${blockBlobClient.url}?${sasToken}`,
    });
  }

  return files;
}

export async function testConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const container = initializeBlobClient();
    const exists = await container.exists();
    if (!exists) {
      return { success: false, message: `El contenedor '${containerName}' no existe` };
    }
    return { success: true, message: `Conexión exitosa. Contenedor: ${containerName}` };
  } catch (error) {
    return { success: false, message: `Error: ${error instanceof Error ? error.message : 'Desconocido'}` };
  }
}
