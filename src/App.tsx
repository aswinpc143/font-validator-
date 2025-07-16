import React, { useState } from 'react';
import { Upload, Play, Download, Eye, FileText, Archive, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface ValidationResult {
  selector: string;
  textContent: string;
  actualFont: string;
  expectedFont: string;
  status: 'PASS' | 'FAIL';
  elementIndex: number;
}

interface PageResult {
  url: string;
  screenshot: string | null;
  results: ValidationResult[];
  error?: string;
  totalElements: number;
  passedElements: number;
}

interface ValidationResponse {
  results: PageResult[];
}

function App() {
  const [urls, setUrls] = useState<string>('');
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [results, setResults] = useState<PageResult[]>([]);
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload-urls', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setUploadedUrls(data.urls);
        setUrls(data.urls.join('\n'));
      } else {
        alert('Failed to upload file');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload file');
    }
  };

  const handleValidation = async () => {
    const urlList = urls.split('\n')
      .map(url => url.trim())
      .filter(url => url.length > 0 && url.startsWith('http'));

    if (urlList.length === 0) {
      alert('Please enter at least one valid URL');
      return;
    }

    setIsValidating(true);
    setProgress(0);
    setResults([]);

    try {
      const response = await fetch('/api/validate-fonts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ urls: urlList }),
      });

      if (response.ok) {
        const data: ValidationResponse = await response.json();
        setResults(data.results);
      } else {
        alert('Validation failed');
      }
    } catch (error) {
      console.error('Validation error:', error);
      alert('Validation failed');
    } finally {
      setIsValidating(false);
      setProgress(100);
    }
  };

  const handleExport = async (format: 'html') => {
    if (results.length === 0) {
      alert('No results to export');
      return;
    }

    try {
      const response = await fetch('/api/export-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ results, format }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'font-validation-report.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        alert('Export failed');
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Export failed');
    }
  };

  const totalElements = results.reduce((sum, r) => sum + r.totalElements, 0);
  const passedElements = results.reduce((sum, r) => sum + r.passedElements, 0);
  const failedElements = totalElements - passedElements;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Font Validator</h1>
          <p className="text-gray-600">Validate font usage across multiple web pages</p>
        </div>

        {/* Font Rules Display */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Font Validation Rules</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-800 mb-2">Headers (h1-h6)</h3>
              <p className="text-blue-600">Expected: <span className="font-mono">Super Grotesk</span></p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-medium text-green-800 mb-2">Content (p, span, div)</h3>
              <p className="text-green-600">Expected: <span className="font-mono">Minion Pro</span></p>
            </div>
          </div>
        </div>

        {/* Input Panel */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Website URLs</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter URLs (one per line)
              </label>
              <textarea
                value={urls}
                onChange={(e) => setUrls(e.target.value)}
                className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://example.com&#10;https://another-site.com"
              />
            </div>

            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">or</span>
              <label className="flex items-center space-x-2 cursor-pointer bg-gray-50 hover:bg-gray-100 px-4 py-2 rounded-lg border border-gray-300 transition-colors">
                <Upload size={16} />
                <span className="text-sm">Upload .txt file</span>
                <input
                  type="file"
                  accept=".txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {uploadedUrls.length > 0 && (
              <div className="bg-green-50 p-3 rounded-lg">
                <p className="text-sm text-green-600">
                  ✅ Loaded {uploadedUrls.length} URLs from file
                </p>
              </div>
            )}
          </div>

          <div className="mt-6">
            <button
              onClick={handleValidation}
              disabled={isValidating || !urls.trim()}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg transition-colors"
            >
              {isValidating ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  <span>Validating...</span>
                </>
              ) : (
                <>
                  <Play size={20} />
                  <span>Start Validation</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        {isValidating && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="flex items-center space-x-4">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-sm text-gray-600">{progress}%</span>
            </div>
          </div>
        )}

        {/* Results Summary */}
        {results.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Validation Summary</h2>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <p className="text-2xl font-bold text-blue-600">{results.length}</p>
                <p className="text-sm text-blue-800">Pages Scanned</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <p className="text-2xl font-bold text-gray-600">{totalElements}</p>
                <p className="text-sm text-gray-800">Total Elements</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <p className="text-2xl font-bold text-green-600">{passedElements}</p>
                <p className="text-sm text-green-800">Passed</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg text-center">
                <p className="text-2xl font-bold text-red-600">{failedElements}</p>
                <p className="text-sm text-red-800">Failed</p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-4">
              <button
                onClick={() => handleExport('html')}
                className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <FileText size={16} />
                <span>Export HTML</span>
              </button>
            </div>
          </div>
        )}

        {/* Results Table */}
        {results.length > 0 && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-800">Validation Results</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Page
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Element
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Content
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Expected
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actual
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Screenshot
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {results.map((pageResult, pageIndex) => (
                    <>
                      {pageResult.error ? (
                        <tr key={pageIndex} className="bg-red-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-red-800">
                            {pageResult.url}
                          </td>
                          <td colSpan={6} className="px-6 py-4 text-sm text-red-600">
                            Error: {pageResult.error}
                          </td>
                        </tr>
                      ) : (
                        pageResult.results.map((result, resultIndex) => (
                          <tr key={`${pageIndex}-${resultIndex}`} className="hover:bg-gray-50">
                            {resultIndex === 0 && (
                              <td rowSpan={pageResult.results.length} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r">
                                <div className="max-w-xs truncate" title={pageResult.url}>
                                  {pageResult.url}
                                </div>
                              </td>
                            )}
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <span className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">
                                {result.selector}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              <div className="max-w-xs truncate" title={result.textContent}>
                                {result.textContent}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <span className="font-mono">{result.expectedFont}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <span className="font-mono">{result.actualFont}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {result.status === 'PASS' ? (
                                <span className="flex items-center space-x-1 text-green-600">
                                  <CheckCircle size={16} />
                                  <span className="font-medium">PASS</span>
                                </span>
                              ) : (
                                <span className="flex items-center space-x-1 text-red-600">
                                  <XCircle size={16} />
                                  <span className="font-medium">FAIL</span>
                                </span>
                              )}
                            </td>
                            {resultIndex === 0 && (
                              <td rowSpan={pageResult.results.length} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {pageResult.screenshot && (
                                  <button
                                    onClick={() => setSelectedScreenshot(pageResult.screenshot!)}
                                    className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 transition-colors"
                                  >
                                    <Eye size={16} />
                                    <span>View</span>
                                  </button>
                                )}
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Screenshot Modal */}
        {selectedScreenshot && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl max-h-full overflow-auto">
              <div className="p-4 border-b flex justify-between items-center">
                <h3 className="text-lg font-semibold">Screenshot Preview</h3>
                <button
                  onClick={() => setSelectedScreenshot(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <div className="p-4">
                <img
                  src={selectedScreenshot}
                  alt="Page screenshot"
                  className="max-w-full h-auto"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;