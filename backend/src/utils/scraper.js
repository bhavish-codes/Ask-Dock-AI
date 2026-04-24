const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeUrl(url) {
  try {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const $ = cheerio.load(data);

    $('script, style, noscript, nav, footer, header').remove();

    const content = $('p, h1, h2, h3, h4, h5, h6, li, code, pre').map((_, el) => {
      const text = $(el).text().trim();
      return text.length > 0 ? text : null;
    }).get().join('\n\n');

    return content;
  } catch (error) {
    console.error(`Error scraping URL ${url}:`, error.message);
    throw new Error('Failed to scrape URL');
  }
}

module.exports = { scrapeUrl };
