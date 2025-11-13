# ⚠️ IMPORTANT: Update Your Environment Variables

## 🔴 Issue Found

Your app is still calling the **OLD 10K QT contract** instead of the **NEW 1K QT contract**.

## ✅ Solution

Update your `.env` file (or Vercel environment variables) with the NEW contract address:

```bash
NEXT_PUBLIC_QT_DISTRIBUTOR_ADDRESS=0x6DE14656a37D659ede5A928E371A298F880E194d
```

## 📋 Steps to Fix

### If using `.env` file locally:
1. Open your `.env` file
2. Find `NEXT_PUBLIC_QT_DISTRIBUTOR_ADDRESS`
3. Change it to: `0x6DE14656a37D659ede5A928E371A298F880E194d`
4. Restart your dev server

### If using Vercel:
1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Find `NEXT_PUBLIC_QT_DISTRIBUTOR_ADDRESS`
4. Update it to: `0x6DE14656a37D659ede5A928E371A298F880E194d`
5. Redeploy your app

## 🔍 Verify It's Fixed

After updating, the app should show:
- **1.00K QT** instead of **10.00K QT**
- Claims will use the 1,000 QT contract

## 📝 Contract Addresses

- **OLD Contract (10K QT)**: `0xb8AD9216A88E2f9a24c7e2207dE4e69101031f02` ❌ Don't use
- **NEW Contract (1K QT)**: `0x6DE14656a37D659ede5A928E371A298F880E194d` ✅ Use this

