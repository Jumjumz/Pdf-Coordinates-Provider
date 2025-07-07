import * as fs from "fs";
import * as path from "path";
import { Command } from "commander";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

interface CoordinateResult {
  field: string;
  x: number;
  y: number;
  width: number;
  height: number;
  matchedText: string;
}

interface KeywordPattern {
  field: string;
  regex: RegExp;
  description: string;
}

class PDFCoordinatesExtractor {}
