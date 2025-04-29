const { uploadPhotoToPage, createPost } = require('../services/facebook'); // 📢 correct path!!

/**
 * @param {string} pageAccessToken
 * @param {string} pageId
 * @param {string} imagePath
 * @param {string} message
 * @param {Date} postDate
 */
async function scheduleFacebookPost(pageAccessToken, pageId, imagePath, message, postDate) {
  const photoId = await uploadPhotoToPage(pageAccessToken, pageId, imagePath);

  if (!photoId) {
    throw new Error('Failed to upload photo to Facebook');
  }

  const scheduledTimestamp = Math.floor(postDate.getTime() / 1000);

  const postId = await createPost(
    pageAccessToken,
    pageId,
    message,
    photoId,
    scheduledTimestamp
  );

  return postId;
}

module.exports = {
  scheduleFacebookPost
};
