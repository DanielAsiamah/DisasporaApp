'use strict';

function removeUndefined(value) {
  if (Array.isArray(value)) return value.map(removeUndefined);
  if (value && typeof value === 'object'
    && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)) {
    return Object.fromEntries(Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .map(([key, item]) => [key, removeUndefined(item)]));
  }
  return value;
}

function buildAnswerRecord(answer, answeredAt) {
  return { ...removeUndefined(answer), answeredAt };
}

module.exports = { removeUndefined, buildAnswerRecord };
