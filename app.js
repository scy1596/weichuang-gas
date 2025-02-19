// app.js

App({
  onLaunch: function () {
    // 初始化云开发环境
    if (!wx.cloud) {
      console.error('当前微信版本不支持云开发功能');
    } else {
      wx.cloud.init({
        env: 'weichuang-9gfoj56n60440bfb', // 这里填入你的云环境ID
        traceUser: true, // 自动追踪用户
      });
    }

    // 检查用户登录状态
    wx.checkSession({
      success() {
        // session_key 未过期并且在本生命周期内有效
        console.log('Session_key 未过期');
      },
      fail() {
        // 登录态过期，需重新登录
        wx.login({
          success: res => {
            if (res.code) {
              // 发送 res.code 到后台换取 openid, session_key
              wx.cloud.callFunction({
                name: 'expressFunction',  // 云函数名
                data: {
                  action: 'getUserData',  // 你可以根据需要添加不同的action
                },
                success: (res) => {
                  console.log('云函数返回用户数据：', res.result);
                  // 可以在这里做一些用户相关的数据处理
                },
                fail: (err) => {
                  console.error('云函数调用失败：', err);
                }
              });
            }
          }
        });
      }
    });
  },

  globalData: {
    userInfo: null
  }
});
