import { readFile, writeFileSync, existsSync } from "fs";
import { promisify } from "util";
import * as path from "path";
import { Command } from "commander";
import PDFParser from "pdf2json";

const readFileAsync = promisify(readFile);

interface CoordinateResult {
  field: string;
  x: number;
  y: number;
  width: number;
  height: number;
  matchText: string;
  [key: string]: string | number | object;
}

interface JSONResult {
  x: number;
  y: number;
  width: number;
  height: number;
  matchText: string;
  [key: string]: string | number | object;
}

interface KeywordPattern {
  field: string;
  keyword: string;
}

class PDFCoordinatesExtractor {
  private keywords: KeywordPattern[] = [];

  constructor() {}

  async loadKeywords(patternFile: string): Promise<void> {
    if (!existsSync(patternFile))
      throw new Error(`Patterns file not found ${patternFile}`);

    const content = await readFileAsync(patternFile, "utf8");
    const data = JSON.parse(content);

    if (!data.keywords || !Array.isArray(data.keywords))
      throw new Error("Invalid keywords format");

    this.keywords = data.keywords;
  }

  private parsePDF(filePath: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const pdfParser = new PDFParser();

      pdfParser.on("pdfParser_dataError", (errData: any) => {
        reject(new Error(`PDF parsing error: ${errData.parserError}`));
      });

      pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
        resolve(pdfData);
      });

      pdfParser.loadPDF(filePath);
    });
  }

  async extractCoordinates(
    pdfPath: string,
    templateX: number = 0,
    templateY: number = 0,
    templateWidth: number = 210,
    templateHeight?: number
  ): Promise<CoordinateResult[]> {
    if (this.keywords.length === 0) throw new Error("No keywords loaded.");

    const pdfData = await this.parsePDF(pdfPath);

    if (!pdfData.Pages || pdfData.Pages.length === 0) {
      throw new Error("No pages found in PDF");
    }

    const page = pdfData.Pages[0];
    const results: CoordinateResult[] = [];

    const scaleX = templateWidth / page.Width;
    const scaleY = templateHeight ? templateHeight / page.Height : scaleX;

    if (page.Texts) {
      for (const textItem of page.Texts) {
        for (const textRun of textItem.R) {
          const text = decodeURIComponent(textRun.T).trim();

          if (text.length === 0) continue;

          for (const kwMap of this.keywords) {
            if (text.toLowerCase().includes(kwMap.keyword.toLowerCase())) {
              const x = Math.round(templateX + textItem.x * scaleX);
              const y = Math.round(templateY + textItem.y * scaleY);

              const width = Math.round(textItem.w * scaleX);
              const height = Math.round(
                textRun.TS ? textRun.TS[1] * scaleY : 12 * scaleY
              );

              results.push({
                field: kwMap.field,
                x,
                y,
                width,
                height,
                matchText: text,
              });
              break;
            }
          }
        }
      }
    }

    return results;
  }

  async listAllText(
    pdfPath: string,
    templateX: number = 0,
    templateY: number = 0,
    templateWidth: number = 210,
    templateHeight?: number
  ): Promise<Array<{ text: string; x: number; y: number }>> {
    const pdfData = await this.parsePDF(pdfPath);

    if (!pdfData.Pages || pdfData.Pages.length === 0) {
      throw new Error("No pages found in PDF");
    }

    const page = pdfData.Pages[0];
    const allText: Array<{ text: string; x: number; y: number }> = [];

    const scaleX = templateWidth / page.Width;
    const scaleY = templateHeight ? templateHeight / page.Height : scaleX;

    if (page.Texts) {
      for (const textItem of page.Texts) {
        for (const textRun of textItem.R) {
          const text = decodeURIComponent(textRun.T).trim();

          if (text.length > 0) {
            const x = Math.round(templateX + textItem.x * scaleX);
            const y = Math.round(templateY + textItem.y * scaleY);

            allText.push({ text, x, y });
          }
        }
      }
    }

    return allText;
  }

  generateJSON(coordinates: CoordinateResult[]): string {
    const output = {
      coordinates: coordinates.reduce((acc, coord) => {
        acc[coord.field] = {
          x: coord.x,
          y: coord.y,
          width: coord.width,
          height: coord.height,
          matchText: coord.matchText,
        };
        return acc;
      }, {} as Record<string, JSONResult>),
    };

    return JSON.stringify(output, null, 2);
  }

  generateArray(coordinates: CoordinateResult[]): Record<string, JSONResult> {
    return coordinates.reduce((acc, coord) => {
      acc[coord.field] = {
        x: coord.x,
        y: coord.y,
        width: coord.width,
        height: coord.height,
        matchText: coord.matchText,
      };
      return acc;
    }, {} as Record<string, JSONResult>);
  }
}

const program = new Command();

program
  .name("pdf-coordinate-extractor")
  .description(
    "Extract coordinates by searching for keywords in PDF text - matches FPDI useTemplate parameters"
  )
  .version("1.0.0");

