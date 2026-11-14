import { Meeting } from '../schemas.mjs';

/**
 * Calculates start and end timestamps in IST (UTC+5:30) for a given meeting.
 */
export function getMeetingTimeBounds(meeting) {
  if (!meeting || !meeting.meeting_date) return null;

  const d = new Date(meeting.meeting_date);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth();
  const day = d.getUTCDate();

  let hours = 7;
  let minutes = 0;
  if (meeting.meeting_time) {
    const timeStr = String(meeting.meeting_time).trim();
    const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (match) {
      hours = parseInt(match[1], 10);
      minutes = parseInt(match[2], 10);
      const meridiem = match[3];
      if (meridiem) {
        if (meridiem.toUpperCase() === 'PM' && hours < 12) hours += 12;
        if (meridiem.toUpperCase() === 'AM' && hours === 12) hours = 0;
      }
    }
  }

  // India Standard Time is UTC + 5.5 hours.
  // Converting IST meeting time to UTC timestamp:
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const meetingStartUtcMs = Date.UTC(year, month, day, hours, minutes) - istOffsetMs;
  const durationMins = Number(meeting.duration) > 0 ? Number(meeting.duration) : 180;
  const meetingEndUtcMs = meetingStartUtcMs + (durationMins * 60 * 1000);

  return {
    startTime: new Date(meetingStartUtcMs),
    endTime: new Date(meetingEndUtcMs)
  };
}

/**
 * Automatically evaluates and updates all active meetings (upcoming or inprogress)
 * whose date and duration have passed to 'completed'.
 * Optionally filters by chapterId if provided.
 */
export async function autoUpdateMeetingStatuses(chapterId = null) {
  try {
    const filter = {
      meeting_status: { $in: ['upcoming', 'inprogress'] }
    };
    if (chapterId) {
      filter.chapter_id = chapterId;
    }

    const activeMeetings = await Meeting.find(filter).lean();
    if (!activeMeetings || activeMeetings.length === 0) {
      return { completedCount: 0, inProgressCount: 0 };
    }

    const now = new Date();
    const toCompleteIds = [];
    const toInProgressIds = [];

    for (const m of activeMeetings) {
      const bounds = getMeetingTimeBounds(m);
      if (!bounds) continue;

      if (now >= bounds.endTime) {
        toCompleteIds.push(m._id);
      } else if (now >= bounds.startTime && now < bounds.endTime && m.meeting_status !== 'inprogress') {
        toInProgressIds.push(m._id);
      }
    }

    const updates = [];
    if (toCompleteIds.length > 0) {
      updates.push(
        Meeting.updateMany(
          { _id: { $in: toCompleteIds } },
          { $set: { meeting_status: 'completed' } }
        )
      );
    }
    if (toInProgressIds.length > 0) {
      updates.push(
        Meeting.updateMany(
          { _id: { $in: toInProgressIds } },
          { $set: { meeting_status: 'inprogress' } }
        )
      );
    }

    if (updates.length > 0) {
      await Promise.all(updates);
    }

    return {
      completedCount: toCompleteIds.length,
      inProgressCount: toInProgressIds.length
    };
  } catch (err) {
    console.error('Error in autoUpdateMeetingStatuses:', err);
    return { error: err.message };
  }
}
