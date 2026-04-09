// ============================================================
// pages/quiz/quiz.js — 答题页逻辑
// ============================================================
//
// 这是整个小程序最核心的页面。
// 用户在这里完成 15 道选择题，每题选一个选项。
//
// 数据结构说明：
// - questions[]     — 所有题目（从 questions.js 导入）
// - currentIndex    — 当前是第几题（从 0 开始）
// - answers[]       — 用户每题选了什么 type（S/H/I/T）
// - selectedOption  — 当前这题选了第几个选项（0/1/2/3，-1=没选）
//
// 答题流程：
// 首页 → 答题页 → 选答案 → 下一题 → ... → 最后一题 → 计算结果 → 结果页
// ============================================================

// ----------------------------------------------------------
// require — 导入另一个文件的内容
// 类比 C 语言的 #include
// 
// 这里从 utils/questions.js 导入题目数据
// { questions } 是"解构赋值"，意思是：
//   从导出的对象中取出 questions 这个属性
//   等价于：const questions = require(...).questions
// ----------------------------------------------------------
const { questions } = require('../../utils/questions.js');

Page({
  // ----------------------------------------------------------
  // data — 页面数据
  // 所有需要在页面上显示的数据都在这里声明
  // 修改后调用 this.setData()，页面自动刷新
  // ----------------------------------------------------------
  data: {
    questions: [],              // 所有题目数组
    currentIndex: 0,            // 当前题号（0 = 第1题，14 = 第15题）
    total: 15,                  // 总题数
    currentQuestion: {},        // 当前显示的那道题
    selectedOption: -1,         // 当前选中的选项下标（-1 = 未选择）
    answers: [],                // 每题答案的 type 数组，如 ['S','H','T',...]
    progress: 0,                // 进度条百分比（0-100）
    optionLetters: ['A', 'B', 'C', 'D']  // 选项字母标签
  },

  // ----------------------------------------------------------
  // onLoad — 页面加载时执行
  // 只在第一次进入页面时执行一次
  // ----------------------------------------------------------
  onLoad() {
    // 初始化页面：加载题目，显示第一题
    this.setData({
      questions: questions,                // 把导入的题目赋值给页面数据
      currentQuestion: questions[0],       // 默认显示第一题
      total: questions.length,             // 题目总数
      progress: (1 / questions.length) * 100  // 进度 = 1/总题数 × 100
    });
  },

  // ----------------------------------------------------------
  // selectOption — 用户点击某个选项时触发
  //
  // 【参数 e 是什么？】
  // e = 事件对象（Event），包含了用户操作的所有信息
  // e.currentTarget.dataset.index = 从 wxml 的 data-index 属性获取的值
  //
  // 【为什么要 [...this.data.answers] 而不是直接修改？】
  // JavaScript 中数组是"引用类型"，直接修改会污染原数据
  // 用 ...（展开运算符）创建一个新数组，是安全的做法
  // 类比 C：直接修改指针指向的数据 vs 先 malloc 一份新的
  // ----------------------------------------------------------
  selectOption(e) {
    // 获取用户点击的是第几个选项（0/1/2/3）
    const index = e.currentTarget.dataset.index;

    // 从当前题目中获取该选项对应的 type（S/H/I/T）
    const type = this.data.currentQuestion.options[index].type;

    // 用展开运算符复制一份答案数组（安全修改，不影响原数组）
    const answers = [...this.data.answers];
    // 把当前题的答案存进去
    // answers[0] = 'S'  意思是第1题选了 type=S 的选项
    answers[this.data.currentIndex] = type;

    // 更新页面数据，页面自动刷新（选项高亮变化）
    this.setData({
      selectedOption: index,
      answers: answers
    });
  },

  // ----------------------------------------------------------
  // nextQuestion — 点击"下一题"或"查看结果"时触发
  //
  // 流程：
  // 1. 检查是否选了答案 → 没选就弹提示
  // 2. 是否最后一题？ → 是：计算结果并跳转
  // 3. 不是最后一题 → 前进到下一题
  // ----------------------------------------------------------
  nextQuestion() {
    // 检查：用户有没有选答案？
    if (this.data.selectedOption === -1) {
      // 没选！弹出提示
      // wx.showToast = 显示一个短暂的消息提示
      wx.showToast({ title: '先选一个吧！', icon: 'none' });
      return;  // return = 结束函数，不往下走了
    }

    // 检查：是不是最后一题？
    // currentIndex 从 0 开始，所以最后一题的 index = total - 1
    if (this.data.currentIndex === this.data.total - 1) {
      // 最后一题 → 计算最终结果
      this.calculateResult();
      return;
    }

    // 不是最后一题 → 前进到下一题
    const nextIndex = this.data.currentIndex + 1;
    const answers = this.data.answers;

    // 更新页面显示为下一题
    this.setData({
      currentIndex: nextIndex,
      currentQuestion: this.data.questions[nextIndex],
      // 检查下一题之前有没有选过答案
      // 如果选过 → 恢复选中状态（用户点"上一题"回来时需要）
      // 没选过 → selectedOption = -1（未选择状态）
      selectedOption: answers[nextIndex] !== undefined ?
        this.getTypeIndex(this.data.questions[nextIndex], answers[nextIndex]) : -1,
      // 更新进度条
      progress: ((nextIndex + 1) / this.data.total) * 100
    });
  },

  // ----------------------------------------------------------
  // prevQuestion — 点击"上一题"时触发
  // 
  // 和 nextQuestion 类似，但往回走
  // 需要恢复之前选的答案
  // ----------------------------------------------------------
  prevQuestion() {
    // 如果已经是第一题，没法再往前了
    if (this.data.currentIndex === 0) return;

    const prevIndex = this.data.currentIndex - 1;
    const answers = this.data.answers;

    this.setData({
      currentIndex: prevIndex,
      currentQuestion: this.data.questions[prevIndex],
      // 恢复之前选的答案
      selectedOption: answers[prevIndex] !== undefined ?
        this.getTypeIndex(this.data.questions[prevIndex], answers[prevIndex]) : -1,
      progress: ((prevIndex + 1) / this.data.total) * 100
    });
  },

  // ----------------------------------------------------------
  // getTypeIndex — 辅助函数：找到某个 type 在选项中的下标
  //
  // 比如：一道题的 options 是 [{type:'S'}, {type:'H'}, {type:'I'}, {type:'T'}]
  // getTypeIndex(question, 'H') 返回 1
  //
  // 用于恢复选中状态：我们知道答案的 type，需要找到它在数组中的位置
  // ----------------------------------------------------------
  getTypeIndex(question, type) {
    for (let i = 0; i < question.options.length; i++) {
      if (question.options[i].type === type) return i;
    }
    return -1;  // 没找到（不应该发生）
  },

  // ----------------------------------------------------------
  // calculateResult — 计算最终鉴定结果
  //
  // 算法（非常简单）：
  // 1. 统计 S/H/I/T 各出现了几次
  // 2. 找出出现次数最多的那个
  // 3. 那就是你的鉴定结果！
  //
  // 类比 C 语言伪代码：
  //   int counts[4] = {0};  // S=0, H=1, I=2, T=3
  //   for (int i = 0; i < 15; i++) {
  //     counts[answers[i]]++;
  //   }
  //   int max = find_max(counts, 4);
  // ----------------------------------------------------------
  calculateResult() {
    // 创建一个计数器对象
    // 对比 C：int counts[4] = {S:0, H:0, I:0, T:0}
    const counts = { S: 0, H: 0, I: 0, T: 0 };

    // 遍历每一道题的答案，统计各类型出现次数
    // forEach = 对数组每个元素执行一个函数
    this.data.answers.forEach(type => {
      if (counts[type] !== undefined) counts[type]++;
    });

    // 找出出现次数最多的类型
    let maxType = 'T';     // 默认值
    let maxCount = 0;      // 最高次数
    for (const type in counts) {
      if (counts[type] > maxCount) {
        maxCount = counts[type];
        maxType = type;
      }
    }

    // 跳转到结果页
    // wx.redirectTo = 替换当前页面（用户不能返回到答题页）
    // 把结果类型和统计数据通过 URL 参数传给结果页
    // JSON.stringify(counts) = 把对象转成 JSON 字符串
    wx.redirectTo({
      url: `/pages/result/result?type=${maxType}&counts=${JSON.stringify(counts)}`
    });
  }
})
