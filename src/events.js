/*!
 *  Copyright (c) 2024, Rahul Gupta and PREP Fetch contributors.
 *
 *  This Source Code Form is subject to the terms of the Mozilla Public
 *  License, v. 2.0. If a copy of the MPL was not distributed with this
 *  file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 *  SPDX-License-Identifier: MPL-2.0
 */
import { parseDictionary } from "structured-headers";
import { EVENTS_PROTOCOL, LEGAL_EVENTS_RESPONSE_CODES } from "./constants.js";

function processEventsHeader(eventsHeader) {
  if (!eventsHeader) {
    throw new TypeError("No Events Header");
  }

  const events = (() => {
    try {
      return parseDictionary(eventsHeader);
    } catch (parseError) {
      throw new SyntaxError("Could NOT parse the Events header field", {
        cause: parseError,
      });
    }
  })();

  if (events?.get("protocol")?.[0]?.toString() !== EVENTS_PROTOCOL) {
    throw new TypeError(`Protocol not ${EVENTS_PROTOCOL}.`);
  }

  if (
    !LEGAL_EVENTS_RESPONSE_CODES.includes(Number(events?.get("status")?.[0]))
  ) {
    throw new TypeError("Notifications not OK!");
  }

  return events;
}

export default processEventsHeader;
