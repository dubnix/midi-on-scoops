'use strict';

const scribble = require('scribbletune');

const RE_TOKENIZE = /[*/]+|[\dx._-]+|(?:[a-z]{2,}|[a-g][#b]?)\S*/ig;
const RE_NOTES = /^(?:[a-z]{2,}|[a-g][#b]?|#\d+)$/i;
const RE_CHORDS = /^[a-g][#b]?\w{1,5}-?[0-8]*$/i;
const RE_RANGE = /^-?[\d.]+\.\.-?[\d.]+$/;
const RE_DUPLICATE = /^\d+[\d.]*x\d+$/;
const RE_NUMBER = /^-?\d+(?:\.\d+)?$/;
const RE_SPREAD = /^\.{2,3}$/;
const RE_PATTERN = /^[x_-]+$/;
const RE_MUL = /^\*$/;
const RE_DIV = /^\/$/;

function add(out, value) {
  Array.prototype.push.apply(out, value);
}

function push(out, value) {
  if (RE_PATTERN.test(value)) add(out, value.split(''));
  if (RE_NUMBER.test(value)) add(out, [parseFloat(value)]);

  return out;
}

function repeat(value) {
  const set = value.split('x');
  const acc = [];

  for (let i = 0; i < set[1]; i += 1) {
    acc.push(parseFloat(set[0]));
  }

  return acc;
}

function range(min, max, step) {
  if (!step) {
    return [min, 'RANGE', max];
  }

  const diff = (max - min) / step;
  const acc = [];

  for (let i = parseFloat(min); i <= max; i += diff) {
    acc.push(i);
  }

  return acc;
}

function div(value, times) {
  if (RE_RANGE.test(value)) {
    const set = value.split('..');

    return range(set[0], set[1], times);
  }

  return [value / times];
}

function splice(out, value) {
  const set = value.split('..');

  if (set[0] > 0) out.splice(0, set[0]);

  out.splice(set[1]);
}

function sequence(out, value) {
  out.splice(out.length - value.length);

  const octave = RE_NUMBER.test(value[value.length - 1])
    ? parseInt(value.pop(), 10)
    : 3;

  const note = value.shift();
  const mode = value.join(' ') || undefined;

  add(out, scribble.mode(note, mode, octave));
}

module.exports = expression => {
  if (!expression || typeof expression !== 'string') {
    throw new Error(`Expecting a valid string, given '${expression}'`);
  }

  const tokens = expression.match(RE_TOKENIZE);
  const acc = [];

  let value;
  let capture;
  let offset = 0;

  while (offset < tokens.length) {
    const prev = tokens[offset - 1] || '';
    const token = tokens[offset];
    const nextToken = tokens[offset + 1] || '';

    if (!(RE_DIV.test(token) || RE_MUL.test(token) || RE_SPREAD.test(token)
      || RE_NUMBER.test(token) || RE_NOTES.test(token) || RE_PATTERN.test(token)
      || RE_CHORDS.test(token) || RE_RANGE.test(token) || RE_DUPLICATE.test(token))) {
      throw new Error(`Expecting a valid expression, given '${token}'`);
    }

    if (RE_CHORDS.test(token)) {
      add(acc, [token]);
      offset += 1;
      continue;
    }

    if (RE_SPREAD.test(token)) {
      if (!prev) {
        throw new Error(`Expecting a valid chord, given '${prev} ${token}'`);
      }

      const chord = scribble.chord(prev);

      if (!chord.length) {
        throw new Error(`Expecting a valid chord, given '${prev}'`);
      }

      acc.splice(-1);
      add(acc, chord);
      offset += 1;
      continue;
    }

    if (!nextToken && !prev) {
      push(acc, token);
    }

    if (RE_NOTES.test(prev)) {
      value = value || [];
      value.push(prev);

      if (!RE_NUMBER.test(nextToken)) {
        sequence(acc, value.concat(token));

        if (RE_RANGE.test(nextToken)) {
          splice(acc, nextToken);
          offset += 1;
        }

        value = null;
        offset += 1;
      }

      offset += 1;
      continue;
    }

    if (RE_NOTES.test(token) && !nextToken) {
      sequence(acc, [token]);
      offset += 1;
      continue;
    }

    if (RE_RANGE.test(token)) {
      if (!RE_DIV.test(nextToken)) {
        splice(acc, token);
        offset += 1;
        continue;
      }

      if (prev) {
        push(acc, prev);
      }
    }

    if (RE_DUPLICATE.test(token)) {
      add(acc, repeat(token));
      offset += 1;
      continue;
    }

    if (RE_DIV.test(token)) {
      if (!prev || !RE_NUMBER.test(prev)) {
        throw new Error(`Expecting a valid number, given '${prev} / ${nextToken}'`);
      }
    }

    if (RE_MUL.test(nextToken) || RE_DIV.test(nextToken)) {
      capture = true;
      value = token;
      offset += 2;
      continue;
    }

    if (RE_PATTERN.test(nextToken) || RE_NUMBER.test(nextToken)) {
      if (token) push(acc, token);
      offset += 1;
      continue;
    }

    if (RE_DIV.test(token) || RE_MUL.test(token) || RE_SPREAD.test(token)) {
      if (!prev) {
        throw new Error(`Expecting a valid first, given '${token}'`);
      }

      if (RE_DIV.test(token) && !(RE_NUMBER.test(prev) || RE_RANGE.test(prev))) {
        throw new Error(`Expecting a valid number first, given '${prev}'`);
      }
    }

    if (prev && !(RE_DIV.test(prev) || RE_MUL.test(prev))) {
      if (token) push(acc, token);
    }

    if (capture) {
      if (RE_DIV.test(prev)) {
        if (RE_RANGE.test(value)) {
          add(acc, div(value, token));
          offset += 1;
          continue;
        }

        if (!(RE_NUMBER.test(value) && RE_NUMBER.test(token))) {
          throw new Error(`Expecting a valid number, given '${value} / ${token}'`);
        }

        push(acc, value / token);
      }

      if (RE_MUL.test(prev)) {
        if (!RE_NUMBER.test(token)) {
          throw new Error(`Expect a valid number, given '${value} * ${token}'`);
        }

        if (RE_NUMBER.test(value)) push(acc, value * token);
        else push(acc, value.repeat(token));
      }

      value = null;
      capture = null;
    } else if (RE_MUL.test(prev)) {
      const copy = acc.slice();

      let max = token;

      while (max-- > 1) {
        add(acc, copy);
      }
    }

    offset++;
  }

  return acc;
};