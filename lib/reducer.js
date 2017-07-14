'use strict';

module.exports = function reduce(input, context) {
  return input.reduce((prev, cur) => {
    if (typeof cur === 'string' && cur.charAt() === '%') {
      let value = cur === '%'
        ? prev[prev.length - 1]
        : (context[cur] && context[cur].input);

      if (!value) {
        throw new Error(`Expecting a value for ${cur}, given '${value}'`);
      }

      value = typeof value === 'string' && value.indexOf('%') > -1
        ? reduce([value], context)
        : value;

      if (cur === '%') {
        prev.push(value);
      } else {
        Array.prototype.push.apply(prev, !Array.isArray(value) && value
          ? [value]
          : value);
      }
    } else {
      prev.push(cur);
    }

    return prev;
  }, []);
};