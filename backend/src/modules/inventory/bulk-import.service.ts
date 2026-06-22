import { Injectable, BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';

interface ParsedRow {
  serialNumber: string;
  costPrice?: number;
  rowIndex: number;
}

// Result mein valid rows + jo parse stage pe reject hui
interface ParseResult {
  validRows: ParsedRow[];
  rejectedRows: { row: number; serial: string; reason: string }[];
}

@Injectable()
export class BulkImportService {
  parseFile(fileBuffer: Buffer): ParseResult {
    let workbook: XLSX.WorkBook;

    try {
      workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    } catch (e) {
      throw new BadRequestException('File parse nahi ho saki. Sahi CSV/Excel file dein.');
    }

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new BadRequestException('File mein koi sheet nahi mili');
    }
    const sheet = workbook.Sheets[sheetName];

    // Pehle headers nikaalo (raw) — taake check kar sakein column maujood hai
    const headerRows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    if (headerRows.length === 0) {
      throw new BadRequestException('File khaali hai');
    }

    // Pehli row = headers. Normalize karke check karo serialNumber column hai ya nahi.
    const headers = (headerRows[0] as any[]).map((h) =>
      String(h).trim().toLowerCase(),
    );
    const hasSerialColumn = headers.some(
      (h) => h === 'serialnumber' || h === 'serial',
    );
    if (!hasSerialColumn) {
      throw new BadRequestException(
        'File mein "serialNumber" column zaroori hai. Pehli row header honi chahiye.',
      );
    }

    // Ab data rows nikaalo (objects ke roop mein)
    const rows: any[] = XLSX.utils.sheet_to_json(sheet);
    if (rows.length === 0) {
      throw new BadRequestException('File mein koi data row nahi (sirf header hai)');
    }

    const validRows: ParsedRow[] = [];
    const rejectedRows: { row: number; serial: string; reason: string }[] = [];

    rows.forEach((row, index) => {
      const rowNum = index + 2; // +2: 0-based index + header row

      // serialNumber nikaalo (alag-alag casing handle karo)
      const rawSerial =
        row.serialNumber ?? row.serial ?? row.SerialNumber ?? row.Serial;
      const serial = rawSerial !== undefined ? String(rawSerial).trim() : '';

      // CHECK 1: serial khaali to nahi
      if (serial === '') {
        rejectedRows.push({
          row: rowNum,
          serial: '(khaali)',
          reason: 'Serial number khaali hai',
        });
        return;
      }

      // CHECK 2: serial ki length sensible ho (3 se 50 characters)
      if (serial.length < 3) {
        rejectedRows.push({
          row: rowNum,
          serial,
          reason: 'Serial number bohat chhota hai (kam se kam 3 characters)',
        });
        return;
      }
      if (serial.length > 50) {
        rejectedRows.push({
          row: rowNum,
          serial: serial.substring(0, 20) + '...',
          reason: 'Serial number bohat lamba hai (max 50 characters)',
        });
        return;
      }

      // CHECK 3: costPrice agar hai to valid number ho
      let costPrice: number | undefined;
      if (row.costPrice !== undefined && row.costPrice !== '') {
        const parsedCost = Number(row.costPrice);
        if (isNaN(parsedCost) || parsedCost < 0) {
          rejectedRows.push({
            row: rowNum,
            serial,
            reason: 'costPrice galat hai (number hona chahiye)',
          });
          return;
        }
        costPrice = parsedCost;
      }

      // Sab theek — valid row
      validRows.push({ serialNumber: serial, costPrice, rowIndex: rowNum });
    });

    // Agar ek bhi valid row nahi
    if (validRows.length === 0 && rejectedRows.length === 0) {
      throw new BadRequestException('File mein koi valid data nahi mila');
    }

    return { validRows, rejectedRows };
  }
}