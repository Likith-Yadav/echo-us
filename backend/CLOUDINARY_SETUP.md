# Cloudinary Setup Guide

## 📸 What is Cloudinary?
Cloudinary is a cloud service for storing and managing images/videos. It's **FREE** for up to 25GB storage and 25GB bandwidth/month.

---

## 🚀 Setup Steps:

### 1. Create Cloudinary Account
1. Go to: https://cloudinary.com/users/register/free
2. Sign up (takes 2 minutes)
3. Verify your email

### 2. Get Your API Credentials
1. Login to Cloudinary Dashboard
2. You'll see your credentials on the homepage:
   ```
   Cloud Name: your_cloud_name
   API Key: 123456789012345
   API Secret: abcdefghijklmnopqrstuvwxyz123
   ```

### 3. Add to Backend `.env` File
1. Open `backend/.env` file (create if it doesn't exist)
2. Add your Cloudinary credentials:
   ```env
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=123456789012345
   CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwxyz123
   ```

### 4. Restart Backend Server
```bash
cd backend
npm start
```

---

## ✅ Test Media Upload
1. Open your app
2. Go to any chat
3. Click the **+** (attach) button
4. Select an image
5. Image should upload successfully!

---

## 🔐 Security Note:
- **NEVER** commit `.env` file to Git
- `.env` is already in `.gitignore`
- Keep your API Secret private!

---

## 📊 Cloudinary Dashboard
- View uploaded images: https://cloudinary.com/console/media_library
- Monitor usage: https://cloudinary.com/console
- Free tier limits:
  - 25GB storage
  - 25GB bandwidth/month
  - 25 credits/month

