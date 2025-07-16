import express from 'express';
import cors from 'cors';
import multer from 'multer';
import puppeteer from 'puppeteer';
import archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Storage for multer
const storage = multer.diskStorage({
  destination: './uploads',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

// Ensure uploads and screenshots directories exist
const uploadsDir = './uploads';
const screenshotsDir = './screenshots';
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir);

// Font validation rules
const FONT_RULES = {
  'h1': 'Super Grotesk',
  'h2': 'Super Grotesk',
  'h3': 'Super Grotesk',
  'h4': 'Super Grotesk',
  'h5': 'Super Grotesk',
  'h6': 'Super Grotesk',
  'p': 'Minion Pro',
  'span': 'Minion Pro',
  'div': 'Minion Pro'
};

// Helper function to normalize font family
function normalizeFontFamily(fontFamily) {
  if (!fontFamily) return '';
  return fontFamily.replace(/['"]/g, '').split(',')[0].trim();
}

// Validate fonts on a single page
async function validatePageFonts(url) {
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Take screenshot
    const screenshotFilename = `${Date.now()}-${url.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
    const screenshotPath = path.join(screenshotsDir, screenshotFilename);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    
    // Extract font information for target elements
    const fontData = await page.evaluate((rules) => {
      const results = [];
      const selectors = Object.keys(rules);
      
      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach((element, index) => {
          const computedStyle = window.getComputedStyle(element);
          const fontFamily = computedStyle.fontFamily;
          const textContent = element.textContent?.trim() || '';
          
          if (textContent && textContent.length > 0) {
            results.push({
              selector,
              textContent: textContent.length > 100 ? textContent.substring(0, 100) + '...' : textContent,
              actualFont: fontFamily,
              expectedFont: rules[selector],
              elementIndex: index
            });
          }
        });
      });
      
      return results;
    }, FONT_RULES);
    
    // Process results
    const processedResults = fontData.map(item => {
      const normalizedActual = normalizeFontFamily(item.actualFont);
      const normalizedExpected = item.expectedFont;
      const isMatch = normalizedActual.toLowerCase().includes(normalizedExpected.toLowerCase());
      
      return {
        ...item,
        actualFont: normalizedActual,
        status: isMatch ? 'PASS' : 'FAIL'
      };
    });
    
    return {
      url,
      screenshot: screenshotFilename,
      results: processedResults,
      totalElements: processedResults.length,
      passedElements: processedResults.filter(r => r.status === 'PASS').length
    };
    
  } catch (error) {
    console.error(`Error validating ${url}:`, error);
    return {
      url,
      screenshot: null,
      results: [],
      error: error.message,
      totalElements: 0,
      passedElements: 0
    };
  } finally {
    await browser.close();
  }
}

// Serve React app for all non-API routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  }
});

// API Routes
app.post('/api/validate-fonts', async (req, res) => {
  try {
    const { urls } = req.body;
    
    if (!urls || !Array.isArray(urls)) {
      return res.status(400).json({ error: 'URLs array is required' });
    }
    
    const results = [];
    
    for (const url of urls) {
      try {
        const result = await validatePageFonts(url);
        results.push(result);
      } catch (error) {
        results.push({
          url,
          screenshot: null,
          results: [],
          error: error.message,
          totalElements: 0,
          passedElements: 0
        });
      }
    }
    
    res.json({ results });
  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/upload-urls', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const filePath = req.file.path;
    const content = fs.readFileSync(filePath, 'utf8');
    const urls = content.split('\n')
      .map(url => url.trim())
      .filter(url => url.length > 0 && url.startsWith('http'));
    
    // Clean up uploaded file
    fs.unlinkSync(filePath);
    
    res.json({ urls });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to process file' });
  }
});

app.get('/api/screenshot/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(screenshotsDir, filename);
  
  if (fs.existsSync(filePath)) {
    res.sendFile(path.resolve(filePath));
  } else {
    res.status(404).json({ error: 'Screenshot not found' });
  }
});

app.post('/api/export-report', async (req, res) => {
  try {
    const { results, format } = req.body;
    
    if (format === 'html') {
      const htmlReport = generateHTMLReport(results);
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', 'attachment; filename=font-validation-report.html');
      res.send(htmlReport);
    } else if (format === 'zip') {
      const zipFilename = `font-validation-report-${Date.now()}.zip`;
      const zipPath = path.join(__dirname, zipFilename);
      
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });
      
      output.on('close', () => {
        res.download(zipPath, zipFilename, (err) => {
          if (!err) {
            fs.unlinkSync(zipPath);
          }
        });
      });
      
      archive.pipe(output);
      
      // Add HTML report
      const htmlReport = generateHTMLReport(results);
      archive.append(htmlReport, { name: 'font-validation-report.html' });
      
      // Add screenshots
      results.forEach(result => {
        if (result.screenshot) {
          const screenshotPath = path.join(screenshotsDir, result.screenshot);
          if (fs.existsSync(screenshotPath)) {
            archive.file(screenshotPath, { name: `screenshots/${result.screenshot}` });
          }
        }
      });
      
      archive.finalize();
    } else {
      res.status(400).json({ error: 'Invalid format' });
    }
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

function generateHTMLReport(results) {
  const timestamp = new Date().toISOString();
  
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Font Validation Report</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .summary { background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        .page-section { margin-bottom: 30px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; }
        .page-title { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { padding: 8px; border: 1px solid #ddd; text-align: left; }
        th { background: #f1f5f9; }
        .pass { color: #16a34a; font-weight: bold; }
        .fail { color: #dc2626; font-weight: bold; }
        .screenshot { max-width: 200px; height: auto; border: 1px solid #ddd; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Font Validation Report</h1>
        <p>Generated on: ${timestamp}</p>
      </div>
      
      <div class="summary">
        <h2>Summary</h2>
        <p>Total Pages Scanned: ${results.length}</p>
        <p>Total Elements Validated: ${results.reduce((sum, r) => sum + r.totalElements, 0)}</p>
        <p>Passed Elements: ${results.reduce((sum, r) => sum + r.passedElements, 0)}</p>
        <p>Failed Elements: ${results.reduce((sum, r) => sum + (r.totalElements - r.passedElements), 0)}</p>
      </div>
  `;
  
  results.forEach(result => {
    html += `
      <div class="page-section">
        <div class="page-title">${result.url}</div>
        ${result.error ? `<p style="color: red;">Error: ${result.error}</p>` : ''}
        
        <table>
          <thead>
            <tr>
              <th>Element</th>
              <th>Text Content</th>
              <th>Expected Font</th>
              <th>Actual Font</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    result.results.forEach(item => {
      html += `
        <tr>
          <td>${item.selector}</td>
          <td>${item.textContent}</td>
          <td>${item.expectedFont}</td>
          <td>${item.actualFont}</td>
          <td class="${item.status.toLowerCase()}">${item.status}</td>
        </tr>
      `;
    });
    
    html += `
          </tbody>
        </table>
      </div>
    `;
  });
  
  html += `
    </body>
    </html>
  `;
  
  return html;
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});