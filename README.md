# **3am Discord Bot**

The **3am Discord Bot** is a powerful, modular, and fully customizable bot designed to enhance server management, encourage member engagement, and maintain a safe and interactive environment for your community.

---

## ⚙️ Features Overview

### 1. **Custom Welcome Messages**
- Sends personalized messages to new members in a designated welcome channel.
- Creates a warm and inclusive atmosphere from the start.

### 2. **Auto Role Assignment**
- Automatically gives a default role when members join.
- Helps with onboarding and basic permissions setup.

### 3. **Invite Tracker**
- Tracks which invite code was used by new members.
- Enables invite leaderboard systems or referral programs.

### 4. **Ticketing System**
- Allows users to create and manage private support tickets.
- Great for handling mod support, server issues, or general inquiries.

### 5. **Private Voice Rooms**
- Lets members generate their own private voice channels.
- Temporary rooms auto-delete after inactivity.

### 6. **Server Member Count**
- Updates a channel/message with the server's live member count.
- Keeps community growth visible.

### 7. **Activity-Based Role System**
- Dynamically rewards users with roles as they become more active.
- Encourages chat participation and loyalty.

### 8. **Reaction Roles**
- Members can self-assign roles by reacting to specific messages.
- Ideal for opt-in pings, access to channels, or interest groups.

---

## 🛡️ New Moderation Features

### 9. **Image Moderation**
- Automatically scans image and GIF attachments using the Sightengine API.
- Detects and removes content flagged as:
  - NSFW / Nudity
  - Weapons
  - Alcohol / Drugs

### 10. **Mod-Log Channel**
- All deleted or flagged images are logged to a `#mod-log` channel.
- Includes user ID, reason, and original attachment URL.

### 11. **Strike System (Escalation)**
- Offenders are given **strikes** for flagged content.
- Escalation logic:
  - 1 Strike: Warning (DM)
  - 2 Strikes: 10-minute timeout
  - 3 Strikes: Kick
  - 4+ Strikes: Permanent ban
- Strikes are tracked in `data/strikes.json`.

### 12. **Flagged User Leaderboard**
- Slash command: `/flagged-leaderboard`
- Shows top users with the most moderation strikes.
- Great for transparency and spotting repeat offenders.

---