import { useState, useEffect } from 'react';
import { templates } from '../../constants';
import { mapTemplateToItems } from '../../utils';
import { parseCsvToItems } from '../../utils/constructionUtils';
import { normalizeLegacyItems } from '../../utils/itemFactory';

const fetchTemplateList = async () => {
  for (const url of ['./api/templates', './templates/manifest.json']) {
    try {
      const res = await fetch(`${url}?t=${Date.now()}`);
      if (!res.ok) continue;
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) return data;
    } catch (e) {}
  }
  return null;
};

/** Reads the "Total Beamline Length: N m" header that exported CSV files carry. */
export const readCsvBeamlineLength = (csvText) => {
  const match = typeof csvText === 'string' && csvText.match(/Total Beamline Length:\s*([\d.]+)\s*m/i);
  const length = match ? parseFloat(match[1]) : NaN;
  return Number.isFinite(length) && length > 0 ? length : null;
};

/**
 * Template list and loading: CSV templates from the dev server API or the deployed templates/
 * folder, with the bundled fallback template if neither is reachable. Also handles CSV import.
 *
 * `applyLayout(items, { canvasLength, fileName })` receives every successfully loaded layout.
 */
export const useTemplates = ({ applyLayout }) => {
  const [loadedFileName, setLoadedFileName] = useState('');
  const [templateList, setTemplateList] = useState(() => Object.keys(templates).map(k => ({
    name: k,
    fileName: templates[k]?.fileName || `${k}.csv`
  })));

  const refreshTemplates = async () => {
    const list = await fetchTemplateList();
    if (list) {
      setTemplateList(list);
      return list;
    }
    return templateList;
  };

  useEffect(() => {
    if (typeof import.meta !== 'undefined' && import.meta.hot && typeof import.meta.hot.on === 'function') {
      import.meta.hot.on('templates-updated', () => { refreshTemplates(); });
    }
  }, []);

  /** Parses CSV text and applies it. Returns true if it contained at least one component. */
  const handleImportCsv = (csvText, fileName = null) => {
    const importedItems = parseCsvToItems(csvText);
    if (!importedItems || importedItems.length === 0) return false;
    applyLayout(normalizeLegacyItems(importedItems), { canvasLength: readCsvBeamlineLength(csvText), fileName });
    return true;
  };

  /** Loads a template by name or file name. Returns true on success, false if it could not be loaded. */
  const loadTemplate = async (templateNameOrFileName, list = templateList) => {
    const found = list.find(t =>
      t.name === templateNameOrFileName ||
      t.fileName === templateNameOrFileName ||
      t.fileName === `${templateNameOrFileName}.csv`
    );
    const fileName = found ? found.fileName : (templateNameOrFileName.endsWith('.csv') ? templateNameOrFileName : `${templateNameOrFileName}.csv`);
    const urlsToTry = [
      found?.url,
      `./api/templates/file/${encodeURIComponent(fileName)}`,
      `./templates/${encodeURIComponent(fileName)}`
    ].filter(Boolean);

    for (const url of urlsToTry) {
      try {
        const res = await fetch(`${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`);
        if (!res.ok) continue;
        const csvText = await res.text();
        if (csvText && csvText.trim().length > 0 && !csvText.startsWith('<!DOCTYPE') && handleImportCsv(csvText, fileName)) {
          return true;
        }
      } catch (e) {}
    }

    // Bundled templates (always available, even offline)
    const bundled = templates[templateNameOrFileName] || Object.values(templates).find(t => t.fileName === templateNameOrFileName);
    if (bundled?.rawCsv) {
      return handleImportCsv(bundled.rawCsv, bundled.fileName || `${templateNameOrFileName}.csv`);
    }
    if (Array.isArray(bundled)) {
      applyLayout(normalizeLegacyItems(mapTemplateToItems(bundled)), { fileName: templateNameOrFileName });
      return true;
    }
    return false;
  };

  /** Loads the bundled fallback layout that ships inside the app. */
  const loadBundledFallback = () => {
    const key = Object.keys(templates)[0];
    return key ? loadTemplate(key, []) : Promise.resolve(false);
  };

  return {
    templateList, refreshTemplates, loadTemplate, loadBundledFallback, handleImportCsv,
    loadedFileName, setLoadedFileName
  };
};
