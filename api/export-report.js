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
        ${result.screenshot ? `<img src="${result.screenshot}" class="screenshot" alt="Screenshot" />` : ''}
      </div>
    `;
  });
  
  html += `
    </body>
    </html>
  `;
  
  return html;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { results, format } = req.body;
    
    if (format === 'html') {
      const htmlReport = generateHTMLReport(results);
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', 'attachment; filename=font-validation-report.html');
      res.send(htmlReport);
    } else {
      res.status(400).json({ error: 'Invalid format' });
    }
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
}