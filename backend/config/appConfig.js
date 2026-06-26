const placeholderCount = parseInt(process.env.PLACEHOLDER_COUNT || '60', 10);
const placeholderRollFormat = process.env.PLACEHOLDER_ROLL_FORMAT || '{branch}-{section}-{seq:03}';

const formatRoll = (fmt, vars) => {
  return String(fmt).replace(/\{([a-zA-Z0-9_]+)(?::(\d+))?\}/g, (_, key, pad) => {
    if (key === 'seq') {
      const s = String(vars.seq || '0');
      if (pad) return s.padStart(parseInt(pad, 10), '0');
      return s;
    }
    return String(vars[key] ?? '').replace(/\s+/g, '').toUpperCase();
  });
};

export default {
  placeholderCount,
  placeholderRollFormat,
  formatRoll,
};
