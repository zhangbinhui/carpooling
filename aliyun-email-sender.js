// 1. 定义事件监听
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

// 2. 处理请求
async function handleRequest(request) {
  // 仅允许 POST
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  let payload;
  try {
    payload = await request.json();
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // payload里应该包含 { to, subject, html, ...(可选) }
  const { to, subject, html } = payload;
  if (!to || !subject || !html) {
    return new Response(JSON.stringify({ error: 'Missing required fields (to, subject, html)' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 3. 调用发送函数
  try {
    const result = await sendAliyunEmail({ to, subject, html });
    // 成功返回
    return new Response(JSON.stringify({ success: true, result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    // 出错
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 4. 下面就是“阿里云邮件推送”+“签名”逻辑，与您 crontab.worker 中相同

function aliPercentEncode(str) {
  return encodeURIComponent(str)
    .replace(/\+/g, '%20')
    .replace(/\*/g, '%2A')
    .replace(/%7E/g, '~');
}

async function calculateSignature(parameters, accessKeySecret) {
  const sortedKeys = Object.keys(parameters).sort();
  const canonicalizedQueryString = sortedKeys
    .map(key => aliPercentEncode(key) + '=' + aliPercentEncode(parameters[key]))
    .join('&');

  const stringToSign = `POST&%2F&${aliPercentEncode(canonicalizedQueryString)}`;

  const encoder = new TextEncoder();
  const signKey = encoder.encode(accessKeySecret + '&');
  const messageData = encoder.encode(stringToSign);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    signKey,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  return btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));
}

// 您需要在 worker 的 Environment Variables 中配置:
// - ALIYUN_ACCESS_KEY_ID
// - ALIYUN_ACCESS_KEY_SECRET
// - SENDER_EMAIL
// 这些可通过 Wrangler 的 secrets/vars 设置

async function sendAliyunEmail({ to, subject, html }) {
  // 1. 构造参数
  const params = {
    Action: 'SingleSendMail',
    AccessKeyId: ALIYUN_ACCESS_KEY_ID,    // Env var
    AccountName: SENDER_EMAIL,            // Env var
    AddressType: '1',
    Format: 'JSON',
    HtmlBody: html,
    RegionId: 'cn-hangzhou',
    ReplyToAddress: 'false',
    Subject: subject,
    TagName: 'notification',
    ToAddress: to,
    Version: '2015-11-23',
    Timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    SignatureMethod: 'HMAC-SHA1',
    SignatureVersion: '1.0',
    SignatureNonce: crypto.randomUUID?.() || Date.now().toString(),
  };

  // 2. 计算签名
  const signature = await calculateSignature(params, ALIYUN_ACCESS_KEY_SECRET);
  params.Signature = signature;

  // 3. 拼接 body
  const bodyString = Object.entries(params)
    .map(([k, v]) => aliPercentEncode(k) + '=' + aliPercentEncode(v))
    .join('&');

  // 4. 发起请求
  const response = await fetch('https://dm.aliyuncs.com/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: bodyString
  });

  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(`Aliyun DirectMail error: ${response.status} - ${responseText}`);
  }
  const result = JSON.parse(responseText);
  if (result.Code && result.Code !== 'OK') {
    throw new Error(`Aliyun DirectMail error: ${result.Message}`);
  }
  return result;
}
