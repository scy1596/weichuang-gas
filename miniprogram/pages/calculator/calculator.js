Page({
  // 页面的初始数据
  data: {
    // 存储成分信息的数组，初始包含一个空的成分对象
    components: [
      { name: '', concentration: '' }
    ],
    // 控制是否显示删除成分按钮，初始为 false
    showDeleteButton: false,
    // 标记用户是否为管理员，初始为 false
    isAdmin: false,
    // 存储屏幕宽度，初始为 0
    screenWidth: 0,
    // 存储每个成分在三个温度下的最终计算结果
    finalResults: []
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
    components.push({ name: newComponentName, concentration: '' });
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
  calculatePressure() {
    const { components } = this.data;
    const validComponents = components.filter(({ name, concentration }) => name && concentration);
    const nameCount = new Set(validComponents.map(({ name }) => name)).size;

    if (nameCount === 0) {
        wx.showToast({
            title: '请输入有效的成分名称和浓度',
            icon: 'none'
        });
        return;
    }

    if (nameCount === 1) {
        const promises = validComponents.map(async ({ name, concentration }) => {
            try {
                console.log('原始输入的浓度:', concentration); 
                const numConcentration = parseFloat(concentration) / 100; 
                console.log('转换后的浓度:', numConcentration); 

                if (isNaN(numConcentration)) {
                    wx.showToast({
                        title: '浓度输入必须为有效数字',
                        icon: 'none'
                    });
                    return [null, null, null];
                }

                if (numConcentration === 0) {
                    wx.showToast({
                        title: '浓度不能为 0，请重新输入',
                        icon: 'none'
                    });
                    return [null, null, null];
                }

                // 调用云函数查询饱和蒸气压
                const res = await wx.cloud.callFunction({
                    name: 'mysql-function',
                    data: {
                        action: 'getVaporPressure',
                        payload: {
                            productName: name
                        }
                    }
                });

                console.log('接收到的饱和蒸气压数据:', res.result); 

                if (res.result.code === 200) {
                    const { saturated_vapor_pressure_0, saturated_vapor_pressure_10, saturated_vapor_pressure_20 } = res.result.data;

                    const vaporPressure0 = parseFloat(saturated_vapor_pressure_0);
                    const vaporPressure10 = parseFloat(saturated_vapor_pressure_10);
                    const vaporPressure20 = parseFloat(saturated_vapor_pressure_20);

                    const calculateResult = (vaporPressure, temperature) => {
                       
                        const formula1 = (vaporPressure * 0.5) / numConcentration / 1000;
                        const formula2 = 1 / (0.5 / vaporPressure)/10;
                        console.log(`公式 1 在 ${temperature}℃ 计算结果:`, formula1);
                        console.log(`公式 2 在 ${temperature}℃ 计算结果:`, formula2);
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
                        title: res.result.message || '查询饱和蒸气压失败',
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