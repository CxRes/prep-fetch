/*!
 *  Copyright (c) 2024, Rahul Gupta and PREP Fetch contributors.
 *
 *  This Source Code Form is subject to the terms of the Mozilla Public
 *  License, v. 2.0. If a copy of the MPL was not distributed with this
 *  file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 *  SPDX-License-Identifier: MPL-2.0
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";

import prepFetch from "~/prep-fetch.js";

describe("PREP Fetch", () => {
  describe("should fail", () => {
    it("when status is not legal", () => {
      const response = new Response("", {
        status: 403,
      });
      expect(() => prepFetch(response)).toThrowError(
        "Response Code does not allow Notifications",
      );
    });

    it("when there is no events header", () => {
      const response = new Response("", {
        status: 200,
        headers: [["Content-Type", 'multipart/mixed; boundary="boundary"']],
      });
      expect(() => prepFetch(response)).toThrowError("No Events Header");
    });

    it("when events header is not parsed as a Dictionary", () => {
      const response = new Response("", {
        status: 200,
        headers: [
          ["Events", "foo;"],
          ["Content-Type", 'multipart/mixed; boundary="boundary"'],
        ],
      });
      expect(() => prepFetch(response)).toThrowError(
        "Could NOT parse the Events header field",
      );
    });

    it("when events protocol is not PREP", () => {
      const response = new Response("", {
        status: 200,
        headers: [
          ["Events", 'protocol="foo", status=200'],
          ["Content-Type", 'multipart/mixed; boundary="boundary"'],
        ],
      });
      expect(() => prepFetch(response)).toThrowError("Protocol not prep");
    });

    it("when events status is not legal", () => {
      const response = new Response("", {
        status: 200,
        headers: [
          ["Events", 'protocol="prep", status=403'],
          ["Content-Type", 'multipart/mixed; boundary="boundary"'],
        ],
      });
      expect(() => prepFetch(response)).toThrowError("Notifications not OK!");
    });

    it("when media type is not 'multipart'", () => {
      const response = new Response("", {
        status: 200,
        headers: [
          ["Events", 'protocol="prep", status=200'],
          ["Content-Type", "text/plain"],
        ],
      });
      expect(() => prepFetch(response)).toThrowError(/Cannot parse response/);
    });

    it("when a boundary is not defined in the Content-Type header", () => {
      const response = new Response("", {
        status: 200,
        headers: [
          ["Events", 'protocol="prep", status=200'],
          ["Content-Type", "multipart/mixed"],
        ],
      });
      expect(() => prepFetch(response)).toThrowError(/Cannot parse response/);
    });

    it("when subtype is not 'mixed'", () => {
      const response = new Response("", {
        status: 200,
        headers: [
          ["Events", 'protocol="prep", status=200'],
          ["Content-Type", 'multipart/foo; boundary="boundary"'],
        ],
      });
      expect(() => prepFetch(response)).toThrowError(
        "Invalid multipart response subtype for notifications response",
      );
    });
  });

  describe("should fail to serve representation", () => {
    const response = new Response(new Uint8Array([]), {
      status: 200,
      headers: [
        ["Events", 'protocol="prep", status=200'],
        ["Content-Type", 'multipart/mixed; boundary="mixed-boundary"'],
      ],
    });
    const prep = prepFetch(response);

    it("when there is no representation", async () => {
      await expect(prep.getRepresentation()).rejects.toThrowError(
        "Empty Representation",
      );
    });
  });

  describe("should serve the representation", () => {
    const file = fs.createReadStream("./test/samples/full-response.txt");

    const stream = ReadableStream.from(file);
    const response = new Response(stream, {
      status: 200,
      headers: [
        ["Events", 'protocol="prep", status=200'],
        ["Content-Type", 'multipart/mixed; boundary="mixed-boundary"'],
      ],
    });
    const prepResponse = prepFetch(response);
    let rep;

    it('should auto-generate "content-type" header in the representation based on type "mixed"', async () => {
      rep = await prepResponse.getRepresentation();
      expect(rep.headers.get("content-type")).toBe("text/plain");
    });

    it("should read the representation body", async () => {
      expect(await rep.text()).toBe(
        "The quick brown fox jumps over the lazy dog.\r\n",
      );
    });
  });

  describe("should fail to find notifications", () => {
    it("when there is no notifications body", async () => {
      const file = fs.createReadStream("./test/samples/no-part-2.txt");

      const stream = ReadableStream.from(file);
      const response = new Response(stream, {
        status: 200,
        headers: [
          ["Events", 'protocol="prep", status=200'],
          ["Content-Type", 'multipart/mixed; boundary="mixed-boundary"'],
        ],
      });
      const prep = prepFetch(response);
      const rep = await prep.getRepresentation();
      await rep.bytes();
      await expect(prep.getNotifications()).rejects.toThrowError(
        "No notifications body",
      );
    });

    it("the notifications body is not multipart", async () => {
      const file = fs.createReadStream(
        "./test/samples/part-2-not-multipart.txt",
      );

      const stream = ReadableStream.from(file);
      const response = new Response(stream, {
        status: 200,
        headers: [
          ["Events", 'protocol="prep", status=200'],
          ["Content-Type", 'multipart/mixed; boundary="mixed-boundary"'],
        ],
      });
      const prep = prepFetch(response);
      const rep = await prep.getRepresentation();
      await rep.bytes();

      await expect(prep.getNotifications()).rejects.toThrowError(
        "Cannot parse notifications as multipart",
      );
    });

    it("when the subtype of the notifications body is not 'digest'", async () => {
      const file = fs.createReadStream("./test/samples/no-notifications.txt");

      const stream = ReadableStream.from(file);
      const response = new Response(stream, {
        status: 200,
        headers: [
          ["Events", 'protocol="prep", status=200'],
          ["Content-Type", 'multipart/mixed; boundary="mixed-boundary"'],
        ],
      });
      const prep = prepFetch(response);
      const rep = await prep.getRepresentation();
      await rep.bytes();

      await expect(prep.getNotifications()).rejects.toThrowError(
        "Invalid multipart subtype for notifications body",
      );
    });
  });

  describe("should serve notifications", () => {
    const file = fs.createReadStream("./test/samples/full-response.txt");

    const stream = ReadableStream.from(file);
    const response = new Response(stream, {
      status: 200,
      headers: [
        ["Events", 'protocol="prep", status=200'],
        ["Content-Type", 'multipart/mixed; boundary="mixed-boundary"'],
      ],
    });
    const prep = prepFetch(response);
    let rep, notesBody, notes, note, message;

    it("should auto generate headers in the first notification", async () => {
      rep = await prep.getRepresentation();
      await rep.bytes();
      notesBody = await prep.getNotifications();

      notes = notesBody.notifications();
      ({ value: note } = await notes.next());
      expect(note.headers.get("content-type")).toBe("message/rfc822");
    });

    it("should output message headers in the first notification", async () => {
      message = await note.message();
      expect(message.headers.get("date")).toBe("Sat, 08 Jun 2024 00:34:39 GMT");
      expect(message.headers.get("method")).toBe("PATCH");
    });

    it("should not output body in the first notification", async () => {
      expect(await message.text()).toBe("");
    });

    it("should output headers in the second notification", async () => {
      ({ value: note } = await notes.next());
      expect(note.headers.get("content-type")).toBe("message/rfc822");
    });

    it("should output message headers in the second notification", async () => {
      message = await note.message();
      expect(message.headers.get("date")).toBe("Sat, 08 Jun 2024 00:34:39 GMT");
      expect(message.headers.get("method")).toBe("DELETE");
    });

    it("should output not output a message body in the second notification", async () => {
      expect(await message.text()).toStrictEqual("");
    });

    it("should output an empty notification", async () => {
      ({ value: note } = await notes.next());
      expect(note.headers.get("content-type")).toBe("message/rfc822");
      message = await note.message();
      expect(await message.text()).toBe("");
    });

    it("should be done with notifications", async () => {
      const { done } = await notes.next();
      expect(done).toBe(true);
    });

    it("should be done with the response", async () => {
      const { done } = await prep.parts().next();
      expect(done).toBe(true);
    });
  });
});
