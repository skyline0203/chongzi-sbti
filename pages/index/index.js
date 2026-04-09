// ============================================================
// pages/index/index.js — 首页逻辑
// ============================================================
//
// 这是首页的"大脑"。首页很简单，主要功能就两个：
// 1. 检查用户是否已登录
// 2. 点击按钮跳转到答题页（或登录页）
//
// Page() 是微信提供的函数，用来创建一个页面。
// 每个 .js 文件对应一个 .wxml 文件（界面）和 .wxss 文件（样式）。
// ============================================================

Page({
  // ----------------------------------------------------------
  // data — 页面的数据
  // 这里的数据可以在 .wxml 中通过 {{变量名}} 显示
  // 修改 data 后调用 this.setData()，页面会自动刷新
  // ----------------------------------------------------------
  data: {
    isLoggedIn: false,    // 用户是否已登录
    userName: '',         // 用户昵称（登录后显示）
    footerTapCount: 0,    // 底部文字点击次数（管理员隐藏入口计数）
    footerTapTimer: null  // 计时器引用（用于重置点击计数）
  },

  // ----------------------------------------------------------
  // onLoad — 页面加载时自动执行
  // 相当于这个页面的"初始化函数"
  // 每次进入这个页面都会执行一次
  // ----------------------------------------------------------
  onLoad() {
    this.checkLoginStatus();
  },

  // ----------------------------------------------------------
  // onShow — 页面显示时自动执行
  // 和 onLoad 的区别：
  // - onLoad：页面第一次加载时执行
  // - onShow：每次页面显示时都执行（包括从其他页面返回）
  // 所以在这里检查登录状态，能确保从登录页回来后状态更新
  // ----------------------------------------------------------
  onShow() {
    this.checkLoginStatus();
  },

  // ----------------------------------------------------------
  // checkLoginStatus — 检查本地是否有登录缓存
  // wx.getStorageSync(key) = 同步读取本地存储
  // 如果之前登录过，本地会有 userInfo 和 isLoggedIn = true
  // ----------------------------------------------------------
  checkLoginStatus() {
    const isLoggedIn = wx.getStorageSync('isLoggedIn') || false;
    const userInfo = wx.getStorageSync('userInfo') || {};

    this.setData({
      isLoggedIn: isLoggedIn,
      userName: userInfo.nickName || ''
    });
  },

  // ----------------------------------------------------------
  // startQuiz — 点击"开始鉴定"按钮时执行
  // 
  // 流程：
  // 1. 检查是否已登录
  // 2. 已登录 → 直接跳转到答题页
  // 3. 未登录 → 跳转到登录页，登录成功后再跳转答题页
  // ----------------------------------------------------------
  startQuiz() {
    if (this.data.isLoggedIn) {
      // 已登录，直接去答题
      // wx.navigateTo = 跳转到新页面（可以返回）
      wx.navigateTo({
        url: '/pages/quiz/quiz'
      });
    } else {
      // 未登录，先去登录页
      // 登录成功后会自动跳转回来
      wx.navigateTo({
        url: '/pages/login/login?redirect=/pages/quiz/quiz'
      });
    }
  },

  // ----------------------------------------------------------
  // onFooterTap — 底部版权文字的点击事件（管理员隐藏入口）
  //
  // 设计思路：
  // - 普通用户不会疯狂点击底部小字
  // - 连续点击 5 次 → 认为是管理员 → 跳转管理员登录页
  // - 3 秒内没点满 5 次 → 计数归零
  //
  // 这是一种"安全通过模糊"的设计模式：
  // 不隐藏入口，但把入口藏在"没人会这么做"的操作里
  // ----------------------------------------------------------
  onFooterTap() {
    let count = this.data.footerTapCount + 1;
    
    // 清除之前的计时器（每次点击都重新计时）
    if (this.data.footerTapTimer) {
      clearTimeout(this.data.footerTapTimer);
    }

    if (count >= 5) {
      // 连续点击 5 次 → 跳转管理员登录页
      this.setData({ footerTapCount: 0 });
      wx.navigateTo({
        url: '/pages/login/login?role=admin'
      });
    } else {
      // 还没点够 5 次 → 计数 +1，设置 3 秒超时
      const timer = setTimeout(() => {
        // 3 秒内没继续点 → 计数归零
        this.setData({ footerTapCount: 0 });
      }, 3000);

      this.setData({
        footerTapCount: count,
        footerTapTimer: timer
      });
    }
  }
})
