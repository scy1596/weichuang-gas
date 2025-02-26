// 去除计算结果中的多余小数位
function strip(num, precision = 50) {
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

//除法计算
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

// 提取单位转换逻辑到单独的函数
async function convertConcentrationToPercentage(name, numConcentration, selectedUnit) {
  let convertedConcentration;
  switch (selectedUnit) {
      case '%':
          convertedConcentration = numConcentration;
          console.log(`成分: ${name}，单位为 %，转换后的浓度: ${convertedConcentration}`);
          break;
      case 'mg/m³':
          const res = await wx.cloud.callFunction({
              name: 'mysql-function',
              data: {
                  action: 'getMolecularWeight',
                  payload: {
                      productName: name
                  }
              }
          });
          if (res.result.code === 200) {
              const { molecular_weight } = res.result.data;
              const mw = parseFloat(molecular_weight);
              const tempFactor = divide(273.15, add(273.15, 20));
              const mwDiv22_4 = divide(mw, 22.4);
              let intermediateResult = divide(numConcentration, mwDiv22_4);
              intermediateResult = divide(intermediateResult, tempFactor);
              convertedConcentration = intermediateResult;
              convertedConcentration = divide(convertedConcentration, 1000000);
              convertedConcentration = multiply(convertedConcentration, 100);
              console.log(`成分: ${name}，单位为 mg/m³，转换后的浓度: ${convertedConcentration}`);
          } else {
              wx.showToast({
                  title: res.result.message || '查询分子量失败',
                  icon: 'none'
              });
              return null;
          }
          break;
      case 'ppm':
          convertedConcentration = divide(numConcentration, 10000);
          console.log(`成分: ${name}，单位为 ppm，转换后的浓度: ${convertedConcentration}`);
          break;
      case 'ug/m³':
          const resUg = await wx.cloud.callFunction({
              name: 'mysql-function',
              data: {
                  action: 'getMolecularWeight',
                  payload: {
                      productName: name
                  }
              }
          });
          if (resUg.result.code === 200) {
              const { molecular_weight } = resUg.result.data;
              const mw = parseFloat(molecular_weight);
              const tempFactor = divide(273.15, add(273.15, 20));
              const mgPerM3 = divide(numConcentration, 1000);
              convertedConcentration = divide(mgPerM3, divide(mw, 22.4));
              convertedConcentration = divide(convertedConcentration, tempFactor);
              convertedConcentration = divide(convertedConcentration, 1);
              convertedConcentration = divide(convertedConcentration, 1000000);
              convertedConcentration = multiply(convertedConcentration, 100);
              console.log(`成分: ${name}，单位为 ug/m³，转换后的浓度: ${convertedConcentration}`);
          } else {
              wx.showToast({
                  title: resUg.result.message || '查询分子量失败',
                  icon: 'none'
              });
              return null;
          }
          break;
      case 'umol/mol':
          convertedConcentration = divide(numConcentration, 10000);
          console.log(`成分: ${name}，单位为 umol/mol，转换后的浓度: ${convertedConcentration}`);
          break;
      case 'mol/mol':
          convertedConcentration = multiply(numConcentration, 100);
          console.log(`成分: ${name}，单位为 mol/mol，转换后的浓度: ${convertedConcentration}`);
          break;
      case 'ug/ml':
          const resUgMl = await wx.cloud.callFunction({
              name: 'mysql-function',
              data: {
                  action: 'getMolecularWeight',
                  payload: {
                      productName: name
                  }
              }
          });
          if (resUgMl.result.code === 200) {
              const { molecular_weight } = resUgMl.result.data;
              const mw = parseFloat(molecular_weight);
              const tempFactor = divide(273.15, add(273.15, 20));
              const mgPerM3 = multiply(numConcentration, 1000);
              convertedConcentration = divide(mgPerM3, divide(mw, 22.4));
              convertedConcentration = divide(convertedConcentration, tempFactor);
              convertedConcentration = divide(convertedConcentration, 1);
              convertedConcentration = divide(convertedConcentration, 1000000);
              convertedConcentration = multiply(convertedConcentration, 100);
              console.log(`成分: ${name}，单位为 ug/ml，转换后的浓度: ${convertedConcentration}`);
          } else {
              wx.showToast({
                  title: resUgMl.result.message || '查询分子量失败',
                  icon: 'none'
              });
              return null;
          }
          break;
      case 'mg/L':
          const resMgL = await wx.cloud.callFunction({
              name: 'mysql-function',
              data: {
                  action: 'getMolecularWeight',
                  payload: {
                      productName: name
                  }
              }
          });
          if (resMgL.result.code === 200) {
              const { molecular_weight } = resMgL.result.data;
              const mw = parseFloat(molecular_weight);
              const tempFactor = divide(273.15, add(273.15, 20));
              const mgPerM3 = multiply(numConcentration, 1000);
              convertedConcentration = divide(mgPerM3, divide(mw, 22.4));
              convertedConcentration = divide(convertedConcentration, tempFactor);
              convertedConcentration = divide(convertedConcentration, 1);
              convertedConcentration = divide(convertedConcentration, 1000000);
              convertedConcentration = multiply(convertedConcentration, 100);
              console.log(`成分: ${name}，单位为 mg/L，转换后的浓度: ${convertedConcentration}`);
          } else {
              wx.showToast({
                  title: resMgL.result.message || '查询分子量失败',
                  icon: 'none'
              });
              return null;
          }
          break;
      default:
          wx.showToast({
              title: `暂不支持 ${selectedUnit} 单位换算`,
              icon: 'none'
          });
          return null;
  }

  // 保留小数点后 6 位
  convertedConcentration = parseFloat(convertedConcentration.toFixed(6));
  console.log(`成分: ${name}，保留 6 位小数后的浓度: ${convertedConcentration}`);

  const parsedConcentration = parseFloat(convertedConcentration);
  if (isNaN(parsedConcentration) ||!isFinite(parsedConcentration)) {
      wx.showToast({
          title: '浓度转换结果无效',
          icon: 'none'
      });
      return null;
  }
  return parsedConcentration;
}
module.exports = {
  add,
  subtract,
  multiply,
  divide,
  convertConcentrationToPercentage
};
