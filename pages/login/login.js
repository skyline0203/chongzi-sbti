// ============================================================
// pages/login/login.js — 登录页逻辑
// ============================================================
//
// 这个页面处理两种登录：
// 1. 普通用户登录 — 微信授权即可
// 2. 管理员登录 — 微信授权 + 服务端验证 openid 白名单
//
// URL 参数说明：
// - 无参数 或 ?redirect=xxx     → 普通用户登录
// - ?role=admin                → 管理员登录
// - ?redirect=/pages/xxx       → 登录成功后跳转到指定页面
//
// 微信小程序登录的核心概念：
// - code：临时登录凭证，有效期 5 分钟
// - openid：用户在小程序中的唯一标识（不变的）
// - 流程：wx.login() 获取 code → 发到服务端 → 换取 openid
//
// 【为什么需要服务端？】
// code 换 openid 需要 AppSecret（小程序密钥），这个密钥不能放前端！
// 所以必须经过服务端中转。
// ============================================================

Page({
  // ----------------------------------------------------------
  // data — 页面数据
  // 这些数据可以在 login.wxml 中通过 {{变量名}} 显示
  // ----------------------------------------------------------
  data: {
    // 是否管理员登录模式（从 URL 参数判断）
    isAdmin: false,

    // 是否正在加载（防止重复点击）
    loading: false,

    // 登录成功后的跳转地址
    redirectUrl: '/pages/index/index'
  },

  // ----------------------------------------------------------
  // onLoad — 页面加载
  // options = URL 中的参数，比如 ?role=admin&redirect=/pages/quiz/quiz
  // ----------------------------------------------------------
  onLoad(options) {
    // 判断是否管理员模式
    // options.role 如果是 'admin' 就是管理员，否则是普通用户
    const isAdmin = options.role === 'admin';

    // 获取登录成功后的跳转地址
    // 如果没指定，默认跳回首页
    const redirectUrl = options.redirect || '/pages/index/index';

    this.setData({
      isAdmin: isAdmin,
      redirectUrl: redirectUrl
    });

    console.log('登录页加载，模式：', isAdmin ? '管理员' : '普通用户');
  },

  // ----------------------------------------------------------
  // onGetUserInfo — 用户点击微信登录按钮后触发
  //
  // 【触发条件】
  // 用户在 <button open-type="getUserInfo"> 上点击了"允许"
  //
  // 【e 参数】
  // e.detail = {
  //   userInfo: { nickName, avatarUrl, ... },  // 用户信息
  //   rawData: "...",                           // 原始数据
  //   signature: "...",                         // 签名
  //   encryptedData: "...",                     // 加密数据
  //   iv: "..."                                 // 初始向量
  // }
  //
  // 【如果用户拒绝】
  // e.detail.userInfo = undefined
  // ----------------------------------------------------------
  onGetUserInfo(e) {
    // 用户拒绝授权
    if (!e.detail.userInfo) {
      wx.showToast({
        title: '需要授权才能继续哦',
        icon: 'none'
      });
      return;
    }

    // 用户同意授权 → 根据模式执行不同登录流程
    if (this.data.isAdmin) {
      this.doAdminLogin(e.detail.userInfo);
    } else {
      this.doUserLogin(e.detail.userInfo);
    }
  },

  // ----------------------------------------------------------
  // doUserLogin — 普通用户登录
  //
  // 流程：
  // 1. 获取微信登录凭证（code）
  // 2. 保存用户信息到本地
  // 3. 跳转到目标页面
  //
  // 【当前版本说明】
  // 目前后端服务还没搭建，所以这里做了"本地模拟"：
  // - 不真正调用后端
  // - 直接把用户信息存到本地存储
  // - 后续接入后端时，取消注释网络请求部分即可
  // ----------------------------------------------------------
  async doUserLogin(userInfo) {
    this.setData({ loading: true });

    try {
      // ------------------------------------------------------
      // 第一步：获取微信登录凭证（code）
      // wx.login() 是微信提供的 API
      // 它会返回一个临时的 code，可以发送到服务端换取 openid
      // 
      // 注意：wx.login() 不需要用户确认，静默获取
      // 而 wx.getUserProfile() 需要用户点击按钮确认
      // ------------------------------------------------------
      const loginRes = await this.wxLogin();
      console.log('获取到登录凭证 code:', loginRes.code);

      // ------------------------------------------------------
      // 第二步：【模拟】把 code 发到服务端换取 openid
      // 
      // 真实代码应该是：
      // const openid = await this.codeToOpenid(loginRes.code);
      //
      // 但目前没有后端，所以用模拟数据
      // ------------------------------------------------------
      // 真实代码（取消注释）：
      // const openid = await this.codeToOpenid(loginRes.code);
      
      // 模拟 openid（临时方案）
      const mockOpenid = 'mock_openid_' + Date.now();

      // ------------------------------------------------------
      // 第三步：保存登录信息到本地存储
      // wx.setStorageSync(key, value) = 同步写入本地存储
      // 保存后下次打开小程序可以直接读取，不用重新登录
      // ------------------------------------------------------
      wx.setStorageSync('userInfo', userInfo);     // 用户昵称、头像等
      wx.setStorageSync('openid', mockOpenid);     // 用户唯一标识
      wx.setStorageSync('isLoggedIn', true);       // 登录状态标记

      console.log('用户登录成功，信息已保存');

      // ------------------------------------------------------
      // 第四步：跳转到目标页面
      // wx.navigateBack = 返回上一个页面
      // wx.redirectTo = 跳转到新页面（替换当前页面，不能返回）
      // wx.switchTab = 跳转到 tabBar 页面（如果有的话）
      // ------------------------------------------------------
      wx.showToast({
        title: '登录成功！',
        icon: 'success',
        duration: 1500,
        success: () => {
          // 延迟跳转，让用户看到"成功"提示
          setTimeout(() => {
            wx.navigateBack({
              delta: 1  // 返回上一页（就是首页）
            });
          }, 1500);
        }
      });

    } catch (err) {
      // 登录失败的处理
      console.error('用户登录失败:', err);
      wx.showToast({
        title: '登录失败，请重试',
        icon: 'none'
      });
    }

    this.setData({ loading: false });
  },

  // ----------------------------------------------------------
  // doAdminLogin — 管理员登录
  //
  // 和普通用户登录的区别：
  // 1. 获取 code 后，还要发到服务端验证 openid 是否在白名单中
  // 2. 验证通过才能进入管理后台
  // 3. 验证失败拒绝登录
  //
  // 【安全设计】
  // - 管理员白名单存在服务端，前端不暴露
  // - 即使有人猜到了隐藏入口，没有白名单权限也进不去
  // ----------------------------------------------------------
  async doAdminLogin(userInfo) {
    this.setData({ loading: true });

    try {
      // 第一步：获取微信登录凭证
      const loginRes = await this.wxLogin();
      console.log('管理员获取到登录凭证 code:', loginRes.code);

      // ------------------------------------------------------
      // 第二步：发到服务端验证
      // 
      // 真实代码：
      // const verifyRes = await this.verifyAdmin(loginRes.code);
      // if (!verifyRes.isAdmin) {
      //   wx.showToast({ title: '你不是管理员', icon: 'none' });
      //   return;
      // }
      //
      // 目前没有后端，所以模拟验证（所有人都能通过）
      // 【重要】上线前必须接入真实后端验证！
      // ------------------------------------------------------
      // 模拟验证（临时方案 — 开发阶段用）
      const mockIsAdmin = true;  // 上线前改成调用 verifyAdmin()

      if (!mockIsAdmin) {
        wx.showToast({
          title: '你不是管理员，无权访问',
          icon: 'none'
        });
        this.setData({ loading: false });
        return;
      }

      // 验证通过 → 保存管理员状态
      wx.setStorageSync('isAdmin', true);
      wx.setStorageSync('adminInfo', userInfo);
      wx.setStorageSync('isLoggedIn', true);
      wx.setStorageSync('userInfo', userInfo);

      console.log('管理员登录成功');

      // 跳转到管理后台（如果有的话）或返回首页
      wx.showToast({
        title: '管理员验证通过',
        icon: 'success',
        duration: 1500,
        success: () => {
          setTimeout(() => {
            wx.navigateBack({ delta: 1 });
          }, 1500);
        }
      });

    } catch (err) {
      console.error('管理员登录失败:', err);
      wx.showToast({
        title: '验证失败，请重试',
        icon: 'none'
      });
    }

    this.setData({ loading: false });
  },

  // ----------------------------------------------------------
  // goBack — 返回首页
  // ----------------------------------------------------------
  goBack() {
    wx.navigateBack({
      delta: 1,
      fail: () => {
        // 如果没有上一页（直接打开登录页），跳转首页
        wx.switchTab({ url: '/pages/index/index' });
      }
    });
  },

  // ===========================================================
  // 以下是工具函数（Helper Functions）
  // ===========================================================

  // ----------------------------------------------------------
  // wxLogin — 封装 wx.login() 为 Promise
  //
  // 【为什么要封装？】
  // wx.login() 是"回调式"API（传一个 success 回调函数）
  // 但我们想用 async/await（看起来像同步代码，更易读）
  // 所以用 Promise 包装一下
  //
  // 【对比】
  // 回调式（不好读）：
  //   wx.login({
  //     success: (res) => { console.log(res.code); }
  //   });
  //
  // Promise 式（好读）：
  //   const res = await wxLogin();
  //   console.log(res.code);
  // ----------------------------------------------------------
  wxLogin() {
    return new Promise((resolve, reject) => {
      wx.login({
        success: (res) => {
          if (res.code) {
            resolve(res);  // 成功 → 返回结果
          } else {
            reject(new Error('获取登录凭证失败'));
          }
        },
        fail: (err) => {
          reject(err);  // 失败 → 返回错误
        }
      });
    });
  },

  // ----------------------------------------------------------
  // codeToOpenid — 把微信登录凭证发到服务端换取 openid
  //
  // 【流程】
  // 前端 code → 服务端 → 服务端用 code + AppSecret → 调用微信API → openid
  //
  // 【当前状态】
  // 服务端还没搭建，这个函数是预留的，取消注释即可使用
  // ----------------------------------------------------------
  codeToOpenid(code) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: getApp().globalData.apiBase + '/api/login',
        method: 'POST',
        data: { code: code },
        success: (res) => {
          if (res.data && res.data.openid) {
            resolve(res.data.openid);
          } else {
            reject(new Error('服务端未返回 openid'));
          }
        },
        fail: (err) => {
          reject(err);
        }
      });
    });
  },

  // ----------------------------------------------------------
  // verifyAdmin — 验证管理员身份
  //
  // 发送 code 到服务端，服务端检查该 openid 是否在管理员白名单中
  // 返回 { isAdmin: true/false }
  // ----------------------------------------------------------
  verifyAdmin(code) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: getApp().globalData.apiBase + '/api/admin/verify',
        method: 'POST',
        data: { code: code },
        success: (res) => {
          resolve(res.data || { isAdmin: false });
        },
        fail: (err) => {
          reject(err);
        }
      });
    });
  }
})
