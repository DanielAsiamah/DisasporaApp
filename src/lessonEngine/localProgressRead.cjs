'use strict';

async function readLocalProgress(read) {
  const raw = await read();
  if (raw === null) return [];
  const ids = JSON.parse(raw);
  if (!Array.isArray(ids) || ids.some((id) => typeof id !== 'string')) {
    throw new Error('Saved device progress is unreadable.');
  }
  return ids;
}

module.exports = { readLocalProgress };
