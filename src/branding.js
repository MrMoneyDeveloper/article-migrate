import { v, ie } from './vendor.js';

export function BrandBar() {
  return v.jsxs('header', { className: 'brand-bar', children: [
    v.jsx('img', { src: './cx-experts-logo.png', alt: 'CX Experts — Customer Experience Experts', width: 917, height: 198 }),
    v.jsx('span', { className: 'brand-caption', children: 'KNOWLEDGE IN MOTION' })
  ] });
}

export function TemplateCard() {
  const [downloaded, setDownloaded] = ie.useState(false);
  return v.jsxs('aside', { className: 'template-card', 'aria-label': 'CSV template', children: [
    v.jsx('div', { className: 'template-icon', 'aria-hidden': true, children: v.jsx('svg', { width: 25, height: 25, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, children: v.jsx('path', { d: 'M14 2H5v20h14V7l-5-5Zm0 0v6h5M8 12h8M8 16h8' }) }) }),
    v.jsxs('div', { className: 'template-copy', children: [
      v.jsx('h2', { children: 'Starting from scratch?' }),
      v.jsx('p', { children: 'Download the CSV template, add your articles, then upload it to get started.' }),
      v.jsxs('details', { children: [
        v.jsx('summary', { children: 'How to fill in the template' }),
        v.jsxs('div', { className: 'template-help', children: [
          v.jsx('p', { children: 'Keep the column headings and add one article per row. Required: category, section, title, and body_html (plain text or HTML).' }),
          v.jsx('p', { children: 'Optional: status (draft or published; defaults to draft), locale (defaults to en-us), position (a number), and labels (separated by semicolons). Repeat category and section names to group articles together.' }),
          v.jsx('p', { children: 'Save as CSV UTF-8, upload, and validate. Export from the source instance and import in the destination instance. Import creates new content; use the dry run to review it first.' })
        ] })
      ] })
    ] }),
    v.jsxs('div', { className: 'template-download', children: [
      v.jsx('a', { className: 'secondary-button download-button', href: './article-migrate-template.csv', download: 'article-migrate-template.csv', onClick: () => setDownloaded(true), children: '↓  Download CSV template' }),
      v.jsx('span', { role: 'status', children: downloaded ? 'Template ready. Add your articles to begin.' : 'CSV format · ready for Excel or Sheets' })
    ] })
  ] });
}
