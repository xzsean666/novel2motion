import { z } from "zod";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { createHash } from "node:crypto";

export const N2mManifestSchema = z.object({
  format: z.literal("novel2motion_package"),
  version: z.string().default("1.0.0"),
  projectId: z.string(),
  projectName: z.string(),
  createdAt: z.string(),
  checksum: z.string(),
  characters: z.array(z.string()).default([]),
  backgrounds: z.array(z.string()).default([]),
  assetFiles: z.array(z.string()).default([])
});

export type N2mManifest = z.infer<typeof N2mManifestSchema>;

export interface TarEntry {
  name: string;
  data: Buffer;
  mode?: number;
  mtime?: number;
}

/**
 * Creates a standard POSIX ustar tar header block (512 bytes)
 */
function createTarHeader(name: string, size: number, mtime = Math.floor(Date.now() / 1000)): Buffer {
  const header = Buffer.alloc(512);

  // File name (100 bytes)
  header.write(name.slice(0, 100), 0, 100, "utf8");

  // Mode (8 bytes)
  header.write("0000644\0", 100, 8, "ascii");

  // UID (8 bytes)
  header.write("0000000\0", 108, 8, "ascii");

  // GID (8 bytes)
  header.write("0000000\0", 116, 8, "ascii");

  // Size in octal (12 bytes)
  const sizeOctal = size.toString(8).padStart(11, "0") + " ";
  header.write(sizeOctal, 124, 12, "ascii");

  // MTime in octal (12 bytes)
  const mtimeOctal = mtime.toString(8).padStart(11, "0") + " ";
  header.write(mtimeOctal, 136, 12, "ascii");

  // Checksum field initially 8 spaces (0x20)
  for (let i = 148; i < 156; i++) {
    header[i] = 0x20;
  }

  // Type flag ('0' = regular file)
  header[156] = 0x30; // ASCII '0'

  // Magic 'ustar\0' (6 bytes)
  header.write("ustar\0", 257, 6, "ascii");

  // Version '00' (2 bytes)
  header.write("00", 263, 2, "ascii");

  // Compute checksum
  let chksum = 0;
  for (let i = 0; i < 512; i++) {
    chksum += header[i];
  }

  const chksumOctal = chksum.toString(8).padStart(6, "0") + "\0 ";
  header.write(chksumOctal, 148, 8, "ascii");

  return header;
}

/**
 * Packs multiple files into a gzip-compressed tar archive (.tar.gz / .n2m)
 */
export function packTarGz(entries: TarEntry[]): Buffer {
  const chunks: Buffer[] = [];

  for (const entry of entries) {
    const header = createTarHeader(entry.name, entry.data.length, entry.mtime);
    chunks.push(header);
    chunks.push(entry.data);

    // 512-byte padding for file data
    const remainder = entry.data.length % 512;
    if (remainder > 0) {
      chunks.push(Buffer.alloc(512 - remainder));
    }
  }

  // Two 512-byte zero blocks indicating end of archive
  chunks.push(Buffer.alloc(1024));

  const tarBuffer = Buffer.concat(chunks);
  return zlib.gzipSync(tarBuffer);
}

/**
 * Unpacks a gzip-compressed tar archive into a list of file entries
 */
export function unpackTarGz(compressedBuffer: Buffer): TarEntry[] {
  const tarBuffer = zlib.gunzipSync(compressedBuffer);
  const entries: TarEntry[] = [];
  let offset = 0;

  while (offset + 512 <= tarBuffer.length) {
    const header = tarBuffer.subarray(offset, offset + 512);

    // Check if end of archive (all zeroes)
    let allZero = true;
    for (let i = 0; i < 512; i++) {
      if (header[i] !== 0) {
        allZero = false;
        break;
      }
    }
    if (allZero) break;

    // Parse file name
    const nullIdx = header.indexOf(0, 0);
    const endName = nullIdx >= 0 && nullIdx < 100 ? nullIdx : 100;
    const name = header.toString("utf8", 0, endName).trim();

    // Parse file size (octal)
    const sizeStr = header.toString("ascii", 124, 136).trim().replace(/\0/g, "");
    const size = parseInt(sizeStr, 8);

    offset += 512;

    if (isNaN(size) || size < 0) {
      throw new Error(`Invalid tar entry size at offset ${offset - 512}`);
    }

    const fileData = tarBuffer.subarray(offset, offset + size);
    entries.push({
      name,
      data: Buffer.from(fileData)
    });

    // Move to next 512-byte block boundary
    const remainder = size % 512;
    const pad = remainder > 0 ? 512 - remainder : 0;
    offset += size + pad;
  }

  return entries;
}

/**
 * Computes SHA-256 digest of a buffer
 */
export function computeBufferChecksum(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}
