// 去除计算结果中的多余小数位
function strip(num, precision = 12) {
  return +parseFloat(num.toPrecision(precision));
}

// 检查输入是否为有效的数字
function isValidNumber(num) {
  return typeof num === 'number' && !isNaN(num);
}

// 加法运算
function add(num1, num2) {
  if (!isValidNumber(num1) || !isValidNumber(num2)) {
      throw new Error('输入参数必须为有效的数字');
  }
  const num1Digits = (num1.toString().split('.')[1] || '').length;
  const num2Digits = (num2.toString().split('.')[1] || '').length;
  const baseNum = Math.pow(10, Math.max(num1Digits, num2Digits));
  return strip((num1 * baseNum + num2 * baseNum) / baseNum);
}

// 减法运算
function subtract(num1, num2) {
  return add(num1, -num2);
}

// 乘法运算
function multiply(num1, num2) {
  if (!isValidNumber(num1) || !isValidNumber(num2)) {
      throw new Error('输入参数必须为有效的数字');
  }
  const num1Str = num1.toString();
  const num2Str = num2.toString();
  const num1Digits = (num1Str.split('.')[1] || '').length;
  const num2Digits = (num2Str.split('.')[1] || '').length;
  const intNum1 = Number(num1Str.replace('.', ''));
  const intNum2 = Number(num2Str.replace('.', ''));
  return strip((intNum1 * intNum2) / Math.pow(10, num1Digits + num2Digits));
}

// 除法运算
function divide(num1, num2) {
  if (!isValidNumber(num1) || !isValidNumber(num2)) {
      throw new Error('输入参数必须为有效的数字');
  }
  if (num2 === 0) {
      throw new Error('除数不能为零');
  }
  const num1Str = num1.toString();
  const num2Str = num2.toString();
  const num1Digits = (num1Str.split('.')[1] || '').length;
  const num2Digits = (num2Str.split('.')[1] || '').length;
  const intNum1 = Number(num1Str.replace('.', ''));
  const intNum2 = Number(num2Str.replace('.', ''));
  return strip((intNum1 / intNum2) * Math.pow(10, num2Digits - num1Digits));
}

module.exports = {
  add,
  subtract,
  multiply,
  divide
};
