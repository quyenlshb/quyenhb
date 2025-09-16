# My JP App - Final

This is a ready-to-deploy personal Japanese study web app (React + Vite + Tailwind).
It includes:
- Offline-first behavior (localStorage) and Firebase sync (Auth + Firestore).
- Multiple-choice quiz with timer, "Chưa biết" button, per-word notes.
- Import vocab by paste (Kanji <tab/space> Kana <tab/space> Meaning).
- Settings (timer, per-session count, daily target), streak calculation.
- Mobile-first UI and polished answer cards.

## Quick start (locally)
1. Unzip the project and open the folder in GitHub Desktop or your terminal.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file if you want to override Firebase config (the project includes firebase.js with config).
4. Run dev server:
   ```bash
   npm run dev
   ```
5. Open the local URL (usually http://localhost:5173).

## Deploy to Vercel
1. Push this repository to GitHub.
2. In Vercel, create a new project and import from the GitHub repo.
3. Settings: Framework: Vite; Build command: `npm run build`; Output directory: `dist`.
4. Deploy — Vercel will build and host the app.

## Notes about Firebase
- The project includes `src/firebase.js` with your provided config. That file is safe to include for client-side usage.
- If you prefer secure config management, remove `src/firebase.js` and use environment variables in Vercel.

## Troubleshooting
- If vocab added on PC doesn't appear on mobile, make sure you are logged in with the same Firebase account and the app is online to sync.
- Check browser console for errors if something doesn't work.

-- End of README
