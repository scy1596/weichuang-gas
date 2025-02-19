const app = getApp(); // 获取全局的 App 实例
function request({ url, method, data }) {
  return new Promise((resolve, reject) => {
    const apiBaseUrl = app.globalData.apiBaseUrl; // 获取全局基础地址
    const fullUrl = apiBaseUrl.endsWith("/")
      ? `${apiBaseUrl}${url.replace(/^\//, "")}`
      : `${apiBaseUrl}/${url.replace(/^\//, "")}`;

    console.log("完整请求地址:", fullUrl); // 调试用

    wx.request({
      url: fullUrl, // 请求的完整地址
      method: method || "GET", // 默认方法为 GET
      data: data || {}, // 默认数据为空对象
      header: {
        "Content-Type": "application/json",
      },
      success: (response) => {
        console.log("响应成功：", response.data);
        resolve(response.data);
      },
      fail: (error) => {
        console.error("请求失败：", error);
        reject(error);
      },
    });
  });
}

module.exports = { request };
