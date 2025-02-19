Page({
  data: {
    username: '',
    password: '',
    isLoggingIn: false, // 用于控制登录按钮状态
    logoSrc: '' // 存储 logo 图片的临时路径
  },

  // 输入防抖函数
  debounce(func, delay) {
    let timer = null;
    return function (...args) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        func.apply(this, args);
      }, delay);
    };
  },

  // 绑定用户名输入
  bindUsername: function (e) {
    const debouncedSetUsername = this.debounce((value) => {
      this.setData({
        username: value
      });
    }, 300);
    debouncedSetUsername(e.detail.value);
  },

  // 绑定密码输入
  bindPassword: function (e) {
    const debouncedSetPassword = this.debounce((value) => {
      this.setData({
        password: value
      });
    }, 300);
    debouncedSetPassword(e.detail.value);
  },

  // 页面加载时预加载 logo 图片
  onLoad: function () {
    const logoUrl = 'cloud://weichuang-9gfoj56n60440bfb.7765-weichuang-9gfoj56n60440bfb-1323854283/图标/截屏2025-02-14 17.03.03.png';
    wx.getStorage({
      key: 'logoImage',
      success: (res) => {
        // 如果缓存中存在图片，直接使用
        this.setData({
          logoSrc: res.data
        });
      },
      fail: () => {
        // 如果缓存中不存在图片，从云存储加载
        wx.cloud.downloadFile({
          fileID: logoUrl,
          success: (res) => {
            const tempFilePath = res.tempFilePath;
            this.setData({
              logoSrc: tempFilePath
            });
            // 将图片缓存到本地
            wx.setStorage({
              key: 'logoImage',
              data: tempFilePath
            });
          },
          fail: (err) => {
            console.error('图片加载失败', err);
          }
        });
      }
    });
  },

  // 登录处理
  handleLogin: function (e) {
    if (this.data.isLoggingIn) return; // 如果正在登录，直接返回
    const { username, password } = this.data; // 获取用户名和密码
    if (!username && !password) {
      this.showToast('请输入用户名和密码');
      return;
    } else if (!username) {
      this.showToast('请输入用户名');
      return;
    } else if (!password) {
      this.showToast('请输入密码');
      return;
    }

    this.setData({ isLoggingIn: true }); // 禁用登录按钮

    // 调用云函数进行登录验证
    wx.cloud.callFunction({
      name: 'mysql-function', // 云函数名
      data: {
        action: 'login', // 指定要调用的功能
        payload: {
          username: this.data.username,
          password: this.data.password
        }
      },
      success: (res) => {
        console.log('登录结果：', res);
        if (res.result && res.result.code === 200) {
          const user = res.result.user;
          if (user) {
            // 根据用户角色显示不同的提示
            const toastTitle = user.is_admin === 1 ? '管理员登录成功' : '用户登录成功';
            this.showToast(toastTitle, 'success');

            // 保存用户信息到全局或本地
            wx.setStorageSync('userInfo', user);

            // 跳转到计算页面
            wx.switchTab({ url: '/miniprogram/pages/calculator/calculator' });
          } else {
            this.showToast('用户不存在');
          }
        } else {
          this.showToast(res.result.message || '登录失败');
        }
      },
      fail: (err) => {
        console.error('云函数调用失败：', err);
        this.showToast('登录失败，请检查网络');
      },
      complete: () => {
        this.setData({ isLoggingIn: false }); // 启用登录按钮
      }
    });
  },

  // 封装显示提示信息的函数
  showToast(title, icon = 'none') {
    wx.showToast({
      title,
      icon
    });
  }
});