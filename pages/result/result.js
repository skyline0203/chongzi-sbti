// ============================================================
// pages/result/result.js — 结果页逻辑
// ============================================================
//
// 用户答完题后跳转到这个页面，显示鉴定结果。
//
// 主要功能：
// 1. 接收答题结果（类型 + 各项得分）
// 2. 广告解锁（可选）
// 3. 显示结果海报
// 4. 保存海报 / 分享 / 重新测试
//
// 数据来源：
// 从 URL 参数获取 type（结果类型）和 counts（各项计数）
// 比如：/pages/result/result?type=S&counts={"S":5,"H":3,"I":4,"T":3}
// ============================================================

// ----------------------------------------------------------
// 导入结果文案数据
// results 是一个对象，key 是类型字母（S/H/I/T），value 是该类型的详细文案
// ----------------------------------------------------------
const { results } = require('../../utils/results.js');

Page({
  // ----------------------------------------------------------
  // data — 页面数据
  // ----------------------------------------------------------
  data: {
    unlocked: false,      // 是否已解锁结果（广告解锁机制）
    resultType: 'T',      // 结果类型（S/H/I/T）
    resultData: {},       // 该类型的详细文案数据
    scoreList: [],        // 各项得分列表（用于显示柱状图）
    counts: {}            // 各类型原始计数 {S:5, H:3, I:4, T:3}
  },

  // ----------------------------------------------------------
  // onLoad — 页面加载
  // 
  // options = URL 中的参数
  // 比如 ?type=S&counts={"S":5,"H":3,"I":4,"T":3}
  // options.type = "S"
  // options.counts = '{"S":5,"H":3,"I":4,"T":3}'
  // ----------------------------------------------------------
  onLoad(options) {
    // 从 URL 参数获取结果类型，默认 'T'
    const type = options.type || 'T';

    // JSON.parse = 把 JSON 字符串转回 JavaScript 对象
    // 比如 '{"S":5}' → {S: 5}
    const counts = options.counts ? JSON.parse(options.counts) : { S: 0, H: 0, I: 0, T: 0 };

    // 计算总题数（所有类型的计数之和）
    // || 1 是防止除以 0（虽然正常情况不会为 0）
    const total = counts.S + counts.H + counts.I + counts.T || 1;

    // 构建分数列表，用于页面上的柱状图显示
    // percent = 该类型占总题数的百分比
    const scoreList = [
      { type: 'S', label: 'S·发疯', count: counts.S, percent: (counts.S / total) * 100 },
      { type: 'H', label: 'H·硬扛', count: counts.H, percent: (counts.H / total) * 100 },
      { type: 'I', label: 'I·叛逆', count: counts.I, percent: (counts.I / total) * 100 },
      { type: 'T', label: 'T·躺平', count: counts.T, percent: (counts.T / total) * 100 }
    ];

    // 更新页面数据
    this.setData({
      resultType: type,
      resultData: results[type],  // 用 type 做 key，查 results 字典
      scoreList: scoreList,
      counts: counts
    });
  },

  // ===========================================================
  // 广告解锁逻辑
  // ===========================================================
  //
  // 设计思路：
  // - 默认显示遮罩层，结果被"锁定"
  // - 用户可以选择看广告解锁，或者直接查看（备用方案）
  // - 广告加载失败时自动解锁（用户体验优先）
  //
  // 【激励视频广告】
  // 微信小程序的广告形式之一：
  // - 用户必须看完广告（约 15-30 秒）
  // - 看完后触发 onClose 回调，res.isEnded = true
  // - 没看完就关闭，res.isEnded = false
  // ===========================================================

  watchAd() {
    // 从全局数据获取广告位 ID
    const adUnitId = getApp().globalData.adUnitId;

    // 检查微信是否支持激励视频广告 API
    if (wx.createRewardedVideoAd) {
      // 创建广告实例
      const videoAd = wx.createRewardedVideoAd({ adUnitId: adUnitId });

      // 广告加载成功（通常不用处理）
      videoAd.onLoad(() => {});

      // 广告加载失败 → 直接解锁（不让用户卡住）
      videoAd.onError((err) => {
        console.error('广告加载失败:', err);
        this.manualUnlock();
      });

      // 用户关闭广告
      videoAd.onClose((res) => {
        if (res && res.isEnded) {
          // 看完了 → 解锁！
          this.setData({ unlocked: true });
        } else {
          // 没看完 → 提示
          wx.showToast({ title: '看完广告才能解锁哦', icon: 'none' });
        }
      });

      // 显示广告
      videoAd.show().catch(() => {
        // 广告展示失败 → 直接解锁
        this.manualUnlock();
      });
    } else {
      // 不支持广告 API（开发工具或旧版本）→ 直接解锁
      this.manualUnlock();
    }
  },

  // ----------------------------------------------------------
  // manualUnlock — 手动解锁（不看广告直接看结果）
  // ----------------------------------------------------------
  manualUnlock() {
    this.setData({ unlocked: true });
  },

  // ===========================================================
  // 保存海报
  // ===========================================================
  //
  // 目前是简化版：提示用户截图
  // 后续版本可以用 canvas 绘制并保存到相册
  // ===========================================================

  savePoster() {
    wx.showLoading({ title: '生成中...' });

    // 简化方案：提示用户截图
    setTimeout(() => {
      wx.hideLoading();
      wx.showModal({
        title: '保存海报',
        content: '请长按海报图片保存到相册，或使用手机截图功能',
        showCancel: false,
        confirmText: '知道了'
      });
    }, 500);
  },

  // ===========================================================
  // 分享功能
  // ===========================================================

  shareResult() {
    wx.showActionSheet({
      itemList: ['转发给朋友', '生成分享图'],
      success: (res) => {
        if (res.tapIndex === 0) {
          wx.showModal({
            title: '分享',
            content: '点击右上角"···"转发给好友',
            showCancel: false
          });
        } else {
          this.savePoster();
        }
      }
    });
  },

  // ----------------------------------------------------------
  // onShareAppMessage — 微信小程序原生分享
  //
  // 当用户点击右上角"转发"时，微信会自动调用这个函数
  // 返回一个对象，包含分享的标题和路径
  // ----------------------------------------------------------
  onShareAppMessage() {
    const type = this.data.resultType;
    const data = results[type];
    return {
      title: `我的艾斯BTI鉴定结果是：${data.type}！${data.slogan}`,
      path: '/pages/index/index'
    };
  },

  // ----------------------------------------------------------
  // retryQuiz — 重新测试
  // ----------------------------------------------------------
  retryQuiz() {
    wx.redirectTo({
      url: '/pages/quiz/quiz'
    });
  }
})
