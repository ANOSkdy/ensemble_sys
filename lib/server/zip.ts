import "server-only";

import { inflateRawSync } from "node:zlib";

type ZipEntry = {
  name: string;
  data: Buffer;
};

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_DIR_SIGNATURE = 0x02014b50;
const LOCAL_FILE_SIGNATURE = 0x04034b50;

function findEndOfCentralDirectory(buffer: Buffer): number | null {
  const maxCommentLength = 0xffff;
  const startOffset = Math.max(0, buffer.length - (22 + maxCommentLength));
  for (let i = buffer.length - 22; i >= startOffset; i -= 1) {
    if (buffer.readUInt32LE(i) === EOCD_SIGNATURE) {
      return i;
    }
  }
  return null;
}

export function extractZipEntries(buffer: Buffer): ZipEntry[] {
  const eocdOffset = findEndOfCentralDirectory(buffer);
  if (eocdOffset === null) {
    return [];
  }

  const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
  const centralDirectoryOffset = buffer.readUInt32LE(eocdOffset + 16);

  const entries: ZipEntry[] = [];
  let offset = centralDirectoryOffset;

  for (let i = 0; i < totalEntries; i += 1) {
    if (buffer.readUInt32LE(offset) !== CENTRAL_DIR_SIGNATURE) {
      break;
    }

    const compressionMethod = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const fileNameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localHeaderOffset = buffer.readUInt32LE(offset + 42);

    const nameStart = offset + 46;
    const nameEnd = nameStart + fileNameLength;
    const name = buffer.slice(nameStart, nameEnd).toString("utf-8");

    offset = nameEnd + extraLength + commentLength;

    if (buffer.readUInt32LE(localHeaderOffset) !== LOCAL_FILE_SIGNATURE) {
      continue;
    }

    const localFileNameLength = buffer.readUInt16LE(localHeaderOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localHeaderOffset + 28);
    const dataOffset = localHeaderOffset + 30 + localFileNameLength + localExtraLength;
    const compressedData = buffer.slice(dataOffset, dataOffset + compressedSize);

    let data: Buffer;
    if (compressionMethod === 0) {
      data = compressedData;
    } else if (compressionMethod === 8) {
      data = inflateRawSync(compressedData);
    } else {
      continue;
    }

    if (uncompressedSize && data.length !== uncompressedSize) {
      continue;
    }

    entries.push({ name, data });
  }

  return entries;
}
