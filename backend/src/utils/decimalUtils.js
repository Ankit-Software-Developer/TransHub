// src/utils/decimalUtils.js

/**
 * Precision arithmetic helpers to prevent JavaScript floating-point errors (e.g., 0.1 + 0.2 !== 0.3)
 */

const toPaisa = (rupees) => {
  if (rupees === null || rupees === undefined || isNaN(rupees)) return 0;
  return Math.round(parseFloat(rupees) * 100);
};

const toRupees = (paisa) => {
  if (paisa === null || paisa === undefined || isNaN(paisa)) return 0;
  return parseFloat((paisa / 100).toFixed(2));
};

const addDecimals = (...amounts) => {
  const sumPaisa = amounts.reduce((acc, curr) => acc + toPaisa(curr), 0);
  return toRupees(sumPaisa);
};

const subtractDecimals = (minuend, ...subtrahends) => {
  const totalSub = subtrahends.reduce((acc, curr) => acc + toPaisa(curr), 0);
  return toRupees(toPaisa(minuend) - totalSub);
};

const multiplyDecimals = (amount, factor) => {
  const p = toPaisa(amount);
  const result = Math.round(p * parseFloat(factor));
  return toRupees(result);
};

const roundToTwo = (num) => {
  return +(Math.round(num + "e+2")  + "e-2");
};

module.exports = {
  toPaisa,
  toRupees,
  addDecimals,
  subtractDecimals,
  multiplyDecimals,
  roundToTwo,
};
