/*!
 *  Copyright (c) 2024, Rahul Gupta and PREP Fetch contributors.
 *
 *  This Source Code Form is subject to the terms of the Mozilla Public
 *  License, v. 2.0. If a copy of the MPL was not distributed with this
 *  file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 *  SPDX-License-Identifier: MPL-2.0
 */
import { LEGAL_RESPONSE_CODES } from "./constants.js";
import { multipartFetch, parseBody } from "multipart-fetch";
import processEventsHeader from "./events.js";

function extractRepresentationAndNotifications(response) {
  if (!LEGAL_RESPONSE_CODES.includes(response.status)) {
    throw new Error("Response Code does not allow Notifications");
  }

  const events = processEventsHeader(response.headers.get("Events"));

  const multipartResponse = (function tryMultipartFetch() {
    try {
      return multipartFetch(response);
    } catch (error) {
      throw new TypeError("Cannot parse response as multipart", {
        cause: error,
      });
    }
  })();

  if (multipartResponse.subtype !== "mixed") {
    throw new TypeError(
      "Invalid multipart response subtype for notifications response",
    );
  }

  const parts = multipartResponse.parts();

  async function getRepresentation() {
    let { value, done } = await parts.next();
    if (done) {
      throw new Error("Empty Representation");
    }
    return value;
  }

  async function* addMessageMethod(parts) {
    for await (const part of parts()) {
      part.message = async function message() {
        return parseBody(part.body);
      };
      yield part;
    }
  }

  async function getNotifications() {
    let { value, done } = await parts.next();
    if (done) {
      throw new Error("No notifications body");
    }
    const notificationsBody = (function tryMultipartFetchForNotifications() {
      try {
        return multipartFetch(value);
      } catch (error) {
        throw new TypeError("Cannot parse notifications as multipart", {
          cause: error,
        });
      }
    })();
    if (notificationsBody.subtype !== "digest") {
      throw new TypeError("Invalid multipart subtype for notifications body");
    }
    notificationsBody.notifications = function notifications() {
      return addMessageMethod(notificationsBody.parts);
    };
    notificationsBody[Symbol.asyncIterator] = notificationsBody.notifications;
    return notificationsBody;
  }

  return Object.assign(multipartResponse, {
    get events() {
      return Object.freeze(events);
    },
    getRepresentation,
    getNotifications,
  });
}

export default extractRepresentationAndNotifications;
