const axios = require('axios');

async function getLatLngFromAddress(address) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;

  try {
    const res = await axios.get(url);
    const data = res.data;

    if (data.status !== 'OK' || !data.results.length) {
      throw new Error(`No geocoding result for address: ${address}`);
    }

    const { lat, lng } = data.results[0].geometry.location;
    return { latitude: lat, longitude: lng };
  } catch (error) {
    console.error(`🧭 Geocoding error for "${address}":`, error.message);
    throw error;
  }
}

module.exports = { getLatLngFromAddress };
