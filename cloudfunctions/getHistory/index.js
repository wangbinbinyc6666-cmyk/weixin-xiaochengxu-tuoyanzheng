const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  try {
    const result = await db.collection('tasks')
      .where({
        openid: openid
      })
      .orderBy('createTime', 'desc')
      .limit(20)
      .get();

    return {
      success: true,
      data: result.data
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      success: false,
      error: error.message || '查询失败'
    };
  }
};
