const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

/**
 * @param {number} radius 
 * @param {number} latitude 
 * @param {number} longitude 
 * @param {string} location 
 * @param {Date} startDate 
 * @param {Date} endDate 
 * @param {string} bearerToken 
 * @returns {Promise<string>} 
 */
async function fetchPublicPdf(radius, latitude, longitude, location, startDate, endDate, bearerToken) {
  const formattedLocation = location.replace(/ /g, '+');
  const url = `https://www.pharmagarde.be/api/report/PublicDuty?Radius=${radius}&From=${startDate.toISOString()}&To=${endDate.toISOString()}&Location=${formattedLocation}&Lat=${latitude}&Long=${longitude}&language=FR`;

  console.log(`📄 Fetching Public PDF with URL: ${url}`);

  const res = await axios.get(url, {
    responseType: 'arraybuffer',
    headers: {
      'Authorization': `Bearer ${bearerToken}`,
      'Accept': 'application/octet-stream',
      'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
      'Referer': 'https://public.pharmagarde.be/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36'
    }
  });

  const pdfBuffer = res.data;

  const fileName = `public_${uuidv4()}.pdf`;
  const savePath = path.join(__dirname, '../tmp/pdfs', fileName);

  fs.writeFileSync(savePath, pdfBuffer);

  console.log(`✅ PDF saved: ${savePath}`);
  return savePath;
}

/**
 * @param {Date} startDate 
 * @param {Date} endDate 
 * @param {string} bearerToken 
 * @returns {Promise<Array>} 
 */
async function fetchPublicDutiesJson(startDate, endDate, bearerToken) {
  const url = `https://www.pharmagarde.be/api/dutyAssignment/public?From=${startDate.toISOString()}&To=${endDate.toISOString()}`;

  console.log(`📄 Fetching ALL Public Duties JSON with URL: ${url}`);

  const res = await axios.get(url, {
    headers: {
      'Authorization': `Bearer ${bearerToken}`,
      'Accept': 'application/json',
      'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
      'Referer': 'https://public.pharmagarde.be/',
      'User-Agent': 'Mozilla/5.0'
    }
  });

  console.log(`✅ Total duties fetched: ${res.data.length}`);
  return res.data;
}


function haversineDistance(lat1, lon1, lat2, lon2) {
  const toRad = x => (x * Math.PI) / 180;
  const R = 6371; 

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}


function filterDutiesWithinRadius(duties, centerLat, centerLng, radiusKm) {
  return duties.filter(duty => {
    const pharm = duty.pharmacy;
    if (!pharm || !pharm.latitude || !pharm.longitude) return false;

    const distance = haversineDistance(centerLat, centerLng, pharm.latitude, pharm.longitude);
    return distance <= radiusKm;
  });
}


function isCoverageComplete(duties, startDate, endDate) {
  const dayCoverage = new Map();

  const current = new Date(startDate);
  while (current <= endDate) {
    const dateStr = current.toISOString().split('T')[0];
    dayCoverage.set(dateStr, { day: false, night: false });
    current.setDate(current.getDate() + 1);
  }

  for (const duty of duties) {
    const dutyDate = duty.dutyDate.date.split('T')[0];
    const type = duty.dutyType.type;

    if (dayCoverage.has(dutyDate)) {
      if (type === "DAY") dayCoverage.get(dutyDate).day = true;
      if (type === "NIGHT") dayCoverage.get(dutyDate).night = true;
    }
  }

  for (const [date, coverage] of dayCoverage.entries()) {
    if (!coverage.day || !coverage.night) {
      console.log(`❌ Missing coverage for ${date}:`, coverage);
      return false;
    }
  }

  return true;
}


/**
 * @param {number} initialRadius 
 * @param {number} latitude 
 * @param {number} longitude 
 * @param {string} location 
 * @param {Date} startDate 
 * @param {Date} endDate 
 * @param {string} bearerToken 
 * @returns {Promise<string>} 
 */
async function findSufficientRadiusAndFetchPdf(initialRadius, latitude, longitude, location, startDate, endDate, bearerToken) {
  const allDuties = await fetchPublicDutiesJson(startDate, endDate, bearerToken);

  let radius = initialRadius;
  const maxRadius = 35;
  const step = 1;

  while (radius <= maxRadius) {
    console.log(`🔍 Trying radius: ${radius} km`);

    const filteredDuties = filterDutiesWithinRadius(allDuties, latitude, longitude, radius);

    if (isCoverageComplete(filteredDuties, startDate, endDate)) {
      console.log(`✅ Found sufficient radius: ${radius} km`);

      const pdfPath = await fetchPublicPdf(radius, latitude, longitude, location, startDate, endDate, bearerToken);
      console.log(`📄 PDF saved at: ${pdfPath}`);
      return pdfPath;
    } else {
      console.log(`❌ Not sufficient at ${radius} km`);
      radius += step;
    }
  }

  throw new Error(`❗ Could not find sufficient radius up to ${maxRadius} km`);
}


module.exports = {
  fetchPublicPdf,
  fetchPublicDutiesJson,
  haversineDistance,
  filterDutiesWithinRadius,
  isCoverageComplete,
  findSufficientRadiusAndFetchPdf
};
