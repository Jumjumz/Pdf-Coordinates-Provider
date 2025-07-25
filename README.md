# PDF Coordinate Provider

A Node.js CLI tool to extract coordinates of text keywords from PDF files. Perfect for automating PDF form field positioning and template-based document processing.

## Requirements

- **Node.js 14+** (ES modules and modern JavaScript support)
- **npm** or **yarn**
- **Requires PDFs with actual text content (not scanned images)**

## Installation

```bash
npm install
```

## Usage

### Scan All Text

List all text and coordinates in a PDF:

```bash
npm run dev -- scan sample.pdf
```

### Extract Keywords

Extract coordinates for specific keywords from a PDF:

```bash
npm run dev -- extract sample.pdf -k keywords.json
```

**Or after building:**

```bash
npm run build
node dist/index.js extract sample.pdf -k keywords.json
```

### Create Keywords File

Generate a sample keywords configuration:

```bash
npm run dev -- keywords --create keywords.json
```

## Commands

### `extract`

Extract coordinates by finding keywords in PDF text.

```bash
npm run dev -- extract <pdf-file> -k <keywords-file> [options]
```

**Options:**

- `-k, --keywords <file>` - Keywords JSON file (required)
- `-x, --template-x <number>` - Template X position (default: 0)
- `-y, --template-y <number>` - Template Y position (default: 0)
- `-w, --template-width <number>` - Template width (default: 210)
- `-h, --template-height <number>` - Template height (optional)
- `-o, --output <file>` - Save output to file
- `-f, --format <type>` - Output format: `json` or `array` (default: json)

**Example:**

```bash
npm run dev -- extract invoice.pdf -k keywords.json -f array
```

### `scan`

Show all text with coordinates from a PDF.

```bash
npm run dev -- scan <pdf-file> [options]
```

**Options:**

- `--filter <text>` - Filter text containing this string
- Template positioning options (same as extract)

**Example:**

```bash
npm run dev -- scan document.pdf --filter "Total"
```

### `keywords`

Create a sample keywords file.

```bash
npm run dev -- keywords --create <file>
```

## Keywords File Format

Create a JSON file with your target keywords:

```json
{
  "keywords": [
    {
      "field": "company_name_label",
      "keyword": "Company Name"
    },
    {
      "field": "total_amount_label",
      "keyword": "Total Amount"
    },
    {
      "field": "date_label",
      "keyword": "Date"
    }
  ]
}
```

## Output Formats

### JSON Format

```json
{
  "coordinates": {
    "company_name_label": {
      "x": 45,
      "y": 120,
      "width": 85,
      "height": 12,
      "matchText": "Company Name"
    }
  }
}
```

### Array Format (PHP-style)

```php
return [
    'company_name_label' => ['x' => 45, 'y' => 120, 'width' => 85, 'height' => 12], // Company Name
    'total_amount_label' => ['x' => 150, 'y' => 200, 'width' => 90, 'height' => 12], // Total Amount
];
```

## Examples

**Extract coordinates with custom template size:**

```bash
npm run dev -- extract invoice.pdf -k keywords.json -w 297 -h 210
```

**Scan and filter specific text:**

```bash
npm run dev -- scan document.pdf --filter "Total"
```

**Save output to file:**

```bash
npm run dev -- extract form.pdf -k keywords.json -o output.json
```

**Generate PHP-style array output:**

```bash
npm run dev -- extract form.pdf -k keywords.json -f array
```

## Alternative Usage (Direct Execution)

You can also run commands directly without npm:

```bash
# Using npx
npx ts-node src/index.ts extract sample.pdf -k keywords.json

# After building
npm run build
node dist/index.js extract sample.pdf -k keywords.json
```

## How It Works

1. **PDF Text Extraction**: Uses pdf2json to extract text content and coordinates from PDF files
2. **Keyword Matching**: Searches for specified keywords within the extracted text
3. **Coordinate Calculation**: Calculates precise x,y coordinates scaled to your template dimensions
4. **FPDI Compatible**: Output coordinates match FPDI `useTemplate()` parameters for PHP PDF manipulation

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev -- <command> [options]

# Build for production
npm run build

# Run built version
npm run start <command> [options]

# Clean build directory
npm run clear
```

## Limitations

- Only processes the first page of PDFs
- Requires PDFs with actual text content (not scanned images)
- Coordinates are relative to PDF coordinate system
- Text extraction quality depends on PDF structure

## Dependencies

- **pdf2json** - Lightweight PDF parsing and text extraction for Node.js
- **commander** - CLI interface and argument parsing

## Troubleshooting

### Command not working?

Make sure to use `--` when running with npm:

```bash
# ❌ Wrong
npm run dev extract file.pdf -k keywords.json

# ✅ Correct
npm run dev -- extract file.pdf -k keywords.json
```

### No text found?

- Ensure your PDF contains actual text (not scanned images)
- Try the `scan` command first to see all available text
- Check if your keywords match the exact text in the PDF

### Coordinate scaling issues?

- Adjust template width/height parameters to match your target dimensions
- Use the same coordinate system as your PDF processing library (e.g., FPDI)

## License

MIT