program
  .command("extract")
  .description("Extract coordinates by finding keywords in PDF")
  .argument("<pdf-file>", "PDF file path")
  .requiredOption("-k, --keywords <file>", "Keywords JSON file (required)")
  .option("-x, --template-x <number>", "Template X position (default: 0)", "0")
  .option("-y, --template-y <number>", "Template Y position (default: 0)", "0")
  .option(
    "-w, --template-width <number>",
    "Template width (default: 210)",
    "210"
  )
  .option(
    "-h, --template-height <number>",
    "Template height (optional, auto-calculated if not provided)"
  )
  .option("-o, --output <file>", "Save output to file (optional)")
  .option("-f, --format <type>", "Output format (json|array)", "json")
  .action(async (pdfFile: string, options) => {
    try {
      if (!existsSync(pdfFile)) {
        console.error(`PDF file not found: ${pdfFile}`);
        process.exit(1);
      }

      const extractor = new PDFCoordinatesExtractor();

      try {
        await extractor.loadKeywords(options.keywords);
      } catch (error: any) {
        console.error(`Error loading keywords: ${error.message}`);
        process.exit(1);
      }

      const templateX = parseFloat(options.templateX);
      const templateY = parseFloat(options.templateY);
      const templateWidth = parseFloat(options.templateWidth);
      const templateHeight = options.templateHeight
        ? parseFloat(options.templateHeight)
        : undefined;

      console.log(`Searching for keywords in: ${path.basename(pdfFile)}`);
      console.log(
        `Template parameters: x=${templateX}, y=${templateY}, width=${templateWidth}${
          templateHeight ? `, height=${templateHeight}` : ""
        }`
      );

      const coordinates = await extractor.extractCoordinates(
        pdfFile,
        templateX,
        templateY,
        templateWidth,
        templateHeight
      );

      if (coordinates.length === 0) {
        console.log("No matching keywords found.");
        process.exit(1);
      }

      console.log("\nFound coordinates:");
      coordinates.forEach((coord) => {
        console.log(
          `${coord.field}: x=${coord.x}, y=${coord.y} (match: "${coord.matchText}")`
        );
      });

      if (options.format === "array") {
        console.log("\nPHP Array:");
        console.log("return [");
        coordinates.forEach((coord) => {
          console.log(
            `    '${coord.field}' => ['x' => ${coord.x}, 'y' => ${coord.y}, 'width' => ${coord.width}, 'height' => ${coord.height}], // ${coord.matchText}`
          );
        });
        console.log("];");
      } else {
        console.log("\nJSON:");
        console.log(extractor.generateJSON(coordinates));
      }

      if (options.output) {
        let output;

        if (options.format === "array") {
          output = JSON.stringify(
            extractor.generateArray(coordinates),
            null,
            2
          );
        } else {
          output = extractor.generateJSON(coordinates);
        }

        writeFileSync(options.output, output);
        console.log(`\nSaved to: ${options.output}`);
      }
    } catch (error: any) {
      console.error("Error:", error.message);
      process.exit(1);
    }
  });

program
  .command("scan")
  .description("Scan PDF and show all text with coordinates")
  .argument("<pdf-file>", "PDF file path")
  .option("-x, --template-x <number>", "Template X position (default: 0)", "0")
  .option("-y, --template-y <number>", "Template Y position (default: 0)", "0")
  .option(
    "-w, --template-width <number>",
    "Template width (default: 210)",
    "210"
  )
  .option(
    "-h, --template-height <number>",
    "Template height (optional, auto-calculated if not provided)"
  )
  .option("--filter <text>", "Filter text containing this string")
  .action(async (pdfFile: string, options) => {
    try {
      const extractor = new PDFCoordinatesExtractor();

      const templateX = parseFloat(options.templateX);
      const templateY = parseFloat(options.templateY);
      const templateWidth = parseFloat(options.templateWidth);
      const templateHeight = options.templateHeight
        ? parseFloat(options.templateHeight)
        : undefined;

      const allText = await extractor.listAllText(
        pdfFile,
        templateX,
        templateY,
        templateWidth,
        templateHeight
      );

      let filteredText = allText;

      if (options.filter) {
        filteredText = allText.filter((item) =>
          item.text.toLowerCase().includes(options.filter.toLowerCase())
        );
      }

      console.log("Text found in PDF:");
      console.log(
        `Using template parameters: x=${templateX}, y=${templateY}, width=${templateWidth}${
          templateHeight ? `, height=${templateHeight}` : ""
        }`
      );
      console.log(`Total text items: ${filteredText.length}\n`);

      filteredText.forEach((item) => {
        console.log(`x=${item.x}, y=${item.y}: "${item.text}"`);
      });
    } catch (error: any) {
      console.error("Error:", error.message);
      process.exit(1);
    }
  });

program
  .command("keywords")
  .description("Create sample keywords file")
  .option("--create <file>", "Create sample keywords file")
  .action((options) => {
    if (options.create) {
      const sampleKeywords = {
        keywords: [
          {
            field: "company_name_label",
            keyword: "Company Name",
          },
          {
            field: "total_amount_label",
            keyword: "Total Amount",
          },
          {
            field: "date_label",
            keyword: "Date",
          },
        ],
      };

      writeFileSync(options.create, JSON.stringify(sampleKeywords, null, 2));
      console.log(`Created sample keywords file: ${options.create}`);
      console.log("Edit this file to add the actual text labels from your PDF");
    }
  });

program.parse();

export { PDFCoordinatesExtractor, CoordinateResult, KeywordPattern };
