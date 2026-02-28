/**
 * Unit tests for the offline vote queue (IndexedDB).
 *
 * Since Jest runs in Node.js without IndexedDB, we test the
 * data structures and validation logic that the queue relies on.
 */

describe("Offline Queue — Data Structure", () => {
  interface QueuedVote {
    id: string;
    proof: unknown;
    publicInputs: string[];
    timestamp: number;
    submitted: boolean;
  }

  function createQueuedVote(
    proof: unknown,
    publicInputs: string[]
  ): QueuedVote {
    return {
      id: crypto.randomUUID(),
      proof,
      publicInputs,
      timestamp: Date.now(),
      submitted: false,
    };
  }

  it("should create a valid queued vote entry", () => {
    const mockProof = {
      a: ["0x1", "0x2"],
      b: [["0x3", "0x4"], ["0x5", "0x6"]],
      c: ["0x7", "0x8"],
    };
    const publicInputs = ["12345", "67890", "0", "4"];

    const entry = createQueuedVote(mockProof, publicInputs);

    expect(entry.id).toBeDefined();
    expect(entry.id.length).toBe(36); // UUID v4 format
    expect(entry.proof).toEqual(mockProof);
    expect(entry.publicInputs).toEqual(publicInputs);
    expect(entry.submitted).toBe(false);
    expect(entry.timestamp).toBeGreaterThan(0);
  });

  it("should generate unique IDs for each entry", () => {
    const entry1 = createQueuedVote({}, []);
    const entry2 = createQueuedVote({}, []);

    expect(entry1.id).not.toBe(entry2.id);
  });

  it("should filter pending (unsubmitted) votes", () => {
    const votes: QueuedVote[] = [
      { id: "1", proof: {}, publicInputs: [], timestamp: 1000, submitted: false },
      { id: "2", proof: {}, publicInputs: [], timestamp: 2000, submitted: true },
      { id: "3", proof: {}, publicInputs: [], timestamp: 3000, submitted: false },
    ];

    const pending = votes.filter((v) => !v.submitted);
    expect(pending.length).toBe(2);
    expect(pending.map((v) => v.id)).toEqual(["1", "3"]);
  });

  it("should mark a vote as submitted", () => {
    const vote: QueuedVote = {
      id: "test-1",
      proof: { a: "proof" },
      publicInputs: ["123"],
      timestamp: Date.now(),
      submitted: false,
    };

    // Simulate marking as submitted
    const updated = { ...vote, submitted: true };
    expect(updated.submitted).toBe(true);
    expect(updated.proof).toEqual(vote.proof);
    expect(updated.publicInputs).toEqual(vote.publicInputs);
  });

  it("should maintain proof integrity when stored and retrieved", () => {
    const mockProof = {
      a: ["0x1234", "0x5678"],
      b: [
        ["0x9abc", "0xdef0"],
        ["0x1111", "0x2222"],
      ],
      c: ["0x3333", "0x4444"],
    };
    const publicInputs = [
      "9876543210",
      "1234567890",
      "2",
      "4",
    ];

    const entry = createQueuedVote(mockProof, publicInputs);

    // Simulate JSON serialization (as would happen in IndexedDB)
    const serialized = JSON.stringify(entry);
    const deserialized = JSON.parse(serialized) as QueuedVote;

    expect(deserialized.proof).toEqual(mockProof);
    expect(deserialized.publicInputs).toEqual(publicInputs);
    expect(deserialized.id).toBe(entry.id);
    expect(deserialized.submitted).toBe(false);
  });

  it("should clear submitted votes correctly", () => {
    const votes: QueuedVote[] = [
      { id: "1", proof: {}, publicInputs: [], timestamp: 1000, submitted: true },
      { id: "2", proof: {}, publicInputs: [], timestamp: 2000, submitted: false },
      { id: "3", proof: {}, publicInputs: [], timestamp: 3000, submitted: true },
    ];

    const remaining = votes.filter((v) => !v.submitted);
    expect(remaining.length).toBe(1);
    expect(remaining[0].id).toBe("2");
  });
});

describe("Offline Queue — Constants", () => {
  it("should have correct DB and store names", async () => {
    const { OFFLINE_DB_NAME, OFFLINE_STORE_NAME } = await import(
      "@/lib/utils/constants"
    );

    expect(OFFLINE_DB_NAME).toBe("zk-vote-offline");
    expect(OFFLINE_STORE_NAME).toBe("queued-votes");
  });
});
