# Font Validator

A web application that validates font usage across multiple websites using Puppeteer and React.

## Features

- **Font Validation**: Checks if websites use correct fonts (Super Grotesk for headers, Minion Pro for content)
- **Batch Processing**: Validate multiple URLs at once
- **Screenshot Capture**: Takes full-page screenshots of each validated page
- **File Upload**: Upload .txt files containing URLs
- **Export Reports**: Generate HTML reports with validation results
- **Real-time Results**: View validation results in a responsive table

## Font Rules

- **Headers (h1-h6)**: Expected font is "Super Grotesk"
- **Content (p, span, div)**: Expected font is "Minion Pro"

## Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express
- **Web Scraping**: Puppeteer (headless Chrome)
- **Build Tool**: Vite
- **Icons**: Lucide React

## Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Build the project: `npm run build`
4. Start the server: `npm start`

## Development

- **Frontend only**: `npm run dev` (runs on port 5173)
- **Backend only**: `npm run server` (runs on port 3001)
- **Full stack**: `npm start` (builds and serves on port 3001)

## Usage

1. Enter URLs in the text area (one per line) or upload a .txt file
2. Click "Start Validation" to begin font checking
3. View results in the table with pass/fail status
4. Click "View" to see screenshots of validated pages
5. Export results as HTML report

## API Endpoints

- `POST /api/validate-fonts` - Validate fonts on provided URLs
- `POST /api/upload-urls` - Upload and parse URL file
- `POST /api/export-report` - Generate and download HTML report

## Deployment

The application can be deployed to:
- **Vercel**: Full-stack with serverless functions
- **Railway**: Full Node.js support
- **Render**: Full-stack deployment

## License

MIT