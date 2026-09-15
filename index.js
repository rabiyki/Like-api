const { LikeAPI } = require('ffapis');
const express = require('express');
const app = express();

const like = new LikeAPI(); // নতুন OB হলে: new LikeAPI({ obVersion: 'OB55' })

app.get('/api/like', async (req, res) => {
  try {
    let { uid, region = 'IND', count = 100 } = req.query;

    // uid চেক
    if (!uid) {
      return res.status(400).json({
        success: false,
        error: 'uid parameter লাগবে। উদাহরণ: /api/like?uid=123456789'
      });
    }

    // count কে number বানানো + max 100 limit
    let likeCount = parseInt(count) || 100;
    if (likeCount > 100) likeCount = 100;
    if (likeCount < 1) likeCount = 1;

    // region uppercase করে নেওয়া
    region = region.toUpperCase();

    console.log(`[+] Like request → UID: ${uid} | Region: ${region} | Count: ${likeCount}`);

    const result = await like.sendLikes(uid, region, likeCount);

    res.json({
      success: true,
      message: `${likeCount} likes successfully sent`,
      uid: uid,
      region: region,
      count: likeCount,
      data: result
    });

  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({
      success: false,
      error: err.message || 'Something went wrong'
    });
  }
});

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Free Fire Like API is running',
    usage: '/api/like?uid=PLAYER_UID&region=IND&count=50'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ Like API Running → http://localhost:${PORT}`);
  console.log(`📌 Example: http://localhost:${PORT}/api/like?uid=7512027025&region=IND&count=100\n`);
});
