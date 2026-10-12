# Sparrow Tasks – Sparrow Web Solutions
Team task manager + client portal + ticket system. Static SPA (GitHub Pages).
Demo mode (default): data in browser localStorage, demo logins shown on login page.

## Connect Firebase
1. console.firebase.google.com → Add project → add a Web app → copy `firebaseConfig`.
2. Build → Authentication → enable **Email/Password** and **Google**; Settings → Authorized domains → add `aitest7503-ui.github.io`.
3. Build → Firestore Database → Create (production mode, region asia-south1) → Rules tab → paste `firestore.rules` → Publish.
4. Paste config into `config.js` (`window.FIREBASE_CONFIG = {...}`) and push.
5. First person to sign in (Team Login) becomes admin. Admin then creates team & client logins from the Team page.

## Credits
UI layout inspired by common work-management apps and open-source boards
(Kanboard – MIT, WeKan – MIT). Ideas only; no third-party code copied. Mascot © Sparrow Web Solutions.
