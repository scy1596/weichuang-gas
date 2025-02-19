const cloud = require('wx-server-sdk');
const mysql = require('mysql2/promise');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');


// 封装带有重试机制的数据库查询函数
async function queryWithRetry(sql, values = [], retries = 3) {
  while (retries > 0) {
    try {
      return await pool.query(sql, values);
    } catch (error) {
      if (error.code === 'ECONNRESET' && retries > 1) {
        console.log(`连接被重置，重试第 ${4 - retries} 次...`);
        retries--;
        await new Promise(resolve => setTimeout(resolve, 1000)); // 等待 1 秒后重试
      } else {
        throw error;
      }
    }
  }
}

// 云函数入口函数
exports.main = async (event, context) => {
  const { action, payload } = event;

  switch (action) {
    case 'login':
      return await login(payload);
    case 'addOrUpdateChemical':
      return await addOrUpdateChemical(payload);  // 处理新增物料
    case 'downloadGasmatchingTable':
      return await downloadGasmatchingTable();
    case 'getVaporPressure':
      return await getVaporPressure(payload); // 新增处理查询饱和蒸气压的 action
    default:
      return { code: 400, message: `无效的操作: ${action}` };  // 调试时显示传入的 action
  }
};

// 登录
async function login(payload) {
  const { username, password } = payload;

  try {
    // 查询用户信息
    const [rows] = await queryWithRetry(
      'SELECT * FROM users WHERE username = ? AND password = ?',
      [username, password]
    );

    // 如果没有找到用户或密码不匹配
    if (rows.length === 0) {
      return { code: 401, message: '用户名或密码错误' };
    }

    // 获取用户信息
    const user = rows[0];

    // 检查是否为管理员
    if (user.is_admin === 1) {
      return { code: 200, message: '管理员登录成功', user: user };
    } else {
      return { code: 200, message: '普通用户登录成功', user: user };
    }

  } catch (error) {
    console.error('登录失败：', error);
    return { code: 500, message: '服务器错误', error: error.message };
  }
}

// 新增物料
async function addOrUpdateChemical(payload) {
  const {
    category,
    name,
    coefficient,
    molecular_weight,
    raw_material_purity,
    saturated_vapor_pressure_0,
    saturated_vapor_pressure_10,
    saturated_vapor_pressure_20,
    explosion_lower_limit,
    filling_coefficient,
    density,
    boiling_point,
    explosion_upper_limit
  } = payload;

  // 确保处理空值，转换为空字符串为 null
  const categoryValue = category === '' ? null : category;
  const nameValue = name === '' ? null : name;
  const coefficientValue = coefficient === '' ? null : coefficient;
  const molecularWeightValue = molecular_weight === '' ? null : molecular_weight;
  const rawMaterialPurityValue = raw_material_purity === '' ? null : raw_material_purity;
  const saturatedVaporPressure0 = saturated_vapor_pressure_0 === '' ? null : saturated_vapor_pressure_0;
  const saturatedVaporPressure10 = saturated_vapor_pressure_10 === '' ? null : saturated_vapor_pressure_10;
  const saturatedVaporPressure20 = saturated_vapor_pressure_20 === '' ? null : saturated_vapor_pressure_20;
  const explosionLowerLimit = explosion_lower_limit === '' ? null : explosion_lower_limit;
  const densityValue = density === '' ? null : density;
  const boilingPoint = boiling_point === '' ? null : boiling_point;
  const explosionUpperLimit = explosion_upper_limit === '' ? null : explosion_upper_limit;

  try {
    // 先检查数据库中是否已经有此名称的物料
    const [existingRows] = await queryWithRetry(
      'SELECT * FROM Gasmatching WHERE name = ?',
      [nameValue]
    );

    if (existingRows.length > 0) {
      // 如果物料名称已存在，执行更新操作
      const result = await queryWithRetry(
        'UPDATE Gasmatching SET category = ?, coefficient = ?, molecular_weight = ?, raw_material_purity = ?, saturated_vapor_pressure_0 = ?, saturated_vapor_pressure_10 = ?, saturated_vapor_pressure_20 = ?, explosion_lower_limit = ?, filling_coefficient = ?, density = ?, explosion_upper_limit = ? WHERE name = ?',
        [categoryValue, coefficientValue, molecularWeightValue, rawMaterialPurityValue, saturatedVaporPressure0, saturatedVaporPressure10, saturatedVaporPressure20, explosionLowerLimit, filling_coefficient, densityValue, explosionUpperLimit, nameValue]
      );

      if (result[0].affectedRows > 0) {
        return { code: 201, message: '物料更新成功' };
      } else {
        return { code: 500, message: '物料更新失败' };
      }
    } else {
      // 如果物料名称不存在，执行插入操作
      const result = await queryWithRetry(
        'INSERT INTO Gasmatching (category, name, coefficient, molecular_weight, raw_material_purity, saturated_vapor_pressure_0, saturated_vapor_pressure_10, saturated_vapor_pressure_20, explosion_lower_limit, filling_coefficient, density, explosion_upper_limit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [categoryValue, nameValue, coefficientValue, molecularWeightValue, rawMaterialPurityValue, saturatedVaporPressure0, saturatedVaporPressure10, saturatedVaporPressure20, explosionLowerLimit, filling_coefficient, densityValue, explosionUpperLimit]
      );

      if (result[0].affectedRows > 0) {
        return { code: 201, message: '物料新增成功' };
      } else {
        return { code: 500, message: '物料新增失败' };
      }
    }
  } catch (error) {
    console.error('物料新增/更新失败：', error);
    return { code: 500, message: '服务器错误', error: error.message };
  }
}

