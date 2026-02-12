require('dotenv').config({ path: '.env.local' });

const translateWithMicrosoft = async (text) => {
  const subscriptionKey = process.env.MICROSOFT_TRANSLATOR_KEY;
  if (!subscriptionKey) return null;

  const endpoint = 'https://api.cognitive.microsofttranslator.com/translate';
  const params = new URLSearchParams({
    'api-version': '3.0',
    'to': 'en',
    'from': 'ja'
  });

  const response = await fetch(`${endpoint}?${params}`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': subscriptionKey,
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Region': 'japaneast'
    },
    body: JSON.stringify([{ text }])
  });

  if (!response.ok) return null;

  const result = await response.json();
  if (result && result.length > 0 && result[0].translations) {
    return result[0].translations[0].text;
  }
  return null;
};

const generateSuggestedId = async (title) => {
  const cleanTitle = title.trim();
  let english = cleanTitle;

  // 日本語が含まれていればTranslatorで翻訳
  if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(english)) {
    console.log('Japanese detected, translating...');
    const translated = await translateWithMicrosoft(cleanTitle);
    if (translated) {
      console.log('Translated:', translated);
      english = translated;
    } else {
      console.log('Translation failed');
    }
  }

  // IDクリーニング
  let cleanId = english
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 30);

  console.log('Final ID:', cleanId);
  return cleanId;
};

async function test() {
  console.log('=== AI研究の今を学ぶ ===');
  await generateSuggestedId('AI研究の今を学ぶ');

  console.log('\n=== AI技術マップの5つの観点 ===');
  await generateSuggestedId('AI技術マップの5つの観点');

  console.log('\n=== AI課題マップを理解する ===');
  await generateSuggestedId('AI課題マップを理解する');
}

test();
