const app = getApp();

Page({
  data: {
    currentState: 'input',
    taskInput: '',
    coachMessage: '今天想搞定什么？',
    result: null,
    showHistory: false,
    historyList: [],
    typingText: ''
  },

  onLoad() {
    this.initCloud();
  },

  initCloud() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: 'cloud1-d1g4xxsut33977fca',
        traceUser: true,
      });
    }
  },

  onInputChange(e) {
    this.setData({
      taskInput: e.detail.value
    });
  },

  onCreatePlan() {
    const task = this.data.taskInput.trim();
    if (!task) {
      wx.showToast({
        title: '请输入你想完成的任务',
        icon: 'none'
      });
      return;
    }

    this.setData({
      currentState: 'loading',
      coachMessage: '收到！我正在帮你把大块头任务拆成小积木...'
    });

    wx.showLoading({ title: '' });

    wx.cloud.callFunction({
      name: 'askDeepSeek',
      data: {
        task: task
      },
      success: (res) => {
        wx.hideLoading();
        if (res.result && res.result.success) {
          this.setData({
            result: res.result.data,
            currentState: 'result'
          });
          this.typewriterEffect(res.result.data.encouragement);
        } else {
          wx.showToast({
            title: '生成计划失败，请重试',
            icon: 'none'
          });
          this.setData({
            currentState: 'input',
            coachMessage: '今天想搞定什么？'
          });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('调用云函数失败', err);
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none'
        });
        this.setData({
          currentState: 'input',
          coachMessage: '今天想搞定什么？'
        });
      }
    });
  },

  typewriterEffect(text) {
    let index = 0;
    this.setData({ typingText: '' });
    
    const timer = setInterval(() => {
      if (index < text.length) {
        this.setData({
          coachMessage: text.substring(0, index + 1)
        });
        index++;
      } else {
        clearInterval(timer);
      }
    }, 50);
  },

  onReset() {
    this.setData({
      currentState: 'input',
      taskInput: '',
      coachMessage: '今天想搞定什么？',
      result: null,
      typingText: ''
    });
  },

  onAvatarClick() {
    this.setData({ showHistory: true });
    this.loadHistory();
  },

  onCloseHistory() {
    this.setData({ showHistory: false });
  },

  loadHistory() {
    wx.cloud.callFunction({
      name: 'getHistory',
      success: (res) => {
        if (res.result && res.result.success) {
          const historyList = res.result.data.map(item => ({
            ...item,
            createTime: this.formatTime(item.createTime)
          }));
          this.setData({ historyList });
        }
      },
      fail: (err) => {
        console.error('获取历史记录失败', err);
      }
    });
  },

  formatTime(timestamp) {
    const date = new Date(timestamp);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hour = date.getHours();
    const minute = date.getMinutes();
    return `${month}月${day}日 ${hour}:${minute.toString().padStart(2, '0')}`;
  }
});
