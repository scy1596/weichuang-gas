// calculator.js
const { add, subtract, multiply, divide,convertConcentration } = require('../../utils/mathPrecise.js');

Page({
    // 页面的初始数据
    data: {
        components: [
            { name: '', concentration: '', temperature: '', unitIndex: 0 }
        ],
        buttonText: '计算压力',
        buttonStatus: 'normal',
        showDeleteButton: false,
        isAdmin: false,
        screenWidth: 0,
        finalResults: [],
        unitOptions: ['%', 'mg/m³', 'ppm', 'ug/m³', 'umol/mol', 'mol/mol', 'ug/ml', 'mg/L'],
    },

    onLoad: function () {
        const userInfo = wx.getStorageSync('userInfo');
        const { windowWidth } = wx.getSystemInfoSync();
        this.setData({
            screenWidth: windowWidth
        });
        if (userInfo && userInfo.is_admin === 1) {
            this.setData({
                isAdmin: true
            });
        }
    },

    updateComponent(index, key, value) {
        const components = this.data.components;
        components[index][key] = value;
        this.setData({ components });
    },

    inputComponentName({ currentTarget: { dataset: { componentIndex } }, detail: { value: name } }) {
        this.updateComponent(componentIndex, 'name', name);
    },

    inputConcentration({ currentTarget: { dataset: { componentIndex } }, detail: { value: concentration } }) {
        this.updateComponent(componentIndex, 'concentration', concentration);
    },

    inputTemperature({ currentTarget: { dataset: { componentIndex } }, detail: { value: temperature } }) {
        this.updateComponent(componentIndex, 'temperature', temperature);
    },

    bindUnitChange(e) {
        const componentIndex = e.currentTarget.dataset.componentIndex;
        const unitIndex = e.detail.value;
        this.updateComponent(componentIndex, 'unitIndex', unitIndex);
    },

    addComponent() {
        const components = this.data.components;
        const newComponentIndex = components.length;
        const newComponentName = `成分${newComponentIndex}`;
        components.push({ name: newComponentName, concentration: '', temperature: '', unitIndex: 0 });
        if (components.length > 1) {
            this.setData({ showDeleteButton: true });
        }
        this.setData({ components });
    },

    removeComponent() {
        const components = this.data.components;
        if (components.length > 1) {
            components.pop();
            if (components.length === 1) {
                this.setData({ showDeleteButton: false });
            }
        }
        this.setData({ components });
    },
    //计算核心代码
    async calculatePressure() {
      this.setData({
        buttonText: '计算中...',
        buttonStatus: 'calculating'
      });

      const { components, unitOptions } = this.data;
      const validComponents = components.filter(({ name, concentration }) => name && concentration );
      const nameCount = new Set(validComponents.map(({ name }) => name)).size;
  
      if (nameCount === 0) {
          wx.showToast({
              title: '请输入有效的成分名称、浓度和温度',
              icon: 'none'
          });
          //恢复按钮状态
          this.setData({
            buttonText: '计算压力',
            buttonStatus: 'normal'
          });
          return;
      }
  
      if (nameCount === 1) {
        const promises = validComponents.map(async ({ name, concentration, unitIndex }) => {
            try {
                const numConcentration = parseFloat(concentration);
                const selectedUnit = unitOptions[unitIndex];

                if (isNaN(numConcentration)) {
                    wx.showToast({
                        title: '浓度输入必须为有效数字',
                        icon: 'none'
                    });
                    return [null, null, null];
                }

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
                      
                          // 温度因子
                          const tempFactor = divide(273.15, add(273.15, 20));
                      
                          // 先计算分子量除以22.4
                          const mwDiv22_4 = divide(mw, 22.4);
                      
                          // 用输入浓度除以分子量除以22.4的结果
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
                            return [null, null, null];
                        }
                        break;
                    case 'ppm':
                        convertedConcentration = divide(numConcentration, 10000);
                        console.log(`成分: ${name}，单位为 ppm，转换后的浓度: ${convertedConcentration}`);
                        break;
                    case 'μg/m³':
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
                            console.log(`成分: ${name}，单位为 μg/m³，转换后的浓度: ${convertedConcentration}`);
                        } else {
                            wx.showToast({
                                title: resUg.result.message || '查询分子量失败',
                                icon: 'none'
                            });
                            return [null, null, null];
                        }
                        break;
                    case 'μmol/mol':
                        convertedConcentration = divide(numConcentration, 10000);
                        console.log(`成分: ${name}，单位为 μmol/mol，转换后的浓度: ${convertedConcentration}`);
                        break;
                    case 'mol/mol':
                        convertedConcentration = multiply(numConcentration, 100);
                        console.log(`成分: ${name}，单位为 mol/mol，转换后的浓度: ${convertedConcentration}`);
                        break;
                    case 'μg/ml':
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
                            console.log(`成分: ${name}，单位为 μg/ml，转换后的浓度: ${convertedConcentration}`);
                        } else {
                            wx.showToast({
                                title: resUgMl.result.message || '查询分子量失败',
                                icon: 'none'
                            });
                            return [null, null, null];
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

                // 保留小数点后 6 位
                convertedConcentration = parseFloat(convertedConcentration.toFixed(6));
                console.log(`成分: ${name}，保留 6 位小数后的浓度: ${convertedConcentration}`);

                const parsedConcentration = parseFloat(convertedConcentration);
                if (isNaN(parsedConcentration) ||!isFinite(parsedConcentration)) {
                    wx.showToast({
                        title: '浓度转换结果无效',
                        icon: 'none'
                    });
                    return [null, null, null];
                }
                convertedConcentration = parsedConcentration;

                const resVapor = await wx.cloud.callFunction({
                    name: 'mysql-function',
                    data: {
                        action: 'getVaporPressure',
                        payload: {
                            productName: name
                        }
                    }
                });

                if (resVapor.result.code === 200) {
                    const { saturated_vapor_pressure_0, saturated_vapor_pressure_10, saturated_vapor_pressure_20 } = resVapor.result.data;
                    const isValidVaporPressures = [saturated_vapor_pressure_0, saturated_vapor_pressure_10, saturated_vapor_pressure_20].every(pressure => {
                        const parsed = parseFloat(pressure);
                        return!isNaN(parsed) && isFinite(parsed);
                    });
                    if (!isValidVaporPressures) {
                        wx.showToast({
                            title: '获取的饱和蒸气压值无效',
                            icon: 'none'
                        });
                        return [null, null, null];
                    }

                    const calculateResult = (vaporPressure, temperature) => {
                        const parsedVaporPressure = parseFloat(vaporPressure);
                        if (isNaN(parsedVaporPressure) ||!isFinite(parsedVaporPressure) || isNaN(convertedConcentration) ||!isFinite(convertedConcentration)) {
                            console.error(`成分: ${name}，温度 ${temperature}，输入参数无效，vaporPressure: ${vaporPressure}, convertedConcentration: ${convertedConcentration}`);
                            return null;
                        }
                        const EPSILON = 1e-10;
                        console.log(`判断 vaporPressure 是否为 0，当前 parsedVaporPressure: ${parsedVaporPressure}`);
                        if (Math.abs(parsedVaporPressure) < EPSILON) {
                            console.log(`成分: ${name}，温度 ${temperature}，饱和蒸气压近似为 0，计算结果直接返回 0`);
                            return '0';
                        }
                        console.log(`进入 calculateResult 函数，vaporPressure: ${parsedVaporPressure}, convertedConcentration: ${convertedConcentration}`);

                        // 公式一计算
                        const formula1Concentration = divide(parsedConcentration, 100);
                        let formula1 = divide(multiply(parsedVaporPressure, 0.5), formula1Concentration);
                        console.log(`公式1中间计算结果: ${formula1}`);
                        formula1 = divide(formula1, 1000);
                        console.log(`成分: ${name}，温度 ${temperature}，公式1计算结果: ${formula1}`);

                        // 公式二
                        let formula2 = divide(1, divide(parsedConcentration, parsedVaporPressure));
                        console.log(`被除值多少: ${divide(parsedConcentration, parsedVaporPressure)}`);
                        console.log(`parsedConcentration: ${typeof parsedConcentration}，parsedVaporPressure ${typeof parsedVaporPressure}`);
                        formula2 = divide(formula2, 10);
                        console.log(`成分: ${name}，温度 ${temperature}，公式2计算结果: ${formula2}`);

                        let minValue;
                        if (formula1 > formula2) {
                            minValue = formula2;
                        } else {
                            minValue = formula1;
                        }

                        console.log(`准备调用 multiply，minValue: ${minValue}, 乘数: 100`);
                        //调用 multiply 函数，将 minValue 乘以 100
                        const temp = multiply(minValue, 1000);
                        const floorValue = Math.floor(temp);
                        //调用 divide 函数，将 floorValue 除以 100
                        const result = divide(floorValue, 1000);
                        const finalResult = Math.min(parseFloat(result), 10);
                        console.log(`成分: ${name}，温度 ${temperature}，最终计算结果: ${finalResult}`);
                        return finalResult.toFixed(3);
                    };

                    const result0 = calculateResult(saturated_vapor_pressure_0, 0);
                    const result10 = calculateResult(saturated_vapor_pressure_10, 10);
                    const result20 = calculateResult(saturated_vapor_pressure_20, 20);

                    return [result0, result10, result20];
                  } else {
                      wx.showToast({
                          title: resVapor.result.message || '查询饱和蒸气压失败',
                          icon: 'none'
                      });
                      return [null, null, null];
                  }
              } catch (error) {
                  console.error(`成分: ${name}，计算出错:`, error);
                  wx.showToast({
                      title: '计算出错，请检查输入',
                      icon: 'none'
                  });
                  return [null, null, null];
              }
          });
  
          try {
            const finalResults = await Promise.all(promises);
            this.setData({
              finalResults
            });
            // 更新按钮状态为计算完成
            this.setData({
              buttonText: '计算完成,点击可再次计算',
              buttonStatus: 'completed'
            });
          } catch (error) {
            console.error('计算过程出错:', error);
            wx.showToast({
              title: '计算过程出错，请重试',
              icon: 'none'
            });
            // 恢复按钮状态
            this.setData({
              buttonText: '计算压力',
              buttonStatus: 'normal'
            });
          }
        } else {
          //多组分计算逻辑
          wx.showToast({
            title: '暂不支持多成分计算',
            icon: 'none'
          });
          // 恢复按钮状态
          this.setData({
            buttonText: '计算压力',
            buttonStatus: 'normal'
          });
        }
      },

    
    handleLogout() {
      console.log('用户点击了退出登录按钮');
      // 这里可以添加退出登录的逻辑，例如清除缓存、跳转到登录页等
      wx.removeStorageSync('userInfo'); // 清除用户信息缓存
      wx.navigateTo({
          url: '/miniprogram/pages/login/login' // 跳转到登录页
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
