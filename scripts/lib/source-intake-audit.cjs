'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const { COURSE_IDS } = require('../../src/data/courseCatalog.cjs');

const SOURCE_TYPES = new Set(['csv', 'apkg']);
const CATALOG_STATUSES = new Set(['existing-course', 'future-language', 'review-only']);
const IMPORT_DISPOSITIONS = new Set(['candidate', 'duplicate', 'review-only', 'extract-first']);

function text(value) {
  return String(value ?? '').trim();
}

function normalizedPath(value) {
  return text(value).replace(/\\/g, '/');
}

function isSlug(value) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

function sha256ForFile(absolutePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(absolutePath)).digest('hex');
}

function auditSourceIntake({ manifest, projectRoot }) {
  const errors = [];
  const sourceCollection = text(manifest?.sourceCollection);
  const sources = Array.isArray(manifest?.sources) ? manifest.sources : [];

  if (Number(manifest?.schemaVersion) !== 1) {
    errors.push('Source intake manifest must declare schemaVersion 1.');
  }
  if (sourceCollection !== 'quizlet-language-intake') {
    errors.push('Source intake manifest must use the quizlet-language-intake collection key.');
  }

  const entries = [];
  const byId = new Map();

  for (const rawEntry of sources) {
    const entry = Object.freeze({
      id: text(rawEntry?.id),
      languageId: text(rawEntry?.languageId),
      languageLabel: text(rawEntry?.languageLabel),
      catalogStatus: text(rawEntry?.catalogStatus),
      proposedCourseId: text(rawEntry?.proposedCourseId),
      sourceType: text(rawEntry?.sourceType),
      importDisposition: text(rawEntry?.importDisposition),
      trackedAssetPath: normalizedPath(rawEntry?.trackedAssetPath),
      originalFilename: text(rawEntry?.originalFilename),
      sha256: text(rawEntry?.sha256).toLowerCase(),
      rowCount: Number(rawEntry?.rowCount || 0),
      headers: Array.isArray(rawEntry?.headers) ? rawEntry.headers.map(text) : [],
      duplicateOf: text(rawEntry?.duplicateOf),
      intakeNotes: text(rawEntry?.intakeNotes),
    });
    entries.push(entry);

    if (!isSlug(entry.id)) errors.push(`Source intake entry has an invalid id: ${entry.id || '<blank>'}.`);
    if (byId.has(entry.id)) errors.push(`Source intake manifest contains duplicate entry id ${entry.id}.`);
    byId.set(entry.id, entry);

    if (!isSlug(entry.languageId)) {
      errors.push(`Source intake entry ${entry.id || '<blank>'} has an invalid languageId.`);
    }
    if (!entry.languageLabel) errors.push(`Source intake entry ${entry.id} is missing languageLabel.`);
    if (!CATALOG_STATUSES.has(entry.catalogStatus)) {
      errors.push(`Source intake entry ${entry.id} has invalid catalogStatus ${entry.catalogStatus}.`);
    }
    if (entry.proposedCourseId && !isSlug(entry.proposedCourseId)) {
      errors.push(`Source intake entry ${entry.id} has an invalid proposedCourseId.`);
    }
    if (entry.catalogStatus === 'existing-course' && !COURSE_IDS.includes(entry.proposedCourseId)) {
      errors.push(`Source intake entry ${entry.id} must target an existing catalog course.`);
    }
    if (!SOURCE_TYPES.has(entry.sourceType)) {
      errors.push(`Source intake entry ${entry.id} has invalid sourceType ${entry.sourceType}.`);
    }
    if (!IMPORT_DISPOSITIONS.has(entry.importDisposition)) {
      errors.push(`Source intake entry ${entry.id} has invalid importDisposition ${entry.importDisposition}.`);
    }
    if (!entry.originalFilename) errors.push(`Source intake entry ${entry.id} is missing originalFilename.`);
    if (!/^[a-f0-9]{64}$/.test(entry.sha256)) {
      errors.push(`Source intake entry ${entry.id} must declare a SHA-256.`);
    }
    if (!entry.intakeNotes) errors.push(`Source intake entry ${entry.id} is missing intakeNotes.`);

    if (entry.sourceType === 'csv') {
      if (!Number.isInteger(entry.rowCount) || entry.rowCount <= 0) {
        errors.push(`CSV source ${entry.id} must declare a positive rowCount.`);
      }
      if (entry.headers.length !== 2 || entry.headers[0] !== 'Front' || entry.headers[1] !== 'Back') {
        errors.push(`CSV source ${entry.id} must keep the canonical Front/Back header.`);
      }
    }

    if (entry.importDisposition === 'duplicate') {
      if (!entry.duplicateOf) errors.push(`Duplicate source ${entry.id} must reference duplicateOf.`);
      if (entry.trackedAssetPath) errors.push(`Duplicate source ${entry.id} must not keep a trackedAssetPath.`);
    } else if (!entry.trackedAssetPath) {
      errors.push(`Source intake entry ${entry.id} must keep a trackedAssetPath unless it is a duplicate.`);
    }

    if (entry.trackedAssetPath) {
      const absolutePath = path.join(projectRoot, ...entry.trackedAssetPath.split('/'));
      if (!fs.existsSync(absolutePath)) {
        errors.push(`Tracked intake asset for ${entry.id} is missing: ${entry.trackedAssetPath}.`);
      } else if (entry.sha256 !== sha256ForFile(absolutePath)) {
        errors.push(`Tracked intake asset for ${entry.id} does not match its declared SHA-256.`);
      }
    }
  }

  for (const entry of entries) {
    if (!entry.duplicateOf) continue;
    const target = byId.get(entry.duplicateOf);
    if (!target) {
      errors.push(`Duplicate source ${entry.id} points to unknown entry ${entry.duplicateOf}.`);
      continue;
    }
    if (target.sha256 !== entry.sha256) {
      errors.push(`Duplicate source ${entry.id} must share the same SHA-256 as ${entry.duplicateOf}.`);
    }
  }

  const summary = Object.freeze({
    entries: entries.length,
    trackedAssets: entries.filter((entry) => Boolean(entry.trackedAssetPath)).length,
    csvEntries: entries.filter((entry) => entry.sourceType === 'csv').length,
    apkgEntries: entries.filter((entry) => entry.sourceType === 'apkg').length,
    uniqueLanguages: new Set(entries.map((entry) => entry.languageId)).size,
    duplicates: entries.filter((entry) => entry.importDisposition === 'duplicate').length,
    existingCatalogMatches: entries.filter((entry) => entry.catalogStatus === 'existing-course').length,
    futureLanguageSources: entries.filter((entry) => entry.catalogStatus === 'future-language').length,
    reviewOnlySources: entries.filter((entry) => entry.importDisposition === 'review-only').length,
  });

  return Object.freeze({
    ok: errors.length === 0,
    errors: Object.freeze(errors),
    summary,
    entries: Object.freeze(entries),
  });
}

module.exports = {
  auditSourceIntake,
};