// 下载 Gasmatching 表
async function downloadGasmatchingTable() {
  try {
    // 查询 Gasmatching 表的所有数据
    const [rows] = await queryWithRetry('SELECT * FROM Gasmatching');

    // 创建 Excel 工作簿
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Gasmatching');

    // 添加表头
    const columns = Object.keys(rows[0]);
    worksheet.addRow(columns);

    // 处理数据行并添加到工作表
    rows.forEach(row => {
      const processedRow = [];
      for (const key in row) {
        let value = row[key];
        // 尝试将值转换为数字
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
          // 如果转换成功，进行数字处理
          let strValue = numValue.toString();
          if (strValue.includes('.')) {
            // 去掉末尾多余的零
            strValue = strValue.replace(/0+$/,'');
            // 如果去掉零后最后一位是小数点，也去掉
            strValue = strValue.replace(/\.$/,'');
          }
          processedRow.push(strValue);
        } else {
          // 如果转换失败，直接使用原始值
          processedRow.push(value);
        }
      }
      worksheet.addRow(processedRow);
    });

    // 设置单元格自动换行和调整列宽
    worksheet.columns.forEach((column) => {
      column.alignment = { wrapText: true }; // 设置自动换行
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const cellValue = cell.value ? cell.value.toString() : '';
        maxLength = Math.max(maxLength, cellValue.length);
      });
      column.width = maxLength + 2; // 根据内容长度调整列宽，加 2 是为了增加一些边距
    });

    // 将 Excel 文件保存到临时目录
    const tempFilePath = `/tmp/Gasmatching.xlsx`;
    await workbook.xlsx.writeFile(tempFilePath);

    // 检查文件是否存在
    if (!fs.existsSync(tempFilePath)) {
      throw new Error('文件未成功保存到临时目录');
    }

    // 读取文件内容，确认文件是否正确保存
    const fileContent = fs.readFileSync(tempFilePath);
    if (!fileContent || fileContent.length === 0) {
      throw new Error('文件内容为空，保存可能失败');
    }

    // 创建可读流
    const readStream = fs.createReadStream(tempFilePath);

    // 上传文件到云存储
    const cloudPath = `Gasmatching_${Date.now()}.xlsx`;
    const uploadResult = await cloud.uploadFile({
      cloudPath,
      fileContent: readStream // 使用可读流作为文件内容
    });

    // 获取文件的临时链接
    const fileId = uploadResult.fileID;
    const { fileList } = await cloud.getTempFileURL({
      fileList: [fileId]
    });

    const tempFileURL = fileList[0].tempFileURL;

    return { code: 200, message: '文件下载链接获取成功', url: tempFileURL };
  } catch (error) {
    console.error('下载 Gasmatching 表失败：', error);
    return { code: 500, message: '服务器错误', error: error.message };
  }
}

// 根据品名查询饱和蒸气压
async function getVaporPressure(payload) {
  const { productName } = payload;
  try {
      const [rows] = await queryWithRetry(
          'SELECT saturated_vapor_pressure_0, saturated_vapor_pressure_10, saturated_vapor_pressure_20 FROM Gasmatching WHERE name =?',
          [productName]
      );
      
      console.log('查询到的饱和蒸气压数据:', rows); // 添加日志输出

      if (rows.length > 0) {
          return { code: 200, message: '查询成功', data: rows[0] };
      } else {
          return { code: 404, message: '未找到对应的品名信息' };
      }
  } catch (error) {
      console.error('查询饱和蒸气压出错:', error);
      return { code: 500, message: '服务器错误' };
  }
}
