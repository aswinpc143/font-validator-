import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

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

function normalizeFontFamily(fontFamily) {
  if (!fontFamily) return '';
  return fontFamily.replace(/['"]/g, '').split(',')[0].trim();
}

async function validatePageFonts(url) {
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Take screenshot
    const screenshot = await page.screenshot({ 
      fullPage: true,
      encoding: 'base64'
    });
    
    // Extract font information
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
      screenshot: `data:image/png;base64,${screenshot}`,
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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
}