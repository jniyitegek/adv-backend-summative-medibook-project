const fs = require('fs');
const path = require('path');
const { SUPPORTED_LANGS, DEFAULT_LANG } = require('../config/constants');

/**
 * Escapes HTML characters to prevent XSS injection
 */
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * GET /feedback - Render localized HTML feedback page
 * Accepts ?lang=en|rw, defaults and falls back to en
 */
async function renderFeedbackPage(req, res, next) {
  try {
    let lang = req.query.lang ? String(req.query.lang).toLowerCase().trim() : DEFAULT_LANG;

    if (!SUPPORTED_LANGS.includes(lang)) {
      lang = DEFAULT_LANG;
    }

    const localeFilePath = path.join(__dirname, `../../locales/${lang}.json`);
    let localeRaw;
    try {
      localeRaw = await fs.promises.readFile(localeFilePath, 'utf8');
    } catch (readErr) {
      // Fallback to default language file if reading fails
      const fallbackPath = path.join(__dirname, `../../locales/${DEFAULT_LANG}.json`);
      localeRaw = await fs.promises.readFile(fallbackPath, 'utf8');
      lang = DEFAULT_LANG;
    }

    const locale = JSON.parse(localeRaw);

    // Format current date in selected locale
    let formattedDate;
    try {
      formattedDate = new Intl.DateTimeFormat(lang, { dateStyle: 'full' }).format(new Date());
    } catch (dateErr) {
      formattedDate = new Intl.DateTimeFormat(DEFAULT_LANG, { dateStyle: 'full' }).format(new Date());
    }

    const html = `<!DOCTYPE html>
<html lang="${escapeHtml(lang)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(locale.title)}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f8fafc;
      margin: 0;
      padding: 2rem 1rem;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      padding: 2.5rem;
      border-radius: 8px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }
    .header {
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 1.5rem;
      margin-bottom: 2rem;
    }
    h1 {
      color: #1e293b;
      margin: 0 0 0.5rem 0;
      font-size: 1.875rem;
    }
    .date-badge {
      display: inline-block;
      background: #e0f2fe;
      color: #0369a1;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.875rem;
      font-weight: 500;
    }
    .instructions {
      color: #475569;
      font-size: 1rem;
      margin-top: 1rem;
    }
    .form-group {
      margin-bottom: 1.75rem;
    }
    label {
      display: block;
      font-weight: 600;
      color: #1e293b;
      margin-bottom: 0.5rem;
      font-size: 0.95rem;
    }
    textarea {
      width: 100%;
      min-height: 110px;
      padding: 0.75rem;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-family: inherit;
      font-size: 0.95rem;
      box-sizing: border-box;
      resize: vertical;
      transition: border-color 0.15s ease-in-out;
    }
    textarea:focus {
      outline: none;
      border-color: #0284c7;
      box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
    }
    .btn-submit {
      background-color: #0284c7;
      color: #ffffff;
      border: none;
      padding: 0.75rem 1.5rem;
      font-size: 1rem;
      font-weight: 600;
      border-radius: 6px;
      cursor: pointer;
      transition: background-color 0.15s ease-in-out;
    }
    .btn-submit:hover {
      background-color: #0369a1;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${escapeHtml(locale.title)}</h1>
      <span class="date-badge">${escapeHtml(locale.dateLabel)}: ${escapeHtml(formattedDate)}</span>
      <p class="instructions">${escapeHtml(locale.instructions)}</p>
    </div>

    <form method="POST" action="/feedback">
      <div class="form-group">
        <label for="q1">${escapeHtml(locale.q1)}</label>
        <textarea id="q1" name="q1" required></textarea>
      </div>

      <div class="form-group">
        <label for="q2">${escapeHtml(locale.q2)}</label>
        <textarea id="q2" name="q2" required></textarea>
      </div>

      <div class="form-group">
        <label for="q3">${escapeHtml(locale.q3)}</label>
        <textarea id="q3" name="q3" required></textarea>
      </div>

      <div class="form-group">
        <label for="q4">${escapeHtml(locale.q4)}</label>
        <textarea id="q4" name="q4" required></textarea>
      </div>

      <div class="form-group">
        <label for="q5">${escapeHtml(locale.q5)}</label>
        <textarea id="q5" name="q5" required></textarea>
      </div>

      <button type="submit" class="btn-submit">${escapeHtml(locale.submit)}</button>
    </form>
  </div>
</body>
</html>`;

    res.status(200).set('Content-Type', 'text/html; charset=utf-8').send(html);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  renderFeedbackPage
};
