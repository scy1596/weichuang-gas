Page({
  data: {
    category: '',
    name: '',
    coefficient: '',
    molecular_weight: '',
    raw_material_purity: '',
    saturated_vapor_pressure_0: '',
    saturated_vapor_pressure_10: '',
    saturated_vapor_pressure_20: '',
    explosion_lower_limit: '',
    filling_coefficient: '',
    density: '',
    boiling_point: '',
    explosion_upper_limit: '',
    isAddingOrUpdating: false, // 提交新增/更新的加载状态
    isDownloading: false // 下载并预览表格的加载状态
  },

  // 处理输入框数据
  inputField: function (e) {
    const field = e.currentTarget.dataset.field;
    this.setData({
      [field]: e.detail.value
    });
  },

  // 提交数据函数（更新或添加）
  addOrUpdateChemical: function () {
    // 设置提交状态为正在加载
    this.setData({
      isAddingOrUpdating: true
    });
    let chemicalData = this.data;

    // 确保字段为空时传递 null，而不是空字符串
    for (let key in chemicalData) {
      if (chemicalData[key] === '') {
        chemicalData[key] = null;
      }
    }

    console.log('Submitting chemical data:', chemicalData);

    // 调用云函数来进行添加或更新
    wx.cloud.callFunction({
      name: 'mysql-function',
      data: {
        action: 'addOrUpdateChemical', // 云函数的操作名称
        payload: chemicalData
      },
      success: res => {
        console.log('云函数调用结果:', res);  // 打印云函数返回的结果
        if (res.result.code === 201) {
          // 成功插入或更新数据库
          wx.showToast({
            title: '添加/更新成功',
            icon: 'success',
            duration: 2000
          });
          this.resetForm();  // 清空表单
        } else if (res.result.code === 500) {
          wx.showToast({
            title: res.result.message || '添加/更新失败',
            icon: 'none',
            duration: 2000
          });
        } else {
          // 如果返回的是其他code，可以处理
          wx.showToast({
            title: '未知错误',
            icon: 'none',
            duration: 2000
          });
        }
      },
      fail: err => {
        console.error('云函数调用失败：', err);
        wx.showToast({
          title: '服务器错误',
          icon: 'none',
          duration: 2000
        });
      },
      complete: () => {
        // 无论成功还是失败，操作完成后都将加载状态设置为 false
        this.setData({
          isAddingOrUpdating: false
        });
      }
    });
  },

  // 下载表格函数
  downloadTable: function () {
    // 设置下载状态为正在加载
    this.setData({
      isDownloading: true
    });

    wx.cloud.callFunction({
      name: 'mysql-function',
      data: {
        action: 'downloadGasmatchingTable'
      },
      success: res => {
        console.log('云函数调用结果:', res);
        if (res.result.code === 200) {
          const url = res.result.url;
          // 下载文件
          wx.downloadFile({
            url,
            success: downloadRes => {
              if (downloadRes.statusCode === 200) {
                const filePath = downloadRes.tempFilePath;
                // 打开文件
                wx.openDocument({
                  filePath,
                  success: () => {
                    console.log('文件打开成功');
                    wx.showToast({
                      title: '文件下载并打开',
                      icon: 'success',
                      duration: 2000
                    });
                  },
                  fail: err => {
                    console.error('文件打开失败：', err);
                    wx.showToast({
                      title: '文件打开失败',
                      icon: 'none',
                      duration: 2000
                    });
                  }
                });
              } else {
                console.error('文件下载失败：', downloadRes);
                wx.showToast({
                  title: '文件下载失败',
                  icon: 'none',
                  duration: 2000
                });
              }
            },
            fail: err => {
              console.error('文件下载失败：', err);
              wx.showToast({
                title: '文件下载失败',
                icon: 'none',
                duration: 2000
              });
            }
          });
        } else {
          wx.showToast({
            title: res.result.message || '下载失败',
            icon: 'none',
            duration: 2000
          });
        }
      },
      fail: err => {
        console.error('云函数调用失败：', err);
        wx.showToast({
          title: '服务器错误',
          icon: 'none',
          duration: 2000
        });
      },
      complete: () => {
        // 无论成功还是失败，操作完成后都将加载状态设置为 false
        this.setData({
          isDownloading: false
        });
      }
    });
  },

  // 清空表单数据
  resetForm: function () {
    this.setData({
      category: '',
      name: '',
      coefficient: '',
      molecular_weight: '',
      raw_material_purity: '',
      saturated_vapor_pressure_0: '',
      saturated_vapor_pressure_10: '',
      saturated_vapor_pressure_20: '',
      explosion_lower_limit: '',
      filling_coefficient: '',
      density: '',
      boiling_point: '',
      explosion_upper_limit: ''
    }, () => {
      console.log('表单数据清空完成');
    });
  }
});