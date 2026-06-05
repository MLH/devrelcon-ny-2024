// https://github.com/import-js/eslint-plugin-import/issues/1810

import { applicationDefault, cert, initializeApp, ServiceAccount } from 'firebase-admin/app';
// https://github.com/import-js/eslint-plugin-import/issues/1810

import { getFirestore } from 'firebase-admin/firestore';
import serviceAccount from '../serviceAccount.json';

// Prefer a real service account key; fall back to Application Default
// Credentials (`gcloud auth application-default login`) when
// serviceAccount.json is the empty `{}` stub used by CI.
const hasKey = 'private_key' in (serviceAccount as Record<string, unknown>);
const credential = hasKey ? cert(serviceAccount as ServiceAccount) : applicationDefault();
initializeApp({ credential, projectId: 'devrelcon-ny-2024' });
const firestore = getFirestore();

export { firestore };
