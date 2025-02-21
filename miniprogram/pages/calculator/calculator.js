Page({
  // 页面的初始数据
  data: {
      // 存储成分信息的数组，初始包含一个空的成分对象
      components: [
          { name: '', concentration: '', temperature: '', unitIndex: 0 }
      ],
      // 控制是否显示删除成分按钮，初始为 false
      showDeleteButton: false,
      // 标记用户是否为管理员，初始为 false
      isAdmin: false,
      // 存储屏幕宽度，初始为 0
      screenWidth: 0,
      // 存储每个成分在三个温度下的最终计算结果
      finalResults: [],
      // 浓度单位选项
      unitOptions: ['%', 'mg/m³', 'ppm', 'μg/m³', 'μmol/mol', 'mol/mol', 'μg/ml', 'mg/L'],
      // 单位换算系数，目前仅实现 % 到小数的换算，其他单位可后续补充
      unitConversionFactors: {
          '%': 0.01
      }
  },

  /**
   * 生命周期函数--监听页面加载
   * 此函数在页面初次加载时执行
   */
  onLoad: function () {
      // 从本地存储中获取用户信息
      const userInfo = wx.getStorageSync('userInfo');
      // 获取系统信息，包含屏幕宽度等信息
      const { windowWidth } = wx.getSystemInfoSync();
      // 将屏幕宽度存储到 data 中
      this.setData({
          screenWidth: windowWidth
      });
      // 检查用户信息是否存在且用户是否为管理员
      if (userInfo && userInfo.is_admin === 1) {
          // 如果是管理员，将 isAdmin 设置为 true
          this.setData({
              isAdmin: true
          });
      }
  },

  /**
   * 更新指定索引的成分对象的某个属性值
   * @param {number} index - 成分对象在 components 数组中的索引
   * @param {string} key - 要更新的属性名
   * @param {any} value - 要更新的属性值
   */
  updateComponent(index, key, value) {
      // 获取当前的 components 数组
      const components = this.data.components;
      // 更新指定索引的成分对象的指定属性值
      components[index][key] = value;
      // 将更新后的 components 数组重新设置到 data 中
      this.setData({ components });
  },

  /**
   * 处理成分名称输入事件
   * @param {Object} e - 事件对象
   */
  inputComponentName({ currentTarget: { dataset: { componentIndex } }, detail: { value: name } }) {
      // 调用 updateComponent 方法更新指定成分的名称
      this.updateComponent(componentIndex, 'name', name);
  },

  /**
   * 处理成分浓度输入事件
   * @param {Object} e - 事件对象
   */
  inputConcentration({ currentTarget: { dataset: { componentIndex } }, detail: { value: concentration } }) {
      // 调用 updateComponent 方法更新指定成分的浓度
      this.updateComponent(componentIndex, 'concentration', concentration);
  },

  /**
   * 处理成分温度输入事件
   * @param {Object} e - 事件对象
   */
  inputTemperature({ currentTarget: { dataset: { componentIndex } }, detail: { value: temperature } }) {
      // 调用 updateComponent 方法更新指定成分的温度
      this.updateComponent(componentIndex, 'temperature', temperature);
  },

  /**
   * 处理单位选择事件
   * @param {Object} e - 事件对象
   */
  bindUnitChange(e) {
      const componentIndex = e.currentTarget.dataset.componentIndex;
      const unitIndex = e.detail.value;
      this.updateComponent(componentIndex, 'unitIndex', unitIndex);
  },

  /**
   * 添加新的成分
   */
  addComponent() {
      // 获取当前的 components 数组
      const components = this.data.components;
      // 计算新成分的索引
      const newComponentIndex = components.length;
      // 生成新成分的默认名称
      const newComponentName = `成分${newComponentIndex}`;
      // 将新成分对象添加到 components 数组中
      components.push({ name: newComponentName, concentration: '', temperature: '', unitIndex: 0 });
      // 如果成分数量大于 1，显示删除成分按钮
      if (components.length > 1) {
          this.setData({ showDeleteButton: true });
      }
      // 将更新后的 components 数组重新设置到 data 中
      this.setData({ components });
  },

  /**
   * 删除最后一个成分
   */
  removeComponent() {
      // 获取当前的 components 数组
      const components = this.data.components;
      // 如果成分数量大于 1，删除最后一个成分
      if (components.length > 1) {
          components.pop();
          // 如果删除后成分数量为 1，隐藏删除成分按钮
          if (components.length === 1) {
              this.setData({ showDeleteButton: false });
          }
      }
      // 将更新后的 components 数组重新设置到 data 中
      this.setData({ components });
  },

  /**
   * 计算压力值
   */
  async calculatePressure() {
      const { components, unitOptions } = this.data;
      const validComponents = components.filter(({ name, concentration, temperature }) => name && concentration && temperature);
      const nameCount = new Set(validComponents.map(({ name }) => name)).size;

      if (nameCount === 0) {
          wx.showToast({
              title: '请输入有效的成分名称、浓度和温度',
              icon: 'none'
          });
          return;
      }

      if (nameCount === 1) {
          const promises = validComponents.map(async ({ name, concentration, temperature, unitIndex }) => {
              try {
                  const numConcentration = parseFloat(concentration);
                  const numTemperature = parseFloat(temperature);
                  const selectedUnit = unitOptions[unitIndex];

                  if (isNaN(numConcentration) || isNaN(numTemperature)) {
                      wx.showToast({
                          title: '浓度和温度输入必须为有效数字',
                          icon: 'none'
                      });
                      return [null, null, null];
                  }

                  let convertedConcentration;
                  switch (selectedUnit) {
                      case '%':
                          convertedConcentration = numConcentration / 100;
                          break;
                      case 'mg/m³':
                          // 调用云函数获取分子量
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
                              convertedConcentration = numConcentration / (molecular_weight / 22.4) / (273.15 / (273.15 + numTemperature)) / 1 / 1000000 * 100;
                          } else {
                              wx.showToast({
                                  title: res.result.message || '查询分子量失败',
                                  icon: 'none'
                              });
                              return [null, null, null];
                          }
                          break;
                      case 'ppm':
                          convertedConcentration = numConcentration / 1000000 * 100 / 100;
                          break;
                      case 'μg/m³':
                          const mgPerM3FromUg = numConcentration / 1000;
                          // 再按 mg/m³ 换算
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
                              convertedConcentration = mgPerM3FromUg / (molecular_weight / 22.4) / (273.15 / (273.15 + numTemperature)) / 1 / 1000000 * 100;
                          } else {
                              wx.showToast({
                                  title: resUg.result.message || '查询分子量失败',
                                  icon: 'none'
                              });
                              return [null, null, null];
                          }
                          break;
                      case 'umol/mol':
                          convertedConcentration = numConcentration / 1000000 * 100 / 100;
                          break;
                      case 'mol/mol':
                          convertedConcentration = numConcentration * 100 / 100;
                          break;
                      case 'ug/ml':
                          const mgPerM3FromUgMl = numConcentration * 1000;
                          // 再按 mg/m³ 换算
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
                              convertedConcentration = mgPerM3FromUgMl / (molecular_weight / 22.4) / (273.15 / (273.15 + numTemperature)) / 1 / 1000000 * 100;
                          } else {
                              wx.showToast({
                                  title: resUgMl.result.message || '查询分子量失败',
                                  icon: 'none'
                              });
                              return [null, null, null];
                          }
                          break;
                      case 'mg/L':
                          const mgPerM3FromMgL = numConcentration * 1000;
                          // 再按 mg/m³ 换算
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
                              convertedConcentration = mgPerM3FromMgL / (molecular_weight / 22.4) / (273.15 / (273.15 + numTemperature)) / 1 / 1000000 * 100;
                          } else {
                              wx.showToast({
                                  title: resMgL.result.message || '查询分子量失败',
                                  icon: 'none'
                              });
                              return [null, null, null];
                          }
                          break;
                      default:
                          wx.showToast({
                              title: `暂不支持 ${selectedUnit} 单位换算`,
                              icon: 'none'
                          });
                          return [null, null, null];
                  }

                  // 调用云函数查询饱和蒸气压
                  const resVapor = await wx.cloud.callFunction({
                      name: 'mysql-function',
                      data: {
                          action: 'getVaporPressure',
                          payload: {
                              productName: name,
                              temperature: numTemperature
                          }
                      }
                  });

                  if (resVapor.result.code === 200) {
                      const { saturated_vapor_pressure_0, saturated_vapor_pressure_10, saturated_vapor_pressure_20 } = resVapor.result.data;

                      const vaporPressure0 = parseFloat(saturated_vapor_pressure_0);
                      const vaporPressure10 = parseFloat(saturated_vapor_pressure_10);
                      const vaporPressure20 = parseFloat(saturated_vapor_pressure_20);

                      const calculateResult = (vaporPressure, temperature) => {
                          const formula1 = (vaporPressure * 0.5) / convertedConcentration / 1000;
                          const formula2 = 1 / (0.5 / vaporPressure) ;
                          const minValue = Math.min(formula1, formula2);
                          // 自定义函数实现直接舍去小数部分保留一位小数
                          const result = Math.floor(minValue * 10) / 10;
                          return result.toString();
                      };

                      const result0 = calculateResult(vaporPressure0, 0);
                      const result10 = calculateResult(vaporPressure10, 10);
                      const result20 = calculateResult(vaporPressure20, 20);

                      return [result0, result10, result20];
                  } else {
                      wx.showToast({
                          title: resVapor.result.message || '查询饱和蒸气压失败',
                          icon: 'none'
                      });
                      return [null, null, null];
                  }
              } catch (error) {
                  console.error('调用云函数出错:', error);
                  wx.showToast({
                      title: '调用云函数出错，请稍后重试',
                      icon: 'none'
                  });
                  return [null, null, null];
              }
          });

          Promise.all(promises).then(finalResults => {
              this.setData({
                  finalResults
              });
          });
      } else {
          this.calculateMultiNamePressure(validComponents);
      }
  },

  /**
   * 处理多成分压力计算（此函数原代码未实现，可后续补充逻辑）
   * @param {Array} validComponents - 有效的成分数组
   */
  calculateMultiNamePressure(validComponents) {
      wx.showToast({
          title: '暂不支持多成分计算',
          icon: 'none'
      });
  },

  /**
   * 处理管理员新增页面的访问事件
   */
  handleAddPageAccess() {
      // 获取当前的 isAdmin 状态
      const { isAdmin } = this.data;
      // 如果是管理员，跳转到新增页面
      if (isAdmin) {
          wx.navigateTo({
              url: '/miniprogram/pages/addChemical/addChemical'
          });
      } else {
          // 如果不是管理员，显示提示信息，告知用户没有权限
          wx.showToast({
              title: '你没有权限访问此页面',
              icon: 'none'
          });
      }
  }
});
