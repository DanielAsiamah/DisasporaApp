'use strict';

async function readRemoteProgress(load, { schedule = setTimeout, cancel = clearTimeout } = {}) {
  let timer;
  const deadline = new Promise((resolve) => {
    timer = schedule(() => resolve({ status: 'error', value: null }), 10000);
  });
  try {
    return await Promise.race([
      Promise.resolve().then(load)
        .then((value) => ({ status: 'success', value }))
        .catch(() => ({ status: 'error', value: null })),
      deadline,
    ]);
  } finally {
    cancel(timer);
  }
}

module.exports = { readRemoteProgress };
