const express = require('express');
const axios = require('axios');
const cors = require('cors'); // Require the CORS library
const charset = require('charset'); // Add a library for detecting character set

const app = express();

app.use(cors()); // Use the CORS middleware

app.get('/proxy', async (req, res) => {
  const url = req.query.url;

  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const detectedCharset = charset(response.headers, response.data); // Detect character set
    const decoder = new TextDecoder(detectedCharset || 'utf-8'); // Use detected character set or UTF-8 as default
    const data = decoder.decode(new Uint8Array(response.data));
    res.send(data);
  } catch (error) {
    console.error(`Error: ${error}`);
    res.status(500).json({ error: 'An error occurred' });
  }
});

app.listen(3000, () => {
  console.log('Proxy server is running on port 3000');
});
