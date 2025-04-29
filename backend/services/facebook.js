const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');

async function uploadPhotoToPage(pageAccessToken, pageId, imagePath) {
  const form = new FormData();
  form.append('access_token', pageAccessToken);
  form.append('published', 'false');
  form.append('source', fs.createReadStream(imagePath));

  const res = await axios.post(
    `https://graph.facebook.com/v19.0/${pageId}/photos`,
    form,
    { headers: form.getHeaders() }
  );

  if (!res.data || !res.data.id) {
    console.error("❌ Facebook upload error:", res.data || res);
    throw new Error('Failed to upload photo to Facebook');
  }

  console.log("🖼️ Uploaded photo to Facebook:", res.data.id);
  return res.data.id;
}


async function createPost(pageAccessToken, pageId, message, photoId, scheduledPublishTime = null) {
  const body = {
    access_token: pageAccessToken,
    message,
    attached_media: JSON.stringify([{ media_fbid: photoId }]),
  };

  if (scheduledPublishTime) {
    body.published = false;
    body.scheduled_publish_time = scheduledPublishTime;
  }

  const res = await axios.post(
    `https://graph.facebook.com/v19.0/${pageId}/feed`,
    body
  );

  console.log("📬 Created Facebook post:", res.data.id);
  return res.data.id;
}

async function deleteScheduledPostFromFacebook(postFbId, pageAccessToken) {
  try {
    const res = await axios.delete(`https://graph.facebook.com/v19.0/${postFbId}`, {
      params: {
        access_token: pageAccessToken
      }
    });

    console.log(`🗑️ Facebook post ${postFbId} deleted successfully`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to delete post ${postFbId}:`, error.response?.data || error.message);
    throw new Error('Failed to delete post from Facebook.');
  }
}

module.exports = {
  uploadPhotoToPage,
  createPost,
  deleteScheduledPostFromFacebook
};
