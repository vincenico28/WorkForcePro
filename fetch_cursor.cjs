const https = require('https');

const options = {
  hostname: 'custom-cursor.com',
  path: '/en/collection/3d-pixel/3d-sky-blue-pixel',
  headers: { 'User-Agent': 'Mozilla/5.0' }
};

https.get(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const urls = data.match(/https:\/\/cdn\.custom-cursor\.com\/[^\s"'<>]*?\.png/g);
    if (urls) {
      console.log(Array.from(new Set(urls)));
    } else {
      console.log('No URLs found');
    }
  });
}).on('error', err => console.error(err));
