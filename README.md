# 🧪 Pharmacy Duty Poster Bot

Automated backend service to fetch local pharmacy duty schedules (from PDFs), convert them to images, and schedule Facebook posts for multiple municipalities — all without manual intervention.

Built as part of a professional internship project.

---

## 🛠️ Tech Stack

* **Node.js** (Express)
* **SQLite** (or file-based DB)
* **Facebook Graph API**
* **PDF → PNG conversion** (`pdf-poppler`, `sharp`, or similar)
* **Google Geocoding API** (or OpenStreetMap)
* **JWT-based Authentication**
* **Cron scheduling / retries**
* **REST API for Admin Panel**

---

## 🧹 Features

* 📍 **Geolocation matching**: Each municipality is associated with a specific PDF schedule and message.
* 🖼️ **PDF processing**: Automatically fetches the right PDF, converts the correct page to PNG.
* 🛄 **Facebook automation**: Schedules a post with image and location-specific message.
* 🔁 **Retry logic**: Auto-retries failed Facebook uploads and handles token refresh if needed.
* 🔒 **Secure API**: Admin routes are protected by JWT auth and role-based access.
* ✏️ **Custom admin routes**:

  * `POST /update-message`: update post message per city
  * `POST /force-post`: trigger a post manually
  * `POST /cancel-post`: cancel scheduled post

---

## 🧠 Architecture Overview

```
Municipality DB
     │
     ▼
Match city → PDF + message
     │
     ▼
Download PDF
     │
Convert page to PNG
     │
     ▼
Upload image to Facebook
     │
     ▼
Schedule post with caption + image
```

* 🗕️ Posts are generated X days before duty (via `cron` or a loop).
* 🧾 PDFs are versioned monthly (e.g. `schedule_july_2025.pdf`).
* 🌐 Geolocation is used to auto-match cities to the right schedule.

---

## 🚀 Running the App

1. Clone the repo
2. Add `.env`:

   ```env
   FACEBOOK_APP_ID=xxx
   FACEBOOK_APP_SECRET=xxx
   FACEBOOK_PAGE_TOKEN=xxx
   JWT_SECRET=supersecret
   GOOGLE_GEOCODE_API_KEY=xxx
   ```
3. Install dependencies:

   ```bash
   npm install
   ```
4. Start the server:

   ```bash
   node index.js
   ```

---

## 📋 Example Post

```
📍 City: Leuven
🗓️ Duty Date: July 7th
💊 On-call Pharmacy: Apotheek De Smet
📌 Note: Please bring your ID.

[📸 Image of full PDF schedule attached]
```


