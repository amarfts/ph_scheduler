const axios = require('axios');
const fs = require('fs');
const path = require('path');

/**
 * @param {string} pharmacyIdForNeighbor
 * @param {string} authToken
 * @param {string} cookieToken
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {Promise<string>} 
 */
async function fetchPdfForPharmacy(pharmacyIdForNeighbor, authToken, cookieToken, startDate, endDate) {
  const formattedStartDate = startDate.toISOString();
  const formattedEndDate = endDate.toISOString();

  const url = `https://www.pharmagarde.be/api/report/DutyRoster?startDate=${encodeURIComponent(formattedStartDate)}&endDate=${encodeURIComponent(formattedEndDate)}&pharmacyIdForNeighbor=${pharmacyIdForNeighbor}`;

  const headers = {
    'accept': 'application/octet-stream',
    'authorization': `Bearer ${authToken}`,
    'authtoken': authToken,
    'cookie': `Uphoc-MASTER_web_gardes_jwt_token=${cookieToken}`,
    'referer': 'https://www.pharmagarde.be/',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
  };

  console.log(`📄 Fetching PDF for pharmacy ${pharmacyIdForNeighbor}...`);

  const res = await axios.get(url, {
    headers,
    responseType: 'arraybuffer'
  });

  const pdfDir = path.join(__dirname, '..', 'tmp', 'pdfs');
  if (!fs.existsSync(pdfDir)) {
    fs.mkdirSync(pdfDir, { recursive: true });
  }

  const filePath = path.join(pdfDir, `${pharmacyIdForNeighbor}_${Date.now()}.pdf`);
  fs.writeFileSync(filePath, res.data);

  console.log(`✅ PDF saved: ${filePath}`);
  return filePath;
}

module.exports = { fetchPdfForPharmacy };
