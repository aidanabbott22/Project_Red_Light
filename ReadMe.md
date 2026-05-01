# 🚦 RedLight App

RedLight is a mobile-first application built for **law enforcement, nurses, and social workers** to access critical guides quickly—both **online and offline**. It’s designed for real-world use where speed, clarity, and reliability matter.

## ✨ Features

* 📚 Access role-specific guides on the go
* 📴 Offline support for low/no connectivity environments
* ⚡ Fast, mobile-optimized performance (Expo)
* 🧭 Simple, distraction-free UI for field use
* 🔐 Admin panel for managing and updating content

## Research
https://docs.expo.dev/
https://docs.aws.amazon.com/ 

## 🛠️ Tech Stack

* ⚛️ Expo (React Native)
* 🟦 TypeScript
* 🌐 Node.js (Admin Panel / Backend)
* 📦 Async Storage / Local storage (offline support)

---

## 📦 Installation (Development)

### Prerequisites

Make sure you have the following installed:

* [Node.js](https://nodejs.org/) (v20+ recommended) - Best recommended to be on nodejs when doing development (https://github.com/coreybutler/nvm-windows/releases) - This link will allow for changing of node version. 
* npm or yarn

## 🚀 Running the App (Client)

```bash
# Install dependencies
npm install

# Start Expo dev server
npx expo start
```

You can then run the app on:

* iOS Simulator
* Android Emulator
* Expo Go (on a physical device)

## 🖥️ Running the Admin Panel

> ⚠️ The admin panel must be running for full functionality (content management, updates, etc.)

```bash
cd react-ts-app

# Install dependencies
npm install

# Start admin server
npm run dev
```

Make sure the mobile app is configured to point to the correct backend/admin API URL.


## ⚙️ Configuration

Create or update your environment/config file:

```json
{
  "apiUrl": "http://localhost:3000",
  "offlineMode": true
}
```

## 🚀 Usage

After launching the app, users can:

* Browse guides based on their role (law enforcement, nurse, social worker)
* Download and access guides offline
* Quickly search for critical information in the field

Admins can:

* Create and update guides
* Manage categories and roles
* Push updates to users


## 🤝 Contributing

Contributions are welcome!

1. Fork the repo
2. Create a branch (`git checkout -b feature/your-feature`)
3. Commit changes
4. Push to your branch
5. Open a Pull Request

## ⚠️ Disclaimer

This app is intended to support professionals with informational guides. It does not replace official training, protocols, or professional judgment.


