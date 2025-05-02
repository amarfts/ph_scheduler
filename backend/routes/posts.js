const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { v4: uuidv4 } = require('uuid');
const { findPrivateSufficientRadiusAndFetchPdf } = require('../services/fetchPrivatePdf'); 
const { findSufficientRadiusAndFetchPdf } = require('../services/fetchPublicPdf');
const convertPdfToPng = require('../services/convertPdfToPng');
const { uploadPhotoToPage, createPost } = require('../services/facebook');
const { deleteScheduledPostFromFacebook } = require('../services/facebook');
const { getLatLngFromAddress } = require('../services/geocode');
const jwt = require('jsonwebtoken');

const fs = require('fs');
require('dotenv').config(); 

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; 

  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user; 
    next();
  });
}

function authorizeAdmin (req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin privileges required' });
  }
  next();
}

router.post('/generate', authenticateToken, authorizeAdmin, async (req, res) => {
  const { startDate } = req.body;

  if (!startDate) {
    return res.status(400).json({ error: 'startDate is required' });
  }

  let postMessageRow;
  try {
    postMessageRow = await new Promise((resolve, reject) => {
      db.get(`SELECT message FROM postMessages WHERE id = 'default'`, [], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  } catch (error) {
    console.error('❌ Error fetching post message:', error.message);
    return res.status(500).json({ error: 'Failed to fetch post message.' });
  }

  const finalPostMessage = postMessageRow?.message;
  if (!finalPostMessage) {
    return res.status(500).json({ error: 'No post message found.' });
  }

  db.all(`SELECT * FROM pharmacies`, [], async (err, pharmacies) => {
    if (err) return res.status(500).json({ error: 'Database error.' });
    if (!pharmacies || pharmacies.length === 0) return res.status(404).json({ error: 'No pharmacies found.' });

    console.log(`✅ Fetched ${pharmacies.length} pharmacies`);
    const results = [];

    for (const pharmacy of pharmacies) {
      if (!pharmacy?.name) {
        results.push({ pharmacy: 'UNKNOWN', error: 'Invalid pharmacy data' });
        continue;
      }

      try {
        console.log(`🚀 Processing pharmacy: ${pharmacy.name}`);
        const { id: pharmacyId, facebookPageId, postingDay, postingFrequency, apiType } = pharmacy;
        if (!facebookPageId) throw new Error('Missing Facebook Page ID');

        const start = new Date(startDate);
        start.setHours(8, 0, 0, 0);
        const postDate = calculateNextPostDate(start, postingDay);

        const existingPost = await new Promise((resolve, reject) => {
          db.get(
            `SELECT * FROM posts WHERE pharmacyId = ? AND DATE(scheduledDatetime) = DATE(?) AND status != 'cancelled'`,
            [pharmacyId, postDate.toISOString()],
            (err, row) => (err ? reject(err) : resolve(row))
          );
        });

        if (existingPost) {
          results.push({ pharmacy: pharmacy.name, status: 'skipped', reason: 'Already scheduled for this date' });
          continue;
        }

        const maxAdvanceDays = postingFrequency === 'biweekly' ? 13 : 6;
        const endDate = new Date(start);
        endDate.setDate(start.getDate() + maxAdvanceDays);

        if (postDate > endDate) {
          results.push({ pharmacy: pharmacy.name, status: 'skipped', reason: 'Next post date beyond allowed range' });
          continue;
        }

        let { latitude, longitude } = pharmacy;
        if (!latitude || !longitude) {
          try {
            const coords = await getLatLngFromAddress(pharmacy.address);
            latitude = coords.latitude;
            longitude = coords.longitude;

            db.run(
              `UPDATE pharmacies SET latitude = ?, longitude = ? WHERE id = ?`,
              [latitude, longitude, pharmacyId],
              (err) => {
                if (err) console.warn(`⚠️ Failed to update lat/lng for ${pharmacy.name}`);
              }
            );
          } catch (geoErr) {
            console.error(`❌ Skipping ${pharmacy.name}: geocoding failed`);
            results.push({ pharmacy: pharmacy.name, error: 'Failed to geocode address' });
            continue;
          }
        }


        let pdfPath;
        const bearerToken = process.env.PUBLIC_API_TOKEN;
        if (!bearerToken) throw new Error('Missing PUBLIC_API_TOKEN');

        if (apiType === 'private') {
          console.log("🔒 Fetching with custom logic (2x/day & night) from Pharmagarde...");
          pdfPath = await findPrivateSufficientRadiusAndFetchPdf(
            1, latitude, longitude, pharmacy.address, start, endDate, bearerToken
          );
        } else {
          console.log("🌍 Fetching from Publigarde (classic radius search)...");
          pdfPath = await findSufficientRadiusAndFetchPdf(
            1, latitude, longitude, pharmacy.address, start, endDate, bearerToken
          );
        }

        const pngPaths = await convertPdfToPng(pdfPath);
        if (!pngPaths || pngPaths.length === 0) throw new Error('No PNG images generated from PDF');

        const selectedImagePath = pngPaths[0];
        const photoId = await uploadPhotoToPage(pharmacy.pageAccessToken, facebookPageId, selectedImagePath);
        const postId = await createPost(pharmacy.pageAccessToken, facebookPageId, finalPostMessage, photoId, Math.floor(postDate.getTime() / 1000));

        const postDbId = uuidv4();
        db.run(
          `INSERT INTO posts (id, pharmacyId, imageUrl, scheduledDatetime, status, fbPostId) VALUES (?, ?, ?, ?, ?, ?)`,
          [postDbId, pharmacyId, selectedImagePath, postDate.toISOString(), 'scheduled', postId],
          (err) => {
            if (err) console.error('❌ Failed to save post in DB:', err.message);
          }
        );

        results.push({ pharmacy: pharmacy.name, status: 'scheduled', postId });

      } catch (error) {
        const fbError = error.response?.data?.error?.message || error.response?.data || error.message;
        console.error(`❌ Error for ${pharmacy?.name || 'UNKNOWN'}:`, fbError);
        results.push({ pharmacy: pharmacy?.name || 'UNKNOWN', error: fbError });
      }
    }

    res.json({ success: true, results });
  });
});



function calculateNextPostDate(startDate, postingDay) {
  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const now = new Date();
  const start = new Date(startDate);
  const todayIndex = start.getDay();
  const targetIndex = daysOfWeek.indexOf(postingDay.toLowerCase());

  let diff = targetIndex - todayIndex;
  if (diff < 0) diff += 7;

  const postDate = new Date(start);
  postDate.setDate(start.getDate() + diff);
  postDate.setHours(6, 0, 0, 0); 

  if (postDate <= now) {
    postDate.setDate(postDate.getDate() + 7);
  }

  return postDate;
}


router.get('/', authenticateToken, authorizeAdmin, (req, res) => {
  const query = `
    SELECT posts.id, posts.pharmacyId, posts.imageUrl, posts.scheduledDatetime, posts.status, pharmacies.name as pharmacyName
    FROM posts
    LEFT JOIN pharmacies ON posts.pharmacyId = pharmacies.id
    ORDER BY posts.scheduledDatetime ASC
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('❌ Error fetching posts:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

router.post('/force-post/:id', authenticateToken, authorizeAdmin, async (req, res) => {
  const postId = req.params.id;

  try {
    db.get(`
      SELECT posts.*, pharmacies.facebookPageId, pharmacies.pageAccessToken
      FROM posts
      JOIN pharmacies ON posts.pharmacyId = pharmacies.id
      WHERE posts.id = ?
    `, [postId], async (err, post) => {
      if (err) {
        console.error('❌ Error finding post:', err.message);
        return res.status(500).json({ error: 'Erreur interne.' });
      }

      if (!post) {
        return res.status(404).json({ error: 'Post non trouvé.' });
      }

      const imagePath = post.imageUrl;
      const pageId = post.facebookPageId;
      const accessToken = post.pageAccessToken;

      if (!fs.existsSync(imagePath)) {
        console.error('❌ Image introuvable:', imagePath);
        return res.status(400).json({ error: "Image introuvable." });
      }

      const postMessageRow = await new Promise((resolve, reject) => {
        db.get(`SELECT message FROM postMessages WHERE id = 'default'`, [], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (!postMessageRow) {
        console.error('❌ No post message found in database.');
        return res.status(500).json({ error: 'No post message found.' });
      }

      const finalPostMessage = postMessageRow.message;

      const photoId = await uploadPhotoToPage(accessToken, pageId, imagePath);

      await createPost(accessToken, pageId, finalPostMessage, photoId);

      db.run(`UPDATE posts SET status = ? WHERE id = ?`, ['published', postId], (updateErr) => {
        if (updateErr) {
          console.error('❌ Failed to update post status:', updateErr.message);
        } else {
          console.log(`✅ Post ${postId} marked as published.`);
        }
      });

      res.json({ success: true, message: '✅ Publication immédiate effectuée.' });
    });

  } catch (error) {
    console.error('❌ Force publish error:', error.message);
    res.status(500).json({ error: 'Erreur interne.' });
  }
});

router.delete('/cancel/:postId', authenticateToken, authorizeAdmin, async (req, res) => {
  const postId = req.params.postId;

  db.get(`SELECT * FROM posts WHERE id = ?`, [postId], async (err, post) => {
    if (err) {
      console.error('❌ Database error:', err.message);
      return res.status(500).json({ error: 'Database error.' });
    }

    if (!post) {
      console.error('❌ Post not found.');
      return res.status(404).json({ error: 'Post not found.' });
    }

    if (post.status !== 'scheduled') {
      console.warn('⚠️ Post is not scheduled, cannot cancel.');
      return res.status(400).json({ error: 'Only scheduled posts can be cancelled.' });
    }

    try {
      if (post.fbPostId) {
        console.log(`🗑️ Trying to delete Facebook post with ID: ${post.fbPostId}`);

        db.get(`SELECT pageAccessToken FROM pharmacies WHERE id = ?`, [post.pharmacyId], async (err2, pharmacy) => {
          if (err2 || !pharmacy) {
            console.error('❌ Error fetching pharmacy access token:', err2?.message);
            return res.status(500).json({ error: 'Failed to fetch pharmacy access token.' });
          }

          try {
            await deleteScheduledPostFromFacebook(post.fbPostId, pharmacy.pageAccessToken);

            console.log(`✅ Facebook post ${post.fbPostId} deleted.`);

            db.run(`UPDATE posts SET status = 'cancelled' WHERE id = ?`, [postId], (err3) => {
              if (err3) {
                console.error('❌ Failed to update post status:', err3.message);
                return res.status(500).json({ error: 'Failed to update post status.' });
              }

              console.log(`✅ Post ${postId} cancelled locally.`);
              res.json({ success: true });
            });

          } catch (deleteError) {
            console.error('❌ Failed to delete Facebook post:', deleteError.message);
            return res.status(500).json({ error: 'Failed to delete Facebook post.' });
          }
        });

      } else {
        console.warn('⚠️ No fbPostId available. Marking as cancelled locally.');
        
        db.run(`UPDATE posts SET status = 'cancelled' WHERE id = ?`, [postId], (err4) => {
          if (err4) {
            console.error('❌ Failed to update post status:', err4.message);
            return res.status(500).json({ error: 'Failed to update post status.' });
          }

          console.log(`✅ Post ${postId} cancelled locally.`);
          res.json({ success: true });
        });
      }

    } catch (error) {
      console.error('❌ General error cancelling post:', error.message);
      res.status(500).json({ error: 'Error cancelling post.' });
    }
  });
});


router.post('/update-post-message', authenticateToken, authorizeAdmin, (req, res) => {
  const { newMessage } = req.body;

  if (!newMessage || newMessage.trim() === '') {
    return res.status(400).json({ error: 'newMessage is required.' });
  }

  db.run(
    `UPDATE postMessages SET message = ? WHERE id = 'default'`,
    [newMessage],
    function (err) {
      if (err) {
        console.error('❌ Failed to update post message:', err.message);
        return res.status(500).json({ error: 'Failed to update post message.' });
      }

      if (this.changes === 0) {
        db.run(
          `INSERT INTO postMessages (id, message) VALUES ('default', ?)`,
          [newMessage],
          (insertErr) => {
            if (insertErr) {
              console.error('❌ Failed to insert new post message:', insertErr.message);
              return res.status(500).json({ error: 'Failed to insert new post message.' });
            }
            console.log('✅ Post message inserted.');
            res.json({ success: true, action: 'inserted' });
          }
        );
      } else {
        console.log('✅ Post message updated.');
        res.json({ success: true, action: 'updated' });
      }
    }
  );
});

router.get('/get-post-message', authenticateToken, authorizeAdmin, (req, res) => {
  db.get(`SELECT message FROM postMessages WHERE id = 'default'`, [], (err, row) => {
    if (err) {
      console.error('❌ Error fetching post message:', err.message);
      return res.status(500).json({ error: 'Failed to fetch post message.' });
    }

    if (!row) {
      console.error('❌ No post message found in database.');
      return res.status(404).json({ error: 'No post message found.' });
    }

    res.json({ message: row.message });
  });
});


router.delete('/delete-all', authenticateToken, authorizeAdmin, (req, res) => {
  const query = `DELETE FROM posts`;

  db.run(query, [], function (err) {
    if (err) {
      console.error('❌ Error deleting all posts:', err.message);
      return res.status(500).json({ error: 'Failed to delete all posts.' });
    }
    console.log(`✅ All posts deleted from database.`);
    res.json({ success: true, message: 'Tous les posts ont été supprimés.' });
  });
});


module.exports = router;