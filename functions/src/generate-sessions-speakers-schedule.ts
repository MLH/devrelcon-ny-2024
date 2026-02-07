// https://github.com/import-js/eslint-plugin-import/issues/1810
// eslint-disable-next-line import/no-unresolved
import { getFirestore } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import { sessionsSpeakersMap } from './schedule-generator/speakers-sessions-map.js';
import { sessionsSpeakersScheduleMap } from './schedule-generator/speakers-sessions-schedule-map.js';
import { isEmpty, pickMainTag, ScheduleMap, SessionMap, snapshotToObject, SpeakerMap } from './utils.js';

const isScheduleEnabled = async (): Promise<boolean> => {
  const doc = await getFirestore().collection('config').doc('schedule').get();

  if (doc.exists) {
    return doc.data().enabled === 'true' || doc.data().enabled === true;
  } else {
    functions.logger.error(
      'Schedule config is not set. Set the `config/schedule.enabled=true` Firestore value.',
    );
    return false;
  }
};

export const sessionsWrite = functions.firestore
  .document('sessions/{sessionId}')
  .onWrite(() => generateAndSaveData());

export const scheduleWrite = functions.firestore
  .document('schedule/{scheduleId}')
  .onWrite(async () => {
    if (await isScheduleEnabled()) {
      return generateAndSaveData();
    }
    return null;
  });

export const speakersWrite = functions.firestore
  .document('speakers/{speakerId}')
  .onWrite(async (change, context) => {
    const changedSpeaker = change.after.exists
      ? { id: context.params.speakerId, ...change.after.data() }
      : null;
    return generateAndSaveData(changedSpeaker);
  });

const fetchData = () => {
  const sessionsPromise = getFirestore().collection('sessions').get();
  const schedulePromise = getFirestore().collection('schedule').orderBy('date', 'desc').get();
  const speakersPromise = getFirestore().collection('speakers').get();

  return Promise.all([sessionsPromise, schedulePromise, speakersPromise]);
};

async function generateAndSaveData(changedSpeaker?) {
  const [sessionsSnapshot, scheduleSnapshot, speakersSnapshot] = await fetchData();

  const sessions = snapshotToObject(sessionsSnapshot);
  const schedule = snapshotToObject(scheduleSnapshot);
  const speakers = snapshotToObject(speakersSnapshot);

  let generatedData: {
    sessions?: {};
    speakers?: {};
    schedule?: {};
  } = {};
  if (!Object.keys(sessions).length) {
    generatedData.speakers = { ...speakers };
  } else if (!(await isScheduleEnabled()) || !Object.keys(schedule).length) {
    generatedData = sessionsSpeakersMap(sessions, speakers);
  } else {
    generatedData = sessionsSpeakersScheduleMap(sessions, speakers, schedule);
  }

  // If changed speaker does not have assigned session(s) yet
  if (changedSpeaker && !generatedData.speakers[changedSpeaker.id]) {
    generatedData.speakers[changedSpeaker.id] = changedSpeaker;
  }

  // Include all speakers (active and inactive) in generated output
  // This ensures inactive/past speakers are available to the frontend
  for (const [speakerId, speaker] of Object.entries(speakers)) {
    if (!generatedData.speakers[speakerId]) {
      generatedData.speakers[speakerId] = { ...(speaker as object), id: speakerId };
    }
  }

  // Include all sessions (including past years not on current schedule)
  // Enrich with resolved speaker objects so session pages render correctly
  for (const [sessionId, session] of Object.entries(sessions)) {
    if (!generatedData.sessions[sessionId]) {
      const raw = session as { speakers?: string[]; tags?: string[]; [key: string]: unknown };
      const resolvedSpeakers = (raw.speakers || []).map((speakerId: string) => ({
        id: speakerId,
        ...(speakers[speakerId] || {}),
        sessions: null,
      }));
      generatedData.sessions[sessionId] = {
        ...raw,
        id: sessionId,
        mainTag: pickMainTag(raw.tags),
        speakers: resolvedSpeakers,
      };
    }
  }

  await saveGeneratedData(generatedData.sessions, 'generatedSessions');
  await saveGeneratedData(generatedData.speakers, 'generatedSpeakers');
  await saveGeneratedData(generatedData.schedule, 'generatedSchedule');
}

async function saveGeneratedData(data: SessionMap | SpeakerMap | ScheduleMap, collectionName: string) {
  if (isEmpty(data)) {
    functions.logger.error(
      `Attempting to write empty data to Firestore collection: "${collectionName}".`,
    );
    return;
  }

  const keys = Object.keys(data);
  const batchSize = 500;
  for (let i = 0; i < keys.length; i += batchSize) {
    const batch = getFirestore().batch();
    const chunk = keys.slice(i, i + batchSize);
    for (const key of chunk) {
      batch.set(getFirestore().collection(collectionName).doc(key), data[key]);
    }
    await batch.commit();
  }
}
